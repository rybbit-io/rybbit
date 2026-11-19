import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));

import { buildFunnelQuery, getFunnel } from "./getFunnel.js";

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

describe("getFunnel", () => {
  function reply() {
    const res = { statusCode: 200, body: undefined as unknown, status: vi.fn(), send: vi.fn() };
    res.status.mockImplementation((code: number) => {
      res.statusCode = code;
      return res;
    });
    res.send.mockImplementation((body: unknown) => {
      res.body = body;
      return res;
    });
    return res;
  }

  // The route is open to anyone viewing a public site, and its body becomes
  // SQL: a non-string field must be turned away before a query is built.
  it.each([
    [
      "an object hostname",
      [
        { type: "page", value: "/a" },
        { type: "page", value: "/b", hostname: { pathname: "x" } },
      ],
    ],
    [
      "an object property key",
      [
        { type: "page", value: "/a" },
        { type: "event", value: "e", propertyFilters: [{ key: { a: "b" }, value: "c" }] },
      ],
    ],
    ["a single step", [{ type: "page", value: "/a" }]],
    ["no steps", undefined],
  ])("answers 400 to %s without querying", async (_label, steps) => {
    const { clickhouse } = await import("../../../db/clickhouse/clickhouse.js");
    const res = reply();

    await getFunnel({ body: { steps }, params: { siteId: "1" }, query: {} } as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(clickhouse.query).not.toHaveBeenCalled();
  });
});
