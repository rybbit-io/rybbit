import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({ clickhouse: {} }));
const redisGet = vi.hoisted(() => vi.fn<(key: string) => Promise<string | null>>());
vi.mock("../../../db/redis/redis.js", () => ({ redis: { get: redisGet } }));

import {
  decideAsnEngagementLists,
  isCountryOnlyProxySlice,
  isLowEngagementAsn,
  mirrorAsnEngagementFromRedis,
  selectCountryOnlyProxyAsns,
  selectLowEngagementAsns,
  setLowEngagementAsnsForTests,
  type AsnSliceRow,
} from "./asnEngagement.js";

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

const slice = (
  asn: number,
  which: AsnSliceRow["slice"],
  lift: number,
  topDeviceShare: number,
  sessions = 5000,
  sites = 100
): AsnSliceRow => ({ asn, slice: which, lift, topDeviceShare, sessions, sites });

describe("selectCountryOnlyProxyAsns", () => {
  // Prod, week to 2026-11-19, from the shipped query: Cox's country-only slice
  // against the rest of Cox.
  const cox = [
    slice(22773, "all", 0.683, 0.46, 51810, 824),
    slice(22773, "country_only", 0.276, 0.73, 32788, 599),
    slice(22773, "other", 1.323, 0.19, 19022, 581),
  ];

  it("lists a residential network whose country-only slice is one device that does not engage", () => {
    expect(selectCountryOnlyProxyAsns(cox, isHosting)).toEqual([22773]);
  });

  it("leaves a carrier whose country-only slice behaves like the rest of it", () => {
    // Chinanet: mostly country-only, and its people engage either way.
    const chinanet = [slice(4134, "country_only", 1.026, 0.14), slice(4134, "other", 1.075, 0.16)];
    expect(selectCountryOnlyProxyAsns(chinanet, isHosting)).toEqual([]);
  });

  it("leaves a slice that engages well, however much more its sibling does", () => {
    const wellEngaged = [slice(64500, "country_only", 1.0, 0.9), slice(64500, "other", 3.0, 0.2)];
    expect(selectCountryOnlyProxyAsns(wellEngaged, isHosting)).toEqual([]);
  });

  it("ignores sessions that changed network or slice mid-visit", () => {
    // A mixed row is measured but belongs to neither slice.
    const onlyMixed = [slice(22773, "mixed" as AsnSliceRow["slice"], 0, 1), cox[2]];
    expect(selectCountryOnlyProxyAsns(onlyMixed, isHosting)).toEqual([]);
  });

  it("needs both a low relative lift and a dominant device", () => {
    const lowLiftMixedDevices = [slice(2914, "country_only", 0.01, 0.42), slice(2914, "other", 0.5, 0.2)];
    const oneDeviceEngaging = [slice(17676, "country_only", 0.5, 0.9), slice(17676, "other", 0.6, 0.2)];
    expect(selectCountryOnlyProxyAsns([...lowLiftMixedDevices, ...oneDeviceEngaging], isHosting)).toEqual([]);
  });

  it("leaves hosting networks to the whole-network list", () => {
    // M247: VPN exits, often country-only, measured 0.31 and 0.65.
    const m247 = [slice(9009, "country_only", 0.101, 0.65), slice(9009, "other", 0.326, 0.3)];
    expect(selectCountryOnlyProxyAsns(m247, asn => asn === 9009)).toEqual([]);
  });

  it("needs enough of both slices to compare them", () => {
    expect(selectCountryOnlyProxyAsns([cox[1], { ...cox[2], sessions: 900 }], isHosting)).toEqual([]);
    expect(selectCountryOnlyProxyAsns([{ ...cox[1], sites: 12 }, cox[2]], isHosting)).toEqual([]);
    expect(selectCountryOnlyProxyAsns([cox[1]], isHosting)).toEqual([]);
  });

  it("ignores a lift that did not compute, and a sibling that never engages", () => {
    expect(selectCountryOnlyProxyAsns([{ ...cox[1], lift: Number.NaN }, cox[2]], isHosting)).toEqual([]);
    expect(selectCountryOnlyProxyAsns([cox[1], { ...cox[2], lift: 0 }], isHosting)).toEqual([]);
  });

  it("never lists a relay or SASE network", () => {
    const relay = [slice(13335, "country_only", 0, 0.9), slice(13335, "other", 1, 0.2)];
    expect(selectCountryOnlyProxyAsns(relay, () => false)).toEqual([]);
  });
});

describe("isCountryOnlyProxySlice", () => {
  it("matches a listed network only on a country-only address, and only asks then", () => {
    setLowEngagementAsnsForTests([], Number.POSITIVE_INFINITY, [22773]);
    const isCountryOnly = vi.fn(() => true);

    expect(isCountryOnlyProxySlice(22773, isCountryOnly)).toBe(true);
    expect(isCountryOnlyProxySlice(22773, () => false)).toBe(false);
    expect(isCountryOnlyProxySlice(7922, isCountryOnly)).toBe(false);
    expect(isCountryOnlyProxySlice(undefined, isCountryOnly)).toBe(false);
    expect(isCountryOnly).toHaveBeenCalledTimes(1);

    setLowEngagementAsnsForTests([]);
  });

  it("stops applying when the list expires", () => {
    setLowEngagementAsnsForTests([], 5_000, [22773]);

    expect(isCountryOnlyProxySlice(22773, () => true, 4_999)).toBe(true);
    expect(isCountryOnlyProxySlice(22773, () => true, 5_000)).toBe(false);

    setLowEngagementAsnsForTests([]);
  });
});

describe("decideAsnEngagementLists", () => {
  const proxySlices = (asn: number) => [slice(asn, "country_only", 0.1, 0.9), slice(asn, "other", 1, 0.2)];

  it("keeps a healthy whole-network list when the proxy list is implausibly long", () => {
    const rows = [
      slice(203061, "all", 0.002, 0.5),
      ...Array.from({ length: 301 }, (_, i) => proxySlices(70000 + i)).flat(),
    ];
    expect(decideAsnEngagementLists(rows, () => false)).toEqual({ lowEngagement: [203061], countryOnly: null });
  });

  it("keeps a healthy proxy list when the whole-network list is implausibly long", () => {
    const rows = [...Array.from({ length: 301 }, (_, i) => slice(80000 + i, "all", 0, 0.5)), ...proxySlices(22773)];
    expect(decideAsnEngagementLists(rows, () => false)).toEqual({ lowEngagement: null, countryOnly: [22773] });
  });
});

describe("mirrorAsnEngagementFromRedis", () => {
  const stored = (asns: number[]) => JSON.stringify({ asns, expiresAtMs: Number.MAX_SAFE_INTEGER });

  it("keeps the proxy list when a worker from before it existed republishes the whole-network list", async () => {
    // The legacy writer only ever touches bot:ae, with no proxy field in it.
    redisGet.mockImplementation(async key => (key === "bot:ae" ? stored([203061]) : stored([22773])));
    setLowEngagementAsnsForTests([], 0);

    await mirrorAsnEngagementFromRedis();

    expect(isLowEngagementAsn(203061)).toBe(true);
    expect(isCountryOnlyProxySlice(22773, () => true)).toBe(true);
    setLowEngagementAsnsForTests([]);
  });

  it("leaves the proxy list empty until one has been published", async () => {
    redisGet.mockImplementation(async key => (key === "bot:ae" ? stored([203061]) : null));
    setLowEngagementAsnsForTests([], 0);

    await mirrorAsnEngagementFromRedis();

    expect(isLowEngagementAsn(203061)).toBe(true);
    expect(isCountryOnlyProxySlice(22773, () => true)).toBe(false);
    setLowEngagementAsnsForTests([]);
  });
});
