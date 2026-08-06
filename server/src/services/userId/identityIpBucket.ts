import { Address4, Address6 } from "ip-address";
import { lookupAsn } from "../../db/geolocation/asn.js";
import { isDatacenterAsn } from "../tracker/botBlocking/datacenterAsns.js";

/**
 * The IP string to feed into the anonymous user-ID hash.
 *
 * Visitors whose egress sits in a hosting/datacenter ASN (corporate web
 * proxies, Cloudflare WARP, iCloud Private Relay, VPNs) rotate IPs between
 * requests, so hashing the exact IP mints a new "user" mid-session. Hashing a
 * coarse bucket (/24 for IPv4, /48 for IPv6) instead deliberately trades that
 * splitting for merging: distinct visitors behind the same proxy block with an
 * identical user agent collapse into one user, which corrupts far less than
 * one visitor exploding into many (sessions, bounce rate, channel attribution
 * all survive).
 *
 * Identity only — geolocation, IP exclusion, and storage must keep using the
 * exact IP.
 */
export function bucketIpForIdentity(
  ip: string,
  // Injectable for tests so bucketing can be exercised without the MaxMind DB.
  isDatacenterEgress: (ip: string) => boolean = ip => isDatacenterAsn(lookupAsn(ip)?.asn)
): string {
  if (!ip || !isDatacenterEgress(ip)) {
    return ip;
  }

  try {
    if (ip.includes(":")) {
      return `${new Address6(`${ip}/48`).startAddress().correctForm()}/48`;
    }
    return `${new Address4(`${ip}/24`).startAddress().correctForm()}/24`;
  } catch {
    return ip;
  }
}
