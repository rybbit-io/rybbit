import type { City, SubdivisionsRecord } from "@maxmind/geoip2-node";
import { Reader } from "@maxmind/geoip2-node";
import { readFile } from "fs/promises";
import path from "path";
import { logger } from "../../lib/logger/logger.js";

// Adjust path to find the database relative to project root
const dbPath = path.join(process.cwd(), "GeoLite2-City.mmdb");

interface LocationResponse {
  city?: string;
  country?: string;
  countryIso?: string;
  latitude?: number;
  longitude?: number;
  timeZone?: string;
  error?: string;
  subdivisions?: SubdivisionsRecord[];
}

let reader: Reader | null = null;

// Extend the Reader type to include the city method
interface ExtendedReader extends Reader {
  city(ip: string): City;
}

async function loadDatabase(dbPath: string) {
  const dbBuffer = await readFile(dbPath);
  reader = Reader.openBuffer(dbBuffer);
  logger.info("GeoIP database loaded successfully");
}

await loadDatabase(dbPath);

// Utility function to extract response data
function extractLocationData(response: City): LocationResponse {
  return {
    city: response.city?.names?.en,
    country: response.country?.names?.en,
    countryIso: response.country?.isoCode,
    latitude: response.location?.latitude,
    longitude: response.location?.longitude,
    timeZone: response.location?.timeZone,
    subdivisions: response.subdivisions,
  };
}

export async function getLocation(ip: string): Promise<LocationResponse> {
  // If reader is not initialized, return empty data
  if (!reader) {
    return { error: "GeoIP database not available" };
  }

  try {
    const response = await (reader as ExtendedReader).city(ip);
    return extractLocationData(response);
  } catch (error) {
    console.error("Error fetching location:", error);
    return { error: "Failed to fetch location" };
  }
}
