import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));

import { buildFunnelQuery } from "./getFunnel.js";

describe("buildFunnelQuery", () => {
  it("orders funnel steps by the millisecond event timestamp", () => {
    const sql = buildFunnelQuery({ start_date: "", end_date: "", time_zone: "", filters: "" }, 1, [
      { type: "page", value: "/cart", name: "Cart" },
      { type: "page", value: "/checkout", name: "Checkout" },
    ]);

    expect(sql).toContain("timestamp_ms AS timestamp");
    expect(sql).toContain("sa.timestamp > s1.step_time");
  });
});
