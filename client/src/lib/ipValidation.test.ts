import { describe, expect, it } from "vitest";
import { validateIPPattern } from "./ipValidation";

const valid = (pattern: string) => expect(validateIPPattern(pattern)).toEqual({ valid: true });
const invalid = (pattern: string, error: string) => expect(validateIPPattern(pattern)).toEqual({ valid: false, error });

describe("empty input", () => {
  it("treats blank patterns as valid so they can be filtered out later", () => {
    valid("");
    valid("   ");
    valid("\t\n");
  });
});

describe("single addresses", () => {
  it.each(["192.168.1.1", "0.0.0.0", "255.255.255.255", "8.8.8.8"])("accepts the IPv4 address %s", valid);

  it.each(["::1", "::", "2001:db8::1", "2001:0db8:85a3:0000:0000:8a2e:0370:7334", "fe80::1", "::ffff:192.168.1.1"])(
    "accepts the IPv6 address %s",
    valid
  );

  it("rejects out-of-range octets", () => {
    invalid("999.1.1.1", "Invalid IP address format");
    invalid("256.0.0.1", "Invalid IP address format");
  });

  it("rejects incomplete IPv4 addresses", () => {
    invalid("192.168.1", "Invalid IP address format");
    invalid("192.168.1.1.1", "Invalid IP address format");
  });

  it("rejects text that is not an address", () => {
    invalid("abc", "Invalid IP address format");
    invalid("localhost", "Invalid IP address format");
    invalid("example.com", "Invalid IP address format");
  });

  it("trims surrounding whitespace before validating", () => {
    valid("  192.168.1.1  ");
    valid("\t2001:db8::1\n");
  });
});

describe("CIDR notation", () => {
  it.each(["192.168.1.0/24", "10.0.0.0/8", "0.0.0.0/0", "192.168.1.1/32"])("accepts the IPv4 CIDR %s", valid);

  it.each(["2001:db8::/32", "::/0", "fe80::/10", "2001:db8::1/128"])("accepts the IPv6 CIDR %s", valid);

  it("rejects a prefix length outside the address family's range", () => {
    invalid("1.2.3.4/33", "Invalid CIDR notation");
    invalid("2001:db8::/129", "Invalid CIDR notation");
  });

  it("rejects malformed CIDR strings", () => {
    invalid("192.168.1.1/24/8", "Invalid CIDR notation");
    invalid("192.168.1.1/", "Invalid CIDR notation");
    invalid("/24", "Invalid CIDR notation");
    invalid("192.168.1.1/abc", "Invalid CIDR notation");
  });

  it("checks the slash before the dash, so a slash always means CIDR", () => {
    invalid("192.168.1.1-192.168.1.10/24", "Invalid CIDR notation");
  });
});

describe("range notation", () => {
  it("accepts an IPv4 range", () => {
    valid("192.168.1.1-192.168.1.10");
    valid("10.0.0.1 - 10.0.0.5");
  });

  it("points IPv6 ranges at CIDR instead", () => {
    invalid(
      "2001:db8::1-2001:db8::2",
      "IPv6 range notation not supported. Use CIDR notation instead (e.g., 2001:db8::/32)"
    );
  });

  it("rejects a range with a missing endpoint", () => {
    invalid("192.168.1.1-", "Invalid range format");
    invalid("-192.168.1.10", "Invalid range format");
  });

  it("rejects a range with more than two endpoints", () => {
    invalid("192.168.1.1-192.168.1.5-192.168.1.10", "Invalid range format");
  });

  it("rejects a range whose endpoints are not addresses", () => {
    invalid("hello-world", "Invalid IP addresses in range");
    invalid("192.168.1.1-notanip", "Invalid IP addresses in range");
  });

  it("routes any dash-containing text through the range branch", () => {
    // "not-an-ip" splits into three parts, so it fails on arity rather than on
    // address parsing.
    invalid("not-an-ip", "Invalid range format");
  });

  it("does not check that the range is ordered", () => {
    valid("192.168.1.10-192.168.1.1");
  });
});
