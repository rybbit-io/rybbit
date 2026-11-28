import { IANAZone } from "luxon";
import { isUtf8 } from "node:buffer";
import type { IncomingHttpHeaders } from "node:http";
import { BlockList, isIP } from "node:net";
import type { LocationResponse } from "./types.js";

let cachedConfig: string | undefined;
let trustedProxies: BlockList | null = null;

function getTrustedProxies(config: string): BlockList | null {
  if (config === cachedConfig) return trustedProxies;
  cachedConfig = config;
  trustedProxies = null;
  if (!config.trim()) return null;

  const list = new BlockList();
  try {
    for (const entry of config.split(",")) {
      const [address, prefix, extra] = entry.trim().split("/");
      const version = isIP(address);
      if (!version || extra !== undefined) return null;
      const family = version === 4 ? "ipv4" : "ipv6";
      if (prefix === undefined) {
        list.addAddress(address, family);
      } else {
        if (!/^\d+$/.test(prefix)) return null;
        list.addSubnet(address, Number(prefix), family);
      }
    }
    trustedProxies = list;
  } catch {
    // A malformed allowlist must never enable header trust.
  }
  return trustedProxies;
}

function header(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function coordinate(value: string | undefined, max: number): number | undefined {
  if (!value || !/^-?\d+(?:\.\d+)?$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= max ? number : undefined;
}

function cityName(value: string | undefined): string | undefined {
  if (!value || value.length > 256 || /[\x00-\x1f\x7f]/.test(value)) return undefined;
  // Node exposes HTTP header bytes as Latin-1; Cloudflare sends UTF-8 names.
  const bytes = Buffer.from(value, "latin1");
  return isUtf8(bytes) ? bytes.toString("utf8") : undefined;
}

/** Only the socket peer establishes trust; forwarded IP headers cannot do so. */
export function getCloudflareLocation(
  headers: IncomingHttpHeaders,
  remoteAddress: string | undefined,
  clientIp: string
): LocationResponse {
  const proxies = getTrustedProxies(process.env.CLOUDFLARE_GEO_TRUSTED_PROXIES ?? "");
  if (!proxies || !remoteAddress) return null;
  const version = isIP(remoteAddress);
  if (!version || !proxies.check(remoteAddress, version === 4 ? "ipv4" : "ipv6")) return null;

  // Headers describe the Cloudflare client, which may instead be a first-party
  // proxy or SDK server. Never apply that location to a different resolved IP.
  const cfIp = header(headers, "cf-connecting-ip");
  if (!cfIp || !isIP(cfIp) || cfIp.toLowerCase() !== clientIp.toLowerCase()) return null;
  if (cfIp.toLowerCase() === "2a06:98c0:3600::103") return null;

  const countryIso = header(headers, "cf-ipcountry")?.toUpperCase();
  if (!countryIso || !/^[A-Z]{2}$/.test(countryIso) || countryIso === "XX") return null;
  const region = header(headers, "cf-region-code");
  const city = header(headers, "cf-ipcity");
  const timeZone = header(headers, "cf-timezone");

  // Keep a location from one provider together. Filling missing fields from
  // GeoLite2 can combine one country's city with another country's coordinates.
  return {
    countryIso,
    region: region && /^[A-Z0-9]{1,3}$/i.test(region) ? region.toUpperCase() : undefined,
    city: cityName(city),
    latitude: coordinate(header(headers, "cf-iplatitude"), 90),
    longitude: coordinate(header(headers, "cf-iplongitude"), 180),
    timeZone: timeZone && timeZone.length <= 100 && IANAZone.isValidZone(timeZone) ? timeZone : undefined,
  };
}
