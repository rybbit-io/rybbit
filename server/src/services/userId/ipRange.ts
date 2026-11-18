import { Address4, Address6 } from "ip-address";

/**
 * The coarse range an address belongs to: its /24 for IPv4, its /48 for IPv6.
 *
 * Hosting and proxy egress rotates addresses inside a block far more often than
 * it moves between blocks, so the range is the unit that stays put while the
 * exact address does not. Returns the address unchanged when it does not parse.
 */
export function toIpRange(ip: string): string {
  try {
    if (ip.includes(":")) {
      return `${new Address6(`${ip}/48`).startAddress().correctForm()}/48`;
    }
    return `${new Address4(`${ip}/24`).startAddress().correctForm()}/24`;
  } catch {
    return ip;
  }
}
