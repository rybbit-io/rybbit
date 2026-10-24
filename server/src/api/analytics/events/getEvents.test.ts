import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildEventsQuery, eventsCursorError, nextPollCursor, POLL_LIMIT, POLL_OVERLAP_MS } from "./getEvents.js";
import { buildEventBucketedQuery } from "./getEventBucketed.js";
import { buildEventNamesQuery } from "./getEventNames.js";
import { buildSiteEventCountQuery } from "./getSiteEventCount.js";
import { buildEventPropertiesQuery } from "./getEventProperties.js";
import { buildAutocaptureEventsQuery } from "./getAutocaptureEvents.js";
import { buildAutocaptureValuesQuery } from "./getAutocaptureValues.js";
import { buildOutboundLinksQuery } from "./getOutboundLinks.js";

const SITE_ID = 1;

const baseQuery = (overrides: Partial<Record<string, unknown>> = {}) =>
  ({
    start_date: "",
    end_date: "",
    time_zone: "UTC",
    filters: "",
    page_size: "50",
    ...overrides,
  }) as Parameters<typeof buildEventsQuery>[0];

describe("buildEventsQuery filters", () => {
  it("filters event names at the event-row level", () => {
    const filters = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["att_prompt_shown"] }]);
    const { query } = buildEventsQuery(baseQuery({ filters }), SITE_ID);

    expect(query).toContain("AND event_name = 'att_prompt_shown'");
    expect(query).not.toContain("SELECT DISTINCT session_id");
  });

  it("keeps channel filters at the session level", () => {
    const filters = JSON.stringify([{ parameter: "channel", type: "equals", value: ["Direct"] }]);
    const { query } = buildEventsQuery(baseQuery({ filters }), SITE_ID);

    expect(query).toContain("session_id IN");
    expect(query).toContain("session_channel = 'Direct'");
  });

  it("does not add a filter clause when filters are empty", () => {
    const { query, params } = buildEventsQuery(baseQuery(), SITE_ID);

    expect(query).not.toContain("session_id IN");
    expect(params).toEqual({ siteId: SITE_ID, limit: 50 });
  });
});

describe("buildEventsQuery cursors and windows", () => {
  const CURSOR = "1767607200300_5E2691F3091B005F";

  it("orders by the whole second first, then milliseconds and a tie-breaker", () => {
    const { query } = buildEventsQuery(baseQuery(), SITE_ID);

    expect(query).toMatch(
      /ORDER BY timestamp DESC, timestamp_ms DESC, leftPad\(hex\(cityHash64\(.+\)\), 16, '0'\) DESC/
    );
    expect(query).toContain("AS event_cursor");
  });

  it("tells apart events that differ only in their properties or import", () => {
    const { query } = buildEventsQuery(baseQuery(), SITE_ID);

    expect(query).toMatch(/cityHash64\([^)]*session_id[^)]*toString\(props\), ifNull\(toString\(import_id\), ''\)\)/);
  });

  it("pages back from a composite cursor without skipping the rest of its second", () => {
    const { query, params } = buildEventsQuery(baseQuery({ before_cursor: CURSOR }), SITE_ID);

    expect(query).toContain("AND timestamp <= toDateTime(intDiv({beforeMs:Int64}, 1000), 'UTC')");
    expect(query).toContain("(fromUnixTimestamp64Milli({beforeMs:Int64}, 'UTC'), {beforeTiebreak:String})");
    expect(query).not.toContain("AND timestamp < ");
    expect(params).toEqual({ siteId: SITE_ID, limit: 50, beforeMs: 1767607200300, beforeTiebreak: "5E2691F3091B005F" });
  });

  // Ten minutes after the cursor's event: its overlap has long passed.
  const LATER = 1767607200300 + 600_000;

  it("polls for the oldest rows strictly after a composite cursor", () => {
    const { query, params } = buildEventsQuery(baseQuery({ since_cursor: CURSOR }), SITE_ID, LATER);

    expect(query).toContain("AND timestamp >= toDateTime(intDiv({sinceMs:Int64}, 1000), 'UTC')");
    expect(query).toContain(") > (fromUnixTimestamp64Milli({sinceMs:Int64}, 'UTC'), {sinceTiebreak:String})");
    expect(query).toMatch(/ORDER BY timestamp, timestamp_ms, leftPad\(.+\)\s+LIMIT \{limit:Int32\}/);
    expect(params).toEqual({
      siteId: SITE_ID,
      limit: POLL_LIMIT,
      sinceMs: 1767607200300,
      sinceTiebreak: "5E2691F3091B005F",
    });
  });

  it("re-reads the overlap behind a cursor that is newer than it", () => {
    const now = 1767607200300 + 1_000;
    const { params } = buildEventsQuery(baseQuery({ since_cursor: CURSOR }), SITE_ID, now);

    // Everything received from `now - POLL_OVERLAP_MS` on.
    expect(params).toMatchObject({ sinceMs: now - POLL_OVERLAP_MS - 1, sinceTiebreak: "FFFFFFFFFFFFFFFF" });
  });

  it("keeps the newest-500 timestamp poll for API callers", () => {
    const { query, params } = buildEventsQuery(baseQuery({ since_timestamp: "2026-01-05 10:00:00" }), SITE_ID);

    expect(query).toContain("AND timestamp > toDateTime64({sinceTimestamp:String}, 3, 'UTC')");
    expect(query).toContain("ORDER BY timestamp DESC");
    expect(params).toMatchObject({ limit: 500 });
  });

  it("keeps the whole-second timestamp params for API callers", () => {
    const { query } = buildEventsQuery(baseQuery({ before_timestamp: "2026-01-05 10:00:00" }), SITE_ID);
    expect(query).toContain("AND timestamp < toDateTime64({beforeTimestamp:String}, 3, 'UTC')");
  });

  it.each([
    ["past minutes", { past_minutes_start: "30", past_minutes_end: "0" }, "AND timestamp > toDateTime('"],
    [
      "datetime range",
      { start_datetime: "2026-01-05 09:00:00", end_datetime: "2026-01-05 10:00:00" },
      "AND timestamp >= toDateTime('2026-01-05 09:00:00', 'UTC')",
    ],
  ])("bounds a %s window, not only a date range", (_name, window, predicate) => {
    expect(buildEventsQuery(baseQuery(window), SITE_ID).query).toContain(predicate);
  });

  it("bounds a session-level channel filter to the window", () => {
    const filters = JSON.stringify([{ parameter: "channel", type: "equals", value: ["Direct"] }]);
    const { query } = buildEventsQuery(
      baseQuery({ filters, start_datetime: "2026-01-05 09:00:00", end_datetime: "2026-01-05 10:00:00" }),
      SITE_ID
    );
    const subquery = query.slice(query.indexOf("session_id IN ("));
    expect(subquery).toContain("WHERE site_id = 1 AND timestamp >= toDateTime('2026-01-05 09:00:00', 'UTC')");
  });

  it("rejects a malformed cursor", () => {
    expect(eventsCursorError(baseQuery({ before_cursor: "2026-01-05 10:00:00" }))).toMatch(/Invalid before_cursor/);
    expect(eventsCursorError(baseQuery({ since_cursor: "1_xyz" }))).toMatch(/Invalid since_cursor/);
    expect(eventsCursorError(baseQuery({ before_cursor: CURSOR }))).toBeNull();
    expect(eventsCursorError(baseQuery())).toBeNull();
  });
});

describe("nextPollCursor", () => {
  const NOW = 1767607200300;
  const WATERMARK = `${NOW - POLL_OVERLAP_MS - 1}_FFFFFFFFFFFFFFFF`;
  const page = (lastMs: number) =>
    Array.from({ length: POLL_LIMIT }, (_, index) => `${lastMs - (POLL_LIMIT - 1 - index)}_0000000000000000`);

  it("resumes at the watermark after a short page, so the overlap is read again", () => {
    expect(nextPollCursor([`${NOW - 100}_0000000000000000`], NOW)).toEqual({ nextCursor: WATERMARK, hasMore: false });
    expect(nextPollCursor([], NOW)).toEqual({ nextCursor: WATERMARK, hasMore: false });
  });

  it("continues straight after a full page that ends before the watermark", () => {
    const rows = page(NOW - 60_000);

    expect(nextPollCursor(rows, NOW)).toEqual({ nextCursor: rows[rows.length - 1], hasMore: true });
  });

  it("does not hurry a full page that reaches into the overlap", () => {
    expect(nextPollCursor(page(NOW - 1_000), NOW)).toEqual({ nextCursor: WATERMARK, hasMore: false });
  });
});

describe("event summary filter consistency", () => {
  const eventNameFilter = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["signup"] }]);

  it.each([
    ["names", () => buildEventNamesQuery({ ...baseQuery({ filters: eventNameFilter }), event_name: "" }, SITE_ID)],
    [
      "time series",
      () => buildEventBucketedQuery({ ...baseQuery({ filters: eventNameFilter }), bucket: "day" }, SITE_ID),
    ],
    [
      "site count",
      () => buildSiteEventCountQuery({ ...baseQuery({ filters: eventNameFilter }), bucket: "day" }, SITE_ID),
    ],
    [
      "properties",
      () => buildEventPropertiesQuery({ ...baseQuery({ filters: eventNameFilter }), event_name: "signup" }, SITE_ID),
    ],
    [
      "autocapture",
      () =>
        buildAutocaptureEventsQuery(
          { ...baseQuery({ filters: eventNameFilter }), type: "form_submit" },
          SITE_ID,
          "form_submit"
        ),
    ],
    [
      "autocapture values",
      () =>
        buildAutocaptureValuesQuery(
          { ...baseQuery({ filters: eventNameFilter }), type: "form_submit" },
          SITE_ID,
          "form_submit"
        ),
    ],
    ["outbound", () => buildOutboundLinksQuery(baseQuery({ filters: eventNameFilter }), SITE_ID)],
  ])("keeps event_name row-scoped in the %s query", (_name, buildQuery) => {
    const query = buildQuery();

    expect(query).toContain("AND event_name = 'signup'");
    expect(query).not.toContain("SELECT DISTINCT session_id");
  });
});
