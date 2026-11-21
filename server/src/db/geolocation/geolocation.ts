import type { City } from "@maxmind/geoip2-node";
import { Reader } from "@maxmind/geoip2-node";
import { readFile } from "fs/promises";
import path from "path";
import { logger } from "../../lib/logger/logger.js";
import { LocationResponse } from "./types.js";

const dbPath = path.join(process.cwd(), "GeoLite2-City.mmdb");

let reader: Reader | null = null;

interface ExtendedReader extends Reader {
  city(ip: string): City;
}

async function loadDatabase(dbPath: string) {
  const dbBuffer = await readFile(dbPath);
  reader = Reader.openBuffer(dbBuffer);
  logger.info("GeoIP database loaded successfully");
}

await loadDatabase(dbPath);

function extractLocationData(response: City | null): LocationResponse {
  if (!response) {
    return null;
  }

  return {
    city: response.city?.names?.en,
    country: response.country?.names?.en,
    countryIso: response.country?.isoCode,
    latitude: response.location?.latitude,
    longitude: response.location?.longitude,
    timeZone: response.location?.timeZone,
    region: response.subdivisions?.[0]?.isoCode,
  };
}

/**
 * Whether an IP geolocates to a country and nothing finer: no city and no
 * region. Matches the stored columns (`country != '' AND city = '' AND
 * region = ''`), so a rule learned from ClickHouse reads the same slice at
 * ingest. False when the IP is not found at all — unknown is not country-only.
 */
export function isCountryOnlyLocation(ip: string): boolean {
  if (!reader || !ip) return false;
  try {
    const location = extractLocationData((reader as ExtendedReader).city(ip));
    return Boolean(location?.countryIso) && !location?.city && !location?.region;
  } catch {
    return false;
  }
}

export async function getLocation(ips: string[]): Promise<Record<string, LocationResponse>> {
  const results: Record<string, LocationResponse> = {};
  for (const ip of new Set(ips)) {
    try {
      results[ip] = extractLocationData((reader as ExtendedReader).city(ip));
    } catch {
      results[ip] = null;
    }
  }
  return results;
}
