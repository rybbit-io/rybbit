import { beforeEach, describe, expect, it, vi } from "vitest";
import type UAParser from "ua-parser-js";
import type { TotalTrackingPayload } from "./utils.js";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  getLocation: vi.fn(),
  lookupAsn: vi.fn(),
  isDatacenterAsn: vi.fn(),
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { insert: mocks.insert },
}));

vi.mock("../../db/geolocation/geolocation.js", () => ({
  getLocation: mocks.getLocation,
}));

vi.mock("../../db/geolocation/asn.js", () => ({
  lookupAsn: mocks.lookupAsn,
}));

vi.mock("./botBlocking/datacenterAsns.js", () => ({
  isDatacenterAsn: mocks.isDatacenterAsn,
}));

vi.useFakeTimers();
const { pageviewQueue } = await import("./pageviewQueue.js");

function makePayload(overrides: Partial<TotalTrackingPayload & { sessionId: string }> = {}) {
  return {
    site_id: 42,
    hostname: "example.com",
    pathname: "/",
    querystring: "",
    screenWidth: 1920,
    screenHeight: 1080,
    language: "en",
    page_title: "",
    referrer: "",
    type: "pageview",
    ipAddress: "203.0.113.10",
    timestamp: new Date().toISOString(),
    ua: { browser: {}, os: {} } as UAParser.IResult,
    userAgent: "Mozilla/5.0",
    userId: "fingerprint-abc",
    identifiedUserId: "",
    sessionId: "session-abc",
    ...overrides,
  } as TotalTrackingPayload & { sessionId: string };
}

async function flush() {
  await pageviewQueue.add(makePayload());
  await vi.advanceTimersByTimeAsync(1000);
}

describe("pageviewQueue ASN enrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLocation.mockResolvedValue({});
    mocks.insert.mockResolvedValue(undefined);
  });

  it("stores the ASN, org, and datacenter classification for a recognized IP", async () => {
    mocks.lookupAsn.mockReturnValue({ asn: 16509, organization: "AMAZON-02" });
    mocks.isDatacenterAsn.mockReturnValue(true);

    await flush();

    const row = mocks.insert.mock.calls[0][0].values[0];
    expect(row.asn).toBe(16509);
    expect(row.asn_org).toBe("AMAZON-02");
    expect(row.is_datacenter_asn).toBe(1);
  });

  it("defaults to null/empty/0 when the IP has no ASN match", async () => {
    mocks.lookupAsn.mockReturnValue(null);

    await flush();

    const row = mocks.insert.mock.calls[0][0].values[0];
    expect(row.asn).toBeNull();
    expect(row.asn_org).toBe("");
    expect(row.is_datacenter_asn).toBe(0);
  });

  it("marks residential ASNs as non-datacenter", async () => {
    mocks.lookupAsn.mockReturnValue({ asn: 7922, organization: "COMCAST-7922" });
    mocks.isDatacenterAsn.mockReturnValue(false);

    await flush();

    const row = mocks.insert.mock.calls[0][0].values[0];
    expect(row.is_datacenter_asn).toBe(0);
  });
});
