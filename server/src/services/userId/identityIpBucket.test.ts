import { describe, it, expect } from "vitest";
import { bucketIpForIdentity } from "./identityIpBucket.js";

const datacenter = () => true;
const residential = () => false;

describe("bucketIpForIdentity", () => {
  it("returns residential IPs unchanged", () => {
    expect(bucketIpForIdentity("203.0.113.55", residential)).toBe("203.0.113.55");
  });

  it("buckets rotating datacenter egress into the same /24", () => {
    // Cloudflare WARP-style rotation: adjacent egress IPs must hash identically.
    expect(bucketIpForIdentity("172.68.34.28", datacenter)).toBe("172.68.34.0/24");
    expect(bucketIpForIdentity("172.68.34.29", datacenter)).toBe("172.68.34.0/24");
  });

  it("buckets IPv6 datacenter egress into the same /48", () => {
    expect(bucketIpForIdentity("2a06:98c0:3600:0:1:2:3:4", datacenter)).toBe("2a06:98c0:3600::/48");
    expect(bucketIpForIdentity("2a06:98c0:3600:ffff::1", datacenter)).toBe("2a06:98c0:3600::/48");
  });

  it("returns unparseable input unchanged", () => {
    expect(bucketIpForIdentity("not-an-ip", datacenter)).toBe("not-an-ip");
    expect(bucketIpForIdentity("", datacenter)).toBe("");
  });
});
