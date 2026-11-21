import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCloudflareLocation } from "./cloudflare.js";

const headers = {
  "cf-connecting-ip": "203.0.113.8",
  "cf-ipcountry": "US",
  "cf-region-code": "CA",
  "cf-ipcity": "Los Angeles",
  "cf-iplatitude": "34.05",
  "cf-iplongitude": "-118.24",
  "cf-timezone": "America/Los_Angeles",
};
const resolve = (overrides = {}, peer = "10.0.0.2", ip = "203.0.113.8") =>
  getCloudflareLocation({ ...headers, ...overrides }, peer, ip);

describe("Cloudflare location headers", () => {
  beforeEach(() => vi.stubEnv("CLOUDFLARE_GEO_TRUSTED_PROXIES", "10.0.0.2/32,2001:db8::/32"));
  afterEach(() => vi.unstubAllEnvs());

  it("uses validated location headers from an allowed socket peer", () => {
    expect(resolve()).toEqual({
      countryIso: "US",
      region: "CA",
      city: "Los Angeles",
      latitude: 34.05,
      longitude: -118.24,
      timeZone: "America/Los_Angeles",
    });
  });

  it("is disabled by default", () => {
    vi.stubEnv("CLOUDFLARE_GEO_TRUSTED_PROXIES", "");
    expect(resolve()).toBeNull();
  });

  it("does not trust a forged forwarded address", () => {
    expect(resolve({ "x-forwarded-for": "10.0.0.2" }, "198.51.100.1")).toBeNull();
    expect(getCloudflareLocation(headers, undefined, "203.0.113.8")).toBeNull();
  });

  it.each(["bad", "10.0.0.2/33", "10.0.0.2/no", "10.0.0.2/32/1", "10.0.0.2,"])(
    "fails closed for invalid allowlist %s",
    config => {
      vi.stubEnv("CLOUDFLARE_GEO_TRUSTED_PROXIES", config);
      expect(resolve()).toBeNull();
      expect(resolve()).toBeNull();
    }
  );

  it("supports IPv6 and IPv4-mapped socket addresses", () => {
    expect(resolve({}, "2001:db8::1")?.countryIso).toBe("US");
    expect(resolve({}, "::ffff:10.0.0.2")?.countryIso).toBe("US");
  });

  it("does not attach a proxy's location to a different visitor", () => {
    expect(resolve({}, "10.0.0.2", "198.51.100.1")).toBeNull();
    expect(resolve({ "cf-connecting-ip": "2a06:98c0:3600::103" }, "10.0.0.2", "2a06:98c0:3600::103")).toBeNull();
  });

  it.each(["XX", "T1", "", "USA", undefined, ["US", "CA"]])("falls back for an unusable country %s", country => {
    expect(resolve({ "cf-ipcountry": country })).toBeNull();
  });

  it("preserves valid zero coordinates and discards malformed fields", () => {
    expect(resolve({ "cf-iplatitude": "0", "cf-iplongitude": "0" })).toMatchObject({ latitude: 0, longitude: 0 });
    expect(
      resolve({
        "cf-iplatitude": "91",
        "cf-iplongitude": "Infinity",
        "cf-region-code": "US-CA",
        "cf-ipcity": "bad\ncity",
      })
    ).toMatchObject({ latitude: undefined, longitude: undefined, region: undefined, city: undefined });
  });

  it("accepts country-only headers without inventing other location fields", () => {
    expect(
      getCloudflareLocation({ "cf-connecting-ip": "203.0.113.8", "cf-ipcountry": "TW" }, "10.0.0.2", "203.0.113.8")
    ).toEqual({
      countryIso: "TW",
      region: undefined,
      city: undefined,
      latitude: undefined,
      longitude: undefined,
      timeZone: undefined,
    });
  });

  it("decodes Cloudflare's UTF-8 city header bytes as received by Node", () => {
    expect(resolve({ "cf-ipcity": Buffer.from("São Paulo", "utf8").toString("latin1") })?.city).toBe("São Paulo");
    expect(resolve({ "cf-ipcity": "\xff", "cf-timezone": "not/a/timezone" })).toMatchObject({
      city: undefined,
      timeZone: undefined,
    });
  });
});
