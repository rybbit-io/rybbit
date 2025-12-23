import { Address4, Address6 } from "ip-address";
import { logger } from "./logger/logger.js";

export interface IPRange {
  ip: string;
  type: "single" | "range" | "cidr";
}

/**
 * Validate if an IP pattern is valid
 */
export function validateIPPattern(pattern: string): { valid: boolean; error?: string } {
  try {
    const trimmedPattern = pattern.trim();

    // Empty or whitespace-only pattern is valid (matches client-side behavior)
    if (!trimmedPattern) {
      return { valid: true };
    }

    // Single IP
    if (!trimmedPattern.includes("/") && !trimmedPattern.includes("-")) {
      try {
        new Address4(trimmedPattern);
        return { valid: true };
      } catch {
        try {
          new Address6(trimmedPattern);
          return { valid: true };
        } catch {
          return { valid: false, error: "Invalid IP address format" };
        }
      }
    }

    // CIDR notation
    if (trimmedPattern.includes("/")) {
      try {
        new Address4(trimmedPattern);
        return { valid: true };
      } catch {
        try {
          new Address6(trimmedPattern);
          return { valid: true };
        } catch {
          return { valid: false, error: "Invalid CIDR notation" };
        }
      }
    }

    // Range notation (IPv4 only)
    if (trimmedPattern.includes("-")) {
      const [startIP, endIP] = trimmedPattern.split("-").map(ip => ip.trim());
      if (!startIP || !endIP) {
        return { valid: false, error: "Invalid range format" };
      }

      try {
        new Address4(startIP);
        new Address4(endIP);
        return { valid: true };
      } catch {
        // Check if these are IPv6 addresses to provide a better error message
        try {
          new Address6(startIP);
          new Address6(endIP);
          return {
            valid: false,
            error: "IPv6 range notation not supported. Use CIDR notation instead (e.g., 2001:db8::/32)",
          };
        } catch {
          return { valid: false, error: "Invalid IP addresses in range" };
        }
      }
    }

    return { valid: false, error: "Unknown IP pattern format" };
  } catch (error) {
    return { valid: false, error: `Validation error: ${error}` };
  }
}

/**
 * Check if IP matches CIDR notation (e.g., 192.168.1.0/24)
 */
export function matchesCIDR(ipAddress: string, cidr: string): boolean {
  try {
    // Try IPv4 first
    try {
      const ipv4 = new Address4(ipAddress);
      const cidrv4 = new Address4(cidr);
      return ipv4.isInSubnet(cidrv4);
    } catch {
      // Try IPv6
      const ipv6 = new Address6(ipAddress);
      const cidrv6 = new Address6(cidr);
      return ipv6.isInSubnet(cidrv6);
    }
  } catch (error) {
    logger.warn(error, `Error matching CIDR ${cidr} for IP ${ipAddress}`);
    return false;
  }
}

/**
 * Check if IP is in range (e.g., 192.168.1.1-192.168.1.10)
 *
 * NOTE: Range notation is only supported for IPv4 addresses.
 * IPv6 range notation is not supported due to the complexity of proper
 * numerical comparison of 128-bit addresses. Use CIDR notation instead
 * for IPv6 (e.g., 2001:db8::/32).
 */
export function matchesRange(ipAddress: string, range: string): boolean {
  try {
    const [startIP, endIP] = range.split("-").map(ip => ip.trim());

    // Try IPv4 first
    try {
      const ip = new Address4(ipAddress);
      const start = new Address4(startIP);
      const end = new Address4(endIP);

      // Convert to 32-bit integers for comparison
      const ipInt = ip.toArray().reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0; // Use unsigned right shift
      const startInt = start.toArray().reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
      const endInt = end.toArray().reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;

      return ipInt >= startInt && ipInt <= endInt;
    } catch {
      // IPv6 range matching is not supported - reject IPv6 ranges
      // This prevents incorrect matches due to lexicographic comparison
      try {
        new Address6(ipAddress);
        new Address6(startIP);
        new Address6(endIP);

        // All addresses are valid IPv6, but we don't support range notation
        logger.warn(`IPv6 range notation not supported: ${range}. Use CIDR notation instead (e.g., 2001:db8::/32)`);
        return false;
      } catch {
        // Mixed or invalid IP addresses
        return false;
      }
    }
  } catch (error) {
    logger.warn(error, `Error matching range ${range} for IP ${ipAddress}`);
    return false;
  }
}
