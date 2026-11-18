import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({ clickhouse: {} }));
vi.mock("../../../db/redis/redis.js", () => ({ redis: {} }));

import { isLowEngagementAsn, selectLowEngagementAsns, setLowEngagementAsnsForTests } from "./asnEngagement.js";

const row = (asn: number, lift: number, sessions = 5000, sites = 100) => ({ asn, lift, sessions, sites });
const hosting = new Set([203020, 14618, 13335]);
const isHosting = (asn: number) => hosting.has(asn);

describe("selectLowEngagementAsns", () => {
  it("lists a hosting network at under a tenth of expected engagement", () => {
    expect(selectLowEngagementAsns([row(203020, 0.016), row(14618, 0.065)], isHosting)).toEqual([14618, 203020]);
  });

  it("holds a network outside hosting space to the stricter ceiling", () => {
    // Registered as an ordinary ISP: real subscribers are the default assumption.
    expect(selectLowEngagementAsns([row(203061, 0.002), row(212286, 0.093)], isHosting)).toEqual([203061]);
  });

  it("leaves out a network that engages like the sites it visits", () => {
    expect(selectLowEngagementAsns([row(7922, 0.94), row(203020, 0.1)], isHosting)).toEqual([]);
  });

  it("needs enough sessions and enough sites to say anything", () => {
    expect(selectLowEngagementAsns([row(203020, 0, 900), row(14618, 0, 5000, 12)], isHosting)).toEqual([]);
  });

  it("never lists a relay or SASE network, whatever it measured", () => {
    expect(
      selectLowEngagementAsns([row(13335, 0), row(36183, 0), row(54113, 0), row(13150, 0), row(22616, 0)], isHosting)
    ).toEqual([]);
  });

  it("ignores a lift that did not compute", () => {
    expect(selectLowEngagementAsns([row(203020, Number.NaN)], isHosting)).toEqual([]);
  });
});

describe("isLowEngagementAsn", () => {
  it("reads the current list and says nothing without one", () => {
    setLowEngagementAsnsForTests([]);
    expect(isLowEngagementAsn(203020)).toBe(false);

    setLowEngagementAsnsForTests([203020]);
    expect(isLowEngagementAsn(203020)).toBe(true);
    expect(isLowEngagementAsn(7922)).toBe(false);
    expect(isLowEngagementAsn(undefined)).toBe(false);

    setLowEngagementAsnsForTests([]);
  });

  it("stops applying a list once it has expired, instead of outliving its data", () => {
    setLowEngagementAsnsForTests([203020], 5_000);

    expect(isLowEngagementAsn(203020, 4_999)).toBe(true);
    expect(isLowEngagementAsn(203020, 5_000)).toBe(false);

    setLowEngagementAsnsForTests([]);
  });
});
