import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildSessionsQuery } from "../sessions/getSessions.js";

describe("buildSessionsQuery with user and event_name filters", () => {
  it("should scope sessions to the user while filtering by event_name via subquery", () => {
    const { query } = buildSessionsQuery(
      {
        filters: JSON.stringify([{ parameter: "event_name", type: "equals", value: ["sale"] }]),
        page: 1,
        limit: 100,
        user_id: "e7d1e46a0b1b6209df4b6420030469a3afbd33a9b66a647fd6bf5e3cb9c51099",
        start_date: "",
        end_date: "",
        time_zone: "UTC",
      },
      1
    );

    expect(query).toContain("session_id IN");
    expect(query).toContain("event_name = 'sale'");
    expect(query).toContain("identified_user_id");
    expect(query).not.toMatch(/WHERE 1 = 1 AND event_name = 'sale'/);
  });
});
