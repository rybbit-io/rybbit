import type { City } from "@maxmind/geoip2-node";
import { Reader } from "@maxmind/geoip2-node";
import { readFile } from "fs/promises";
import path from "path";
import { logger } from "../../lib/logger/logger.js";
import { LocationResponse } from "./types.js";

export const CITY_DB_FILE = "GeoLite2-City.mmdb";
const dbPath = path.join(process.cwd(), CITY_DB_FILE);

let reader: Reader | null = null;

interface ExtendedReader extends Reader {
  city(ip: string): City;
}

/**
 * Replace the in-memory City reader. Pass a buffer to load a freshly
 * downloaded database, or nothing to re-read the file on disk (used by cluster
 * workers after the primary has written an update). The old reader is only
 * released once the new one has opened, so lookups never observe a gap.
 */
export async function reloadCityDatabase(buffer?: Buffer): Promise<void> {
  const dbBuffer = buffer ?? (await readFile(dbPath));
  reader = Reader.openBuffer(dbBuffer);
  logger.info("GeoIP database loaded successfully");
}

await reloadCityDatabase();

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
