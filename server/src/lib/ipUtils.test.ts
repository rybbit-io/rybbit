import { describe, expect, it, vi } from "vitest";

vi.mock("./logger/logger.js", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { matchesCIDR, matchesRange, validateIPPattern } from "./ipUtils.js";

describe("validateIPPattern", () => {
  it("treats empty and whitespace-only patterns as valid (matches the client)", () => {
    expect(validateIPPattern("")).toEqual({ valid: true });
    expect(validateIPPattern("   ")).toEqual({ valid: true });
    expect(validateIPPattern("\t\n")).toEqual({ valid: true });
  });

  it("accepts single IPv4 and IPv6 addresses, trimming surrounding whitespace", () => {
    expect(validateIPPattern("192.168.1.1")).toEqual({ valid: true });
    expect(validateIPPattern("  10.0.0.1  ")).toEqual({ valid: true });
    expect(validateIPPattern("0.0.0.0")).toEqual({ valid: true });
    expect(validateIPPattern("255.255.255.255")).toEqual({ valid: true });
    expect(validateIPPattern("2001:db8::1")).toEqual({ valid: true });
    expect(validateIPPattern("::1")).toEqual({ valid: true });
    expect(validateIPPattern("::ffff:192.168.1.1")).toEqual({ valid: true });
  });

  it("rejects malformed single addresses", () => {
    for (const pattern of ["256.1.1.1", "1.2.3", "1.2.3.4.5", "abc", "1.2.3.4x", "0x1.2.3.4", "2130706433", "..."]) {
      expect(validateIPPattern(pattern)).toEqual({ valid: false, error: "Invalid IP address format" });
    }
  });

  it("accepts zero-padded IPv4 octets (ip-address normalizes them)", () => {
    // Documenting current behavior: "01.2.3.4" parses as 1.2.3.4 rather than
    // being rejected as ambiguous octal-looking input.
    expect(validateIPPattern("01.2.3.4")).toEqual({ valid: true });
    expect(validateIPPattern("192.168.001.1")).toEqual({ valid: true });
  });

  it("accepts CIDR notation for IPv4 and IPv6", () => {
    expect(validateIPPattern("192.168.1.0/24")).toEqual({ valid: true });
    expect(validateIPPattern("10.0.0.1/32")).toEqual({ valid: true });
    expect(validateIPPattern("0.0.0.0/0")).toEqual({ valid: true });
    expect(validateIPPattern("2001:db8::/32")).toEqual({ valid: true });
    expect(validateIPPattern("::/0")).toEqual({ valid: true });
  });

  it("rejects malformed CIDR notation", () => {
    for (const pattern of ["192.168.1.1/33", "192.168.1.1/-1", "192.168.1.1/", "192.168.1.1/abc", "/24", "1.2.3/24"]) {
      expect(validateIPPattern(pattern)).toEqual({ valid: false, error: "Invalid CIDR notation" });
    }
  });

  it("classifies a pattern containing a slash as CIDR even when it also has a dash", () => {
    expect(validateIPPattern("192.168.1.0/24-192.168.2.0/24")).toEqual({
      valid: false,
      error: "Invalid CIDR notation",
    });
  });

  it("accepts IPv4 range notation, including inner whitespace around the dash", () => {
    expect(validateIPPattern("192.168.1.1-192.168.1.10")).toEqual({ valid: true });
    expect(validateIPPattern("  192.168.1.1 - 192.168.1.10  ")).toEqual({ valid: true });
    expect(validateIPPattern("10.0.0.5-10.0.0.5")).toEqual({ valid: true });
  });

  it("does not enforce range ordering", () => {
    // A reversed range validates but can never match; see matchesRange.
    expect(validateIPPattern("192.168.1.10-192.168.1.1")).toEqual({ valid: true });
  });

  it("rejects incomplete range notation", () => {
    for (const pattern of ["192.168.1.1-", "-192.168.1.1", "-", " - "]) {
      expect(validateIPPattern(pattern)).toEqual({ valid: false, error: "Invalid range format" });
    }
  });

  it("rejects ranges whose endpoints are not valid IPv4 addresses", () => {
    expect(validateIPPattern("192.168.1.1-999.1.1.1")).toEqual({
      valid: false,
      error: "Invalid IP addresses in range",
    });
    expect(validateIPPattern("abc-def")).toEqual({ valid: false, error: "Invalid IP addresses in range" });
    expect(validateIPPattern("192.168.1.1-2001:db8::1")).toEqual({
      valid: false,
      error: "Invalid IP addresses in range",
    });
    // Three endpoints: the third is ignored, but the second must still parse.
    expect(validateIPPattern("10.0.0.1-10.0.0.5-10.0.0.9")).toEqual({ valid: true });
  });

  it("points IPv6 ranges at CIDR notation instead", () => {
    expect(validateIPPattern("2001:db8::1-2001:db8::5")).toEqual({
      valid: false,
      error: "IPv6 range notation not supported. Use CIDR notation instead (e.g., 2001:db8::/32)",
    });
  });
});

describe("matchesCIDR", () => {
  it("matches an IPv4 address inside the subnet", () => {
    expect(matchesCIDR("192.168.1.42", "192.168.1.0/24")).toBe(true);
  });

  it("includes both boundary addresses of a /24 and excludes the neighbours", () => {
    expect(matchesCIDR("192.168.1.0", "192.168.1.0/24")).toBe(true);
    expect(matchesCIDR("192.168.1.255", "192.168.1.0/24")).toBe(true);
    expect(matchesCIDR("192.168.0.255", "192.168.1.0/24")).toBe(false);
    expect(matchesCIDR("192.168.2.0", "192.168.1.0/24")).toBe(false);
  });

  it("treats /32 as a single host", () => {
    expect(matchesCIDR("10.0.0.1", "10.0.0.1/32")).toBe(true);
    expect(matchesCIDR("10.0.0.2", "10.0.0.1/32")).toBe(false);
  });

  it("treats a bare IP pattern as an exact match", () => {
    expect(matchesCIDR("10.0.0.1", "10.0.0.1")).toBe(true);
    expect(matchesCIDR("10.0.0.2", "10.0.0.1")).toBe(false);
  });

  it("matches everything under /0", () => {
    expect(matchesCIDR("8.8.8.8", "0.0.0.0/0")).toBe(true);
    expect(matchesCIDR("255.255.255.255", "0.0.0.0/0")).toBe(true);
    expect(matchesCIDR("2001:db8::1", "::/0")).toBe(true);
  });

  it("handles a /31 pair", () => {
    expect(matchesCIDR("10.0.0.0", "10.0.0.0/31")).toBe(true);
    expect(matchesCIDR("10.0.0.1", "10.0.0.0/31")).toBe(true);
    expect(matchesCIDR("10.0.0.2", "10.0.0.0/31")).toBe(false);
  });

  it("ignores host bits set in the pattern", () => {
    // 192.168.1.5/24 behaves as 192.168.1.0/24.
    expect(matchesCIDR("192.168.1.9", "192.168.1.5/24")).toBe(true);
  });

  it("matches IPv6 subnets", () => {
    expect(matchesCIDR("2001:db8::5", "2001:db8::/32")).toBe(true);
    expect(matchesCIDR("2001:db9::5", "2001:db8::/32")).toBe(false);
    expect(matchesCIDR("::1", "::1/128")).toBe(true);
    expect(matchesCIDR("::2", "::1/128")).toBe(false);
  });

  it("returns false without throwing when the family of the address and pattern differ", () => {
    expect(matchesCIDR("192.168.1.1", "2001:db8::/32")).toBe(false);
    expect(matchesCIDR("2001:db8::1", "192.168.1.0/24")).toBe(false);
    // An IPv4-mapped IPv6 literal is parsed as IPv6, so an IPv4 CIDR misses it.
    expect(matchesCIDR("::ffff:192.168.1.5", "192.168.1.0/24")).toBe(false);
    expect(matchesCIDR("::ffff:192.168.1.5", "::ffff:192.168.1.0/120")).toBe(true);
  });

  it("returns false for unparseable input on either side", () => {
    expect(matchesCIDR("", "192.168.1.0/24")).toBe(false);
    expect(matchesCIDR("192.168.1.1", "")).toBe(false);
    expect(matchesCIDR("not-an-ip", "192.168.1.0/24")).toBe(false);
    expect(matchesCIDR("192.168.1.1", "not-a-cidr")).toBe(false);
    expect(matchesCIDR("999.1.1.1", "192.168.1.0/24")).toBe(false);
    expect(matchesCIDR("192.168.1.1", "192.168.1.0/33")).toBe(false);
    expect(matchesCIDR("192.168.1.1", "192.168.1.0/-1")).toBe(false);
    expect(matchesCIDR(" 192.168.1.1", "192.168.1.0/24")).toBe(false);
  });
});

describe("matchesRange", () => {
  it("matches an address inside the range", () => {
    expect(matchesRange("192.168.1.5", "192.168.1.1-192.168.1.10")).toBe(true);
  });

  it("is inclusive of both endpoints and excludes the addresses just outside", () => {
    expect(matchesRange("192.168.1.1", "192.168.1.1-192.168.1.10")).toBe(true);
    expect(matchesRange("192.168.1.10", "192.168.1.1-192.168.1.10")).toBe(true);
    expect(matchesRange("192.168.1.0", "192.168.1.1-192.168.1.10")).toBe(false);
    expect(matchesRange("192.168.1.11", "192.168.1.1-192.168.1.10")).toBe(false);
  });

  it("supports a single-address range", () => {
    expect(matchesRange("10.0.0.5", "10.0.0.5-10.0.0.5")).toBe(true);
    expect(matchesRange("10.0.0.6", "10.0.0.5-10.0.0.5")).toBe(false);
  });

  it("never matches a reversed range", () => {
    expect(matchesRange("192.168.1.5", "192.168.1.10-192.168.1.1")).toBe(false);
    expect(matchesRange("192.168.1.10", "192.168.1.10-192.168.1.1")).toBe(false);
  });

  it("compares addresses as unsigned 32-bit integers across the high half of the space", () => {
    expect(matchesRange("200.0.0.1", "0.0.0.0-255.255.255.255")).toBe(true);
    expect(matchesRange("128.0.0.1", "127.0.0.0-255.255.255.255")).toBe(true);
    expect(matchesRange("126.255.255.255", "127.0.0.0-255.255.255.255")).toBe(false);
    expect(matchesRange("255.255.255.255", "255.255.255.254-255.255.255.255")).toBe(true);
    // A range that straddles the sign bit must not fold around.
    expect(matchesRange("10.0.0.1", "127.0.0.0-129.0.0.0")).toBe(false);
  });

  it("tolerates whitespace around the endpoints", () => {
    expect(matchesRange("192.168.1.5", " 192.168.1.1 - 192.168.1.10 ")).toBe(true);
  });

  it("uses only the first two endpoints when extra dashes are present", () => {
    expect(matchesRange("10.0.0.3", "10.0.0.1-10.0.0.5-10.0.0.9")).toBe(true);
    expect(matchesRange("10.0.0.7", "10.0.0.1-10.0.0.5-10.0.0.9")).toBe(false);
  });

  it("returns false for a pattern without a dash", () => {
    expect(matchesRange("10.0.0.5", "10.0.0.5")).toBe(false);
    expect(matchesRange("10.0.0.5", "")).toBe(false);
  });

  it("does not support IPv6 ranges", () => {
    expect(matchesRange("2001:db8::5", "2001:db8::1-2001:db8::10")).toBe(false);
    expect(matchesRange("::1", "::0-::ffff")).toBe(false);
  });

  it("returns false without throwing on mixed families and garbage", () => {
    expect(matchesRange("2001:db8::5", "192.168.1.1-192.168.1.10")).toBe(false);
    expect(matchesRange("192.168.1.5", "2001:db8::1-2001:db8::10")).toBe(false);
    expect(matchesRange("not-an-ip", "192.168.1.1-192.168.1.10")).toBe(false);
    expect(matchesRange("192.168.1.5", "garbage-garbage")).toBe(false);
    expect(matchesRange("192.168.1.5", "192.168.1.1-")).toBe(false);
    expect(matchesRange("192.168.1.5", "-192.168.1.10")).toBe(false);
    expect(matchesRange(" 192.168.1.5", "192.168.1.1-192.168.1.10")).toBe(false);
  });
});
