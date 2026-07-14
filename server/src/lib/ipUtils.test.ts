import { describe, expect, it, vi } from "vitest";
import { matchesCIDR, matchesRange, validateIPPattern } from "./ipUtils.js";

// The logger uses a pino-pretty transport (a worker thread); stub it so these
// pure-logic tests stay deterministic and quiet. Vitest hoists vi.mock above
// the imports, so the mock still applies despite being declared below them.
vi.mock("./logger/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("validateIPPattern", () => {
  it("treats empty or whitespace-only patterns as valid", () => {
    expect(validateIPPattern("")).toEqual({ valid: true });
    expect(validateIPPattern("   ")).toEqual({ valid: true });
  });

  it("accepts a single IPv4 or IPv6 address", () => {
    expect(validateIPPattern("192.168.1.1")).toEqual({ valid: true });
    expect(validateIPPattern("2001:db8::1")).toEqual({ valid: true });
  });

  it("accepts CIDR notation for both families", () => {
    expect(validateIPPattern("192.168.1.0/24")).toEqual({ valid: true });
    expect(validateIPPattern("2001:db8::/32")).toEqual({ valid: true });
  });

  it("accepts an IPv4 range", () => {
    expect(validateIPPattern("192.168.1.1-192.168.1.10")).toEqual({ valid: true });
  });

  it("rejects a malformed single address", () => {
    const result = validateIPPattern("999.999.999.999");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid IP address format");
  });

  it("rejects an IPv6 range with a pointer to CIDR", () => {
    const result = validateIPPattern("2001:db8::1-2001:db8::10");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("IPv6 range notation not supported");
  });

  it("rejects a range that is missing an endpoint", () => {
    const result = validateIPPattern("192.168.1.1-");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid range format");
  });
});

describe("matchesCIDR", () => {
  it("matches an IPv4 address inside the subnet", () => {
    expect(matchesCIDR("192.168.1.5", "192.168.1.0/24")).toBe(true);
  });

  it("does not match an IPv4 address outside the subnet", () => {
    expect(matchesCIDR("192.168.2.5", "192.168.1.0/24")).toBe(false);
  });

  it("matches an IPv6 address inside the subnet", () => {
    expect(matchesCIDR("2001:db8::5", "2001:db8::/32")).toBe(true);
    expect(matchesCIDR("2001:dead::5", "2001:db8::/32")).toBe(false);
  });

  it("returns false when the address and CIDR families differ", () => {
    expect(matchesCIDR("192.168.1.5", "2001:db8::/32")).toBe(false);
    expect(matchesCIDR("2001:db8::5", "192.168.1.0/24")).toBe(false);
  });

  it("returns false for an unparseable address", () => {
    expect(matchesCIDR("not-an-ip", "192.168.1.0/24")).toBe(false);
  });
});

describe("matchesRange", () => {
  it("matches an IPv4 address inside the range", () => {
    expect(matchesRange("192.168.1.5", "192.168.1.1-192.168.1.10")).toBe(true);
  });

  it("treats both endpoints as inclusive", () => {
    expect(matchesRange("192.168.1.1", "192.168.1.1-192.168.1.10")).toBe(true);
    expect(matchesRange("192.168.1.10", "192.168.1.1-192.168.1.10")).toBe(true);
  });

  it("does not match an address outside the range", () => {
    expect(matchesRange("192.168.1.20", "192.168.1.1-192.168.1.10")).toBe(false);
    expect(matchesRange("192.168.0.255", "192.168.1.1-192.168.1.10")).toBe(false);
  });

  it("does not match IPv6 ranges (unsupported)", () => {
    expect(matchesRange("2001:db8::5", "2001:db8::1-2001:db8::10")).toBe(false);
  });

  it("returns false for an unparseable address", () => {
    expect(matchesRange("not-an-ip", "192.168.1.1-192.168.1.10")).toBe(false);
  });
});
