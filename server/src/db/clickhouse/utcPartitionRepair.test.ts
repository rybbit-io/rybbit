import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  timezone: "Europe/Berlin",
  engines: {} as Record<string, string>,
  misplaced: {} as Record<string, number>,
  counts: {} as Record<string, number>,
  recentInserts: 0 as number | undefined,
  previousLog: [] as { since: string; until: string; completed_at: string }[],
  migratedAt: undefined as string | undefined,
}));

const mocks = vi.hoisted(() => ({
  exec: vi.fn(),
  insert: vi.fn(),
  query: vi.fn(),
}));

vi.mock("./client.js", () => ({
  clickhouse: { exec: mocks.exec, insert: mocks.insert, query: mocks.query },
  clickhouseQuery: {},
  CLICKHOUSE_REQUEST_TIMEOUT_MS: 1000,
}));

vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { resetServerTimezoneCache } from "./initUtils.js";
import {
  LOG_TABLE,
  parseArgs,
  reinterpretClause,
  repairTable,
  runRepair,
  type RepairOptions,
} from "./utcPartitionRepair.js";
import { UTC_TIME_TABLES } from "./timeColumns.js";

const json = (rows: unknown[]) => ({ json: async () => rows });

function executed() {
  return mocks.exec.mock.calls.map(([args]) => (args.query as string).replace(/\s+/g, " ").trim());
}

function options(overrides: Partial<RepairOptions> = {}): RepairOptions {
  return { apply: true, tables: ["events"], allowLiveWrites: false, dropBackups: false, ...overrides };
}

describe("utcPartitionRepair", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetServerTimezoneCache();
    state.timezone = "Europe/Berlin";
    state.engines = { events: "MergeTree" };
    state.misplaced = { events: 3 };
    state.counts = {};
    state.recentInserts = 0;
    state.previousLog = [];
    state.migratedAt = undefined;
    mocks.exec.mockResolvedValue(undefined);
    mocks.insert.mockResolvedValue(undefined);
    mocks.query.mockImplementation(
      async ({ query, query_params }: { query: string; query_params?: Record<string, string> }) => {
        if (query.includes("timezone()")) return json([{ timezone: state.timezone }]);
        if (query.includes("FROM system.tables")) {
          const engine = state.engines[query_params?.table ?? ""];
          return json(engine ? [{ engine }] : []);
        }
        if (query.includes("AS misplaced")) {
          const table = /FROM (\w+) WHERE/.exec(query)?.[1] ?? "";
          return json([{ misplaced: state.misplaced[table] ?? 0 }]);
        }
        if (query.includes("system.query_log")) {
          if (state.recentInserts === undefined) throw new Error("query_log disabled");
          return json([{ n: state.recentInserts }]);
        }
        if (query.includes(`FROM ${LOG_TABLE}`) && query.includes("kind = 'migrated'")) {
          return json([{ at: state.migratedAt ?? "1970-01-01 00:00:00" }]);
        }
        if (query.includes(`FROM ${LOG_TABLE}`)) return json(state.previousLog);
        const count = /SELECT count\(\) AS n FROM (\w+)( FINAL)?/.exec(query);
        if (count) return json([{ n: state.counts[count[1] + (count[2] ?? "")] ?? 0 }]);
        throw new Error(`Unexpected query: ${query}`);
      }
    );
  });

  describe("parseArgs", () => {
    it("leaves the upper bound to each table's migration record by default", () => {
      const opts = parseArgs([]);
      expect(opts.until).toBeUndefined();
      expect(opts.apply).toBe(false);
      expect(opts.tables).toEqual(Object.keys(UTC_TIME_TABLES));
    });

    it("rejects an unbounded or inverted reinterpretation window and unknown tables", () => {
      expect(() => parseArgs(["--reinterpret-from", "Europe/Berlin"])).toThrow(/requires --since/);
      expect(() =>
        parseArgs([
          "--reinterpret-from",
          "Europe/Berlin",
          "--since",
          "2026-09-16 12:00:00",
          "--until",
          "2026-09-16 11:00:00",
        ])
      ).toThrow(/not before/);
      expect(() => parseArgs(["--since", "yesterday"])).toThrow(/Expected YYYY-MM-DD/);
      expect(() => parseArgs(["--tables", "events,nope"])).toThrow(/Unknown table nope/);
    });
  });

  describe("reinterpretClause", () => {
    const opts = { zone: "Europe/Berlin", since: "2026-09-10 00:00:00", until: "2026-09-16 12:00:00" };

    it("re-reads only columns the old writer stored as naive strings, bounded on both ends", () => {
      const clause = reinterpretClause(UTC_TIME_TABLES.session_replay_metadata.columns, opts);
      expect(clause).toContain("toDateTime(toString(toTimeZone(start_time, 'Europe/Berlin')), 'UTC')");
      expect(clause).toContain("AS end_time");
      expect(clause).not.toContain("created_at");
      expect(clause).toContain(
        "start_time >= toDateTime('2026-09-10 00:00:00', 'UTC') AND start_time < toDateTime('2026-09-16 12:00:00', 'UTC')"
      );
    });

    it("keeps millisecond precision for DateTime64 columns", () => {
      const clause = reinterpretClause(UTC_TIME_TABLES.events.columns, opts);
      expect(clause).toContain("toDateTime64(toString(toTimeZone(timestamp_ms, 'Europe/Berlin')), 3, 'UTC')");
    });

    it("leaves tables whose instants were always correct untouched", () => {
      expect(reinterpretClause(UTC_TIME_TABLES.session_replay_events.columns, opts)).toBe("");
      expect(reinterpretClause(UTC_TIME_TABLES.events.columns, undefined)).toBe("");
    });
  });

  describe("repairTable", () => {
    it("only prints the plan on a dry run", async () => {
      const lines: string[] = [];
      const outcome = await repairTable("events", options({ apply: false }), line => lines.push(line));
      expect(outcome).toBe("planned");
      expect(mocks.exec).not.toHaveBeenCalled();
      expect(lines.join("\n")).toContain("EXCHANGE TABLES events AND events_utc_repair");
    });

    it("copies, validates, swaps, keeps the original as a backup and records the run", async () => {
      state.counts = { events: 10, events_utc_repair: 10 };
      const outcome = await repairTable("events", options(), () => {});
      expect(outcome).toBe("repaired");
      expect(executed()).toEqual([
        "DROP TABLE IF EXISTS events_utc_repair",
        "CREATE TABLE events_utc_repair AS events",
        "INSERT INTO events_utc_repair SELECT * FROM events",
        "EXCHANGE TABLES events AND events_utc_repair",
        "RENAME TABLE events_utc_repair TO events_utc_repair_backup",
        expect.stringContaining(`CREATE TABLE IF NOT EXISTS ${LOG_TABLE}`),
      ]);
      expect(mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({ table: LOG_TABLE, values: [expect.objectContaining({ table: "events" })] })
      );
    });

    it("refuses while writers are active unless told otherwise", async () => {
      state.recentInserts = 4;
      state.counts = { events: 10, events_utc_repair: 10 };
      expect(await repairTable("events", options(), () => {})).toBe("refused");
      expect(mocks.exec).not.toHaveBeenCalled();
      expect(await repairTable("events", options({ allowLiveWrites: true }), () => {})).toBe("repaired");
    });

    it("does not swap in a copy whose row count differs", async () => {
      state.counts = { events: 10, events_utc_repair: 9 };
      expect(await repairTable("events", options(), () => {})).toBe("refused");
      expect(executed().some(query => query.startsWith("EXCHANGE"))).toBe(false);
    });

    it("compares folding engines after FINAL so background merges in the copy do not fail validation", async () => {
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

    it("bounds the re-read at the startup migration unless told otherwise, and refuses without either", async () => {
      state.engines = { events: "MergeTree", [LOG_TABLE]: "MergeTree" };
      state.counts = { events: 10, events_utc_repair: 10 };
      const lines: string[] = [];
      const reinterpret = options({ reinterpretFrom: "Europe/Berlin", since: "2026-09-10 00:00:00" });
      expect(await repairTable("events", reinterpret, line => lines.push(line))).toBe("refused");
      expect(lines.join("\n")).toContain("pass --until");

      state.migratedAt = "2026-09-16 09:00:00";
      expect(await repairTable("events", reinterpret, () => {})).toBe("repaired");
      expect(executed().find(query => query.startsWith("INSERT INTO events_utc_repair"))).toContain(
        "timestamp < toDateTime('2026-09-16 09:00:00', 'UTC')"
      );
      expect(mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          values: [
            expect.objectContaining({ kind: "repaired", since: "2026-09-10 00:00:00", until: "2026-09-16 09:00:00" }),
          ],
        })
      );
    });

    it("skips a window overlapping one it already re-read so a retry cannot shift rows twice", async () => {
      state.engines = { events: "MergeTree", [LOG_TABLE]: "MergeTree" };
      state.migratedAt = "2026-09-16 09:00:00";
      state.previousLog = [
        { since: "2026-09-12 00:00:00", until: "2026-09-16 09:00:00", completed_at: "2026-09-16 11:00:00" },
      ];
      const lines: string[] = [];
      const outcome = await repairTable(
        "events",
        options({ reinterpretFrom: "Europe/Berlin", since: "2026-09-10 00:00:00" }),
        line => lines.push(line)
      );
      expect(outcome).toBe("skipped");
      expect(lines.join("\n")).toContain("shifted twice");
      expect(mocks.exec).not.toHaveBeenCalled();
    });

    it("refuses to overwrite an earlier backup unless asked to drop it", async () => {
      state.engines = { events: "MergeTree", events_utc_repair_backup: "MergeTree" };
      state.counts = { events: 10, events_utc_repair: 10 };
      expect(await repairTable("events", options(), () => {})).toBe("refused");
      expect(mocks.exec).not.toHaveBeenCalled();
      expect(await repairTable("events", options({ dropBackups: true }), () => {})).toBe("repaired");
      expect(executed()[0]).toBe("DROP TABLE events_utc_repair_backup");
    });

    it("leaves tables that a refreshable view regenerates, and absent tables, alone", async () => {
      state.engines = { session_hourly_mv_target: "MergeTree" };
      expect(
        await repairTable("session_hourly_mv_target", options({ tables: ["session_hourly_mv_target"] }), () => {})
      ).toBe("skipped");
      expect(await repairTable("bot_events", options({ tables: ["bot_events"] }), () => {})).toBe("skipped");
      expect(mocks.exec).not.toHaveBeenCalled();
    });
  });

  it("runRepair reports what it did per table", async () => {
    state.engines = { events: "MergeTree", bot_events: "MergeTree" };
    state.misplaced = { events: 3, bot_events: 0 };
    state.counts = { events: 10, events_utc_repair: 10 };
    const outcomes = await runRepair(["--apply", "--tables", "events,bot_events"], () => {});
    expect(outcomes).toEqual({ repaired: ["events"], skipped: ["bot_events"] });
  });
});
