import type { Asn } from "@maxmind/geoip2-node";
import { Reader } from "@maxmind/geoip2-node";
import { readFile } from "fs/promises";
import path from "path";
import { logger } from "../../lib/logger/logger.js";

export const ASN_DB_FILE = "GeoLite2-ASN.mmdb";
const dbPath = path.join(process.cwd(), ASN_DB_FILE);

interface AsnReader extends Reader {
  asn(ip: string): Asn;
}

let reader: AsnReader | null = null;

/**
 * Replace the in-memory ASN reader. Pass a buffer to load a freshly downloaded
 * database, or nothing to re-read the file on disk (cluster workers do this
 * after the primary has written an update). A failed reload keeps whatever
 * reader was already active rather than dropping to `null`.
 */
export async function reloadAsnDatabase(buffer?: Buffer): Promise<void> {
  try {
    const buf = buffer ?? (await readFile(dbPath));
    reader = Reader.openBuffer(buf) as AsnReader;
    logger.info("GeoIP ASN database loaded successfully");
  } catch (err) {
    if (reader) {
      logger.warn({ err, dbPath }, "GeoIP ASN database reload failed — keeping the previous database");
      return;
    }
    logger.warn({ err, dbPath }, "GeoIP ASN database not loaded — ASN-based bot detection disabled");
  }
}

await reloadAsnDatabase();

export interface AsnInfo {
  asn: number;
  organization: string;
}

export function lookupAsn(ip: string): AsnInfo | null {
  if (!reader || !ip) return null;
  try {
    const res = reader.asn(ip);
    if (typeof res.autonomousSystemNumber !== "number") return null;
    return {
      asn: res.autonomousSystemNumber,
      organization: res.autonomousSystemOrganization ?? "",
    };
  } catch {
    // Not found in DB, private/reserved range, or invalid IP.
    return null;
  }
}

/**
 * An ASN resolver. Everything that needs an ASN takes one of these rather than
 * importing `lookupAsn` directly, so a caller can hand the same memoised
 * resolver to every module involved in one request — and tests can inject a
 * fake without the MaxMind DB.
 */
export type AsnLookup = (ip: string) => AsnInfo | null;

/**
 * A per-request ASN resolver that answers each IP once.
 *
 * A single tracking request asks about the same handful of IPs from IP
 * resolution, identity bucketing, sticky re-attachment, exclusion matching and
 * bot detection. The reader is an in-memory mmdb, so each lookup is cheap, but
 * repeating it several times per event on the hot ingestion path is pure waste.
 * Memoise for the life of one request only — never longer, since the DB is
 * reloaded in place.
 */
export function createAsnLookup(lookup: AsnLookup = lookupAsn): AsnLookup {
  const resolved = new Map<string, AsnInfo | null>();

  return ip => {
    const cached = resolved.get(ip);
    if (cached !== undefined) return cached;

    const info = lookup(ip);
    resolved.set(ip, info);
    return info;
  };
}
