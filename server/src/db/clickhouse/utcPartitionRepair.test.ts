import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  engines: {} as Record<string, string>,
  misplaced: {} as Record<string, number>,
  counts: {} as Record<string, number>,
  runningInserts: 0,
  queuedInserts: 0 as number | undefined,
  recentInserts: 0 as number | undefined,
}));

const mocks = vi.hoisted(() => ({ exec: vi.fn(), insert: vi.fn(), query: vi.fn() }));

vi.mock("./client.js", () => ({
  clickhouse: { exec: mocks.exec, insert: mocks.insert, query: mocks.query },
  clickhouseQuery: {},
  CLICKHOUSE_REQUEST_TIMEOUT_MS: 1000,
}));

vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { resetServerTimezoneCache } from "./initUtils.js";
import { UTC_TIME_TABLES } from "./timeColumns.js";
import { parseArgs, repairTable, runRepair, type RepairOptions } from "./utcPartitionRepair.js";

const json = (rows: unknown[]) => ({ json: async () => rows });

function executed() {
  return mocks.exec.mock.calls.map(([args]) => (args.query as string).replace(/\s+/g, " ").trim());
}

function options(overrides: Partial<RepairOptions> = {}): RepairOptions {
  return { apply: true, tables: ["events"], backendStopped: true, dropBackups: false, ...overrides };
}

describe("utcPartitionRepair", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetServerTimezoneCache();
    state.engines = { events: "MergeTree" };
    state.misplaced = { events: 3 };
    state.counts = { events: 10, events_utc_repair: 10 };
    state.runningInserts = 0;
    state.queuedInserts = 0;
    state.recentInserts = undefined;
    mocks.exec.mockResolvedValue(undefined);
    mocks.query.mockImplementation(
      async ({ query, query_params }: { query: string; query_params?: Record<string, string> }) => {
        if (query.includes("timezone()")) return json([{ timezone: "Europe/Berlin" }]);
        if (query.includes("FROM system.tables")) {
          const engine = state.engines[query_params?.table ?? ""];
          return json(engine ? [{ engine }] : []);
        }
        if (query.includes("AS misplaced")) {
          const table = /FROM (\w+) WHERE/.exec(query)?.[1] ?? "";
          return json([{ misplaced: state.misplaced[table] ?? 0 }]);
        }
        if (query.includes("system.processes")) return json([{ n: state.runningInserts }]);
        if (query.includes("system.asynchronous_inserts")) {
          if (state.queuedInserts === undefined) throw new Error("no such table");
          return json([{ n: state.queuedInserts }]);
        }
        if (query.includes("system.query_log")) {
          if (state.recentInserts === undefined) throw new Error("query_log removed");
          return json([{ n: state.recentInserts }]);
        }
        const count = /SELECT count\(\) AS n FROM (\w+)( FINAL)?/.exec(query);
        if (count) return json([{ n: state.counts[count[1] + (count[2] ?? "")] ?? 0 }]);
        throw new Error(`Unexpected query: ${query}`);
      }
    );
  });

  it("parses arguments and rejects unknown tables", () => {
    expect(parseArgs([])).toEqual({
      apply: false,
      tables: Object.keys(UTC_TIME_TABLES),
      backendStopped: false,
      dropBackups: false,
    });
    expect(parseArgs(["--apply", "--backend-stopped", "--tables", "events, bot_events"])).toMatchObject({
      apply: true,
      backendStopped: true,
      tables: ["events", "bot_events"],
    });
    expect(() => parseArgs(["--tables", "events,nope"])).toThrow(/Unknown table nope/);
    expect(() => parseArgs(["--since", "x"])).toThrow(/Unknown argument/);
  });

  it("only prints the plan on a dry run", async () => {
    const lines: string[] = [];
    expect(await repairTable("events", options({ apply: false, backendStopped: false }), l => lines.push(l))).toBe(
      "planned"
    );
    expect(mocks.exec).not.toHaveBeenCalled();
    expect(lines.join("\n")).toContain("EXCHANGE TABLES events AND events_utc_repair");
  });

  it("copies, validates, swaps and keeps the original as a backup", async () => {
    expect(await repairTable("events", options(), () => {})).toBe("repaired");
    expect(executed()).toEqual([
      "SYSTEM FLUSH ASYNC INSERT QUEUE",
      "CREATE TABLE events_utc_repair AS events",
      "INSERT INTO events_utc_repair SELECT * FROM events",
      "EXCHANGE TABLES events AND events_utc_repair",
      "RENAME TABLE events_utc_repair TO events_utc_repair_backup",
    ]);
  });

  it("requires the operator to attest that the backend is stopped", async () => {
    const lines: string[] = [];
    expect(await repairTable("events", options({ backendStopped: false }), l => lines.push(l))).toBe("refused");
    expect(lines.join("\n")).toContain("--backend-stopped");
    expect(mocks.exec).not.toHaveBeenCalled();
  });

  it("refuses on any evidence of writers, from whichever signal the server offers", async () => {
    state.runningInserts = 1;
    expect(await repairTable("events", options(), () => {})).toBe("refused");
    const processesQuery = mocks.query.mock.calls
      .map(([a]) => a.query as string)
      .find(q => q.includes("system.processes"));
    // Any running INSERT, not just ones naming this table: qualified or
    // multi-line statements would slip past a name match.
    expect(processesQuery).not.toContain("{table:String}");
    state.runningInserts = 0;
    state.queuedInserts = 2;
    expect(await repairTable("events", options(), () => {})).toBe("refused");
    state.queuedInserts = undefined;
    state.recentInserts = 5;
    expect(await repairTable("events", options(), () => {})).toBe("refused");
    expect(executed().filter(q => !q.startsWith("SYSTEM FLUSH"))).toEqual([]);
    state.recentInserts = undefined;
    expect(await repairTable("events", options(), () => {})).toBe("repaired");
  });

  it("never drops a copy left over from an interrupted run, even when the live table looks clean", async () => {
    state.engines = { events: "MergeTree", events_utc_repair: "MergeTree" };
    // A crash between EXCHANGE and RENAME leaves the repaired copy live and
    // the original under the copy name.
    state.misplaced = { events: 0 };
    const lines: string[] = [];
    expect(await repairTable("events", options(), l => lines.push(l))).toBe("refused");
    expect(lines.join("\n")).toContain("RENAME TABLE events_utc_repair TO events_utc_repair_backup");
    expect(lines.join("\n")).not.toContain("nothing to do");
    expect(mocks.exec).not.toHaveBeenCalled();
    expect(await repairTable("events", options({ apply: false }), () => {})).toBe("refused");
  });

  it("refuses to overwrite an earlier backup unless asked to drop it", async () => {
    state.engines = { events: "MergeTree", events_utc_repair_backup: "MergeTree" };
    expect(await repairTable("events", options(), () => {})).toBe("refused");
    expect(mocks.exec).not.toHaveBeenCalled();
    expect(await repairTable("events", options({ dropBackups: true }), () => {})).toBe("repaired");
    expect(executed()[0]).toBe("DROP TABLE events_utc_repair_backup");
  });

  it("does not swap in a copy whose row count differs", async () => {
    state.counts = { events: 10, events_utc_repair: 9 };
    expect(await repairTable("events", options(), () => {})).toBe("refused");
    expect(executed().some(query => query.startsWith("EXCHANGE"))).toBe(false);
  });

  it("compares folding engines after FINAL so merges in the copy do not fail validation", async () => {
    state.engines = { sessions_mv_target: "AggregatingMergeTree" };
    state.misplaced = { sessions_mv_target: 1 };
    state.counts = {
      sessions_mv_target: 12,
      "sessions_mv_target FINAL": 7,
      sessions_mv_target_utc_repair: 9,
      "sessions_mv_target_utc_repair FINAL": 7,
    };
    expect(await repairTable("sessions_mv_target", options({ tables: ["sessions_mv_target"] }), () => {})).toBe(
      "repaired"
    );
  });

  it("leaves absent tables, clean tables, and tables a refreshable view regenerates alone", async () => {
    state.engines = { events: "MergeTree", session_hourly_mv_target: "MergeTree" };
    state.misplaced = { events: 0, session_hourly_mv_target: 5 };
    expect(await repairTable("events", options(), () => {})).toBe("skipped");
    expect(await repairTable("session_hourly_mv_target", options(), () => {})).toBe("skipped");
    expect(await repairTable("bot_events", options(), () => {})).toBe("skipped");
    expect(mocks.exec).not.toHaveBeenCalled();
  });

  it("runRepair reports what it did per table", async () => {
    state.engines = { events: "MergeTree", bot_events: "MergeTree" };
    state.misplaced = { events: 3, bot_events: 0 };
    const outcomes = await runRepair(["--apply", "--backend-stopped", "--tables", "events,bot_events"], () => {});
    expect(outcomes).toEqual({ repaired: ["events"], skipped: ["bot_events"] });
  });
});
