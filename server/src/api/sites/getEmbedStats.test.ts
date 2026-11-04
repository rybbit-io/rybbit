import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  query: vi.fn(),
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: { getConfig: mocks.getConfig },
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: mocks.query },
}));

vi.mock("../analytics/utils/utils.js", () => ({
  processResults: (result: { json: () => Promise<unknown[]> }) => result.json(),
}));

import { getEmbedStats } from "./getEmbedStats.js";

/** Rows for each of the three reads, picked by what the query selects. */
function rowsFor(query: string) {
  if (query.includes("AS count")) return [{ count: 4 }];
  if (query.includes("AS time")) return [{ time: "2026-11-03 10:00:00", users: 2 }];
  return [{ country: "US", users: 3 }];
}

function request(siteId: string) {
  return { params: { siteId }, query: { minutes: "30", chart: "true", countries: "true" } } as any;
}

function reply() {
  const res: any = { statusCode: 200 };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.header = () => res;
  res.send = (payload: unknown) => {
    res.payload = payload;
    return res;
  };
  return res;
}

const expected = {
  count: 4,
  series: [{ time: "2026-11-03 10:00:00", users: 2 }],
  topCountries: [{ country: "US", users: 3 }],
};

describe("getEmbedStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockResolvedValue({ embedEnabled: true });
    mocks.query.mockImplementation(async ({ query }: { query: string }) => ({ json: async () => rowsFor(query) }));
  });

  it("shares one set of reads between concurrent cache misses for the same widget", async () => {
    // Hold the reads open so both requests miss the cache before either fills it.
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    mocks.query.mockImplementation(async ({ query }: { query: string }) => {
      await gate;
      return { json: async () => rowsFor(query) };
    });

    const first = reply();
    const second = reply();
    const both = Promise.all([getEmbedStats(request("101"), first), getEmbedStats(request("101"), second)]);
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(3));
    release();
    await both;

    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect(first.payload).toEqual(expected);
    expect(second.payload).toEqual(expected);
  });

  it("retries after a failed read instead of handing the failure to the next request", async () => {
    mocks.query.mockRejectedValueOnce(new Error("clickhouse down"));

    await expect(getEmbedStats(request("102"), reply())).rejects.toThrow("clickhouse down");

    const res = reply();
    await getEmbedStats(request("102"), res);
    expect(res.payload).toEqual(expected);
  });

  it("serves a cached result without querying again", async () => {
    await getEmbedStats(request("103"), reply());
    mocks.query.mockClear();

    const res = reply();
    await getEmbedStats(request("103"), res);

    expect(mocks.query).not.toHaveBeenCalled();
    expect(res.payload).toEqual(expected);
  });
});
