import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildEventsQuery } from "./getEvents.js";

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
