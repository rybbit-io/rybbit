/**
 * Client-side IP validation utility using ip-address library
 * This matches the server-side validation logic in server/src/lib/ipUtils.ts
 */

import { Address4, Address6 } from "ip-address";

export interface IPValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate if an IP pattern is valid
 * Supports:
 * - Single IPv4: 192.168.1.1
 * - Single IPv6: 2001:db8::1, ::1, 2001::1
 * - CIDR notation: 192.168.1.0/24, 2001:db8::/32
 * - Range notation: 192.168.1.1-192.168.1.10 (IPv4 only, IPv6 ranges not supported)
 */
export function validateIPPattern(pattern: string): IPValidationResult {
  try {
    const trimmedPattern = pattern.trim();
    
    if (!trimmedPattern) {
      return { valid: true }; // Empty is valid (will be filtered out)
    }
    
    // Single IP
    if (!trimmedPattern.includes("/") && !trimmedPattern.includes("-")) {
      return validateSingleIP(trimmedPattern);
    }

    // CIDR notation
    if (trimmedPattern.includes("/")) {
      return validateCIDR(trimmedPattern);
    }

    // Range notation (IPv4 only)
    if (trimmedPattern.includes("-")) {
      return validateRange(trimmedPattern);
    }

    return { valid: false, error: "Unknown IP pattern format" };
  } catch (error) {
    return { valid: false, error: `Validation error: ${error}` };
  }
}

/**
 * Validate a single IP address (IPv4 or IPv6)
 */
function validateSingleIP(ip: string): IPValidationResult {
  // Try IPv4 first
  try {
    new Address4(ip);
    return { valid: true };
  } catch {
    // Try IPv6
    try {
      new Address6(ip);
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid IP address format" };
    }
  }
}

/**
 * Validate CIDR notation
 */
function validateCIDR(cidr: string): IPValidationResult {
  try {
    // Try IPv4 CIDR first
    try {
      new Address4(cidr);
      return { valid: true };
    } catch {
      // Try IPv6 CIDR
      try {
        new Address6(cidr);
        return { valid: true };
      } catch {
        return { valid: false, error: "Invalid CIDR notation" };
      }
    }
  } catch (error) {
    return { valid: false, error: `Error validating CIDR: ${error}` };
  }
}

/**
 * Validate range notation (IPv4 only)
 * 
 * NOTE: Range notation is only supported for IPv4 addresses.
 * IPv6 range notation is not supported due to the complexity of proper
 * numerical comparison of 128-bit addresses. Use CIDR notation instead
 * for IPv6 (e.g., 2001:db8::/32).
 */
function validateRange(range: string): IPValidationResult {
  const parts = range.split("-").map(ip => ip.trim());
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid range format" };
  }

  const [startIP, endIP] = parts;

  if (!startIP || !endIP) {
    return { valid: false, error: "Invalid range format" };
  }

  // Try IPv4 range
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
        error: "IPv6 range notation not supported. Use CIDR notation instead (e.g., 2001:db8::/32)" 
      };
    } catch {
      return { valid: false, error: "Invalid IP addresses in range" };
    }
  }
}