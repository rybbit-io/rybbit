import type { Asn } from "@maxmind/geoip2-node";
import { Reader } from "@maxmind/geoip2-node";
import { readFile } from "fs/promises";
import path from "path";
import { logger } from "../../lib/logger/logger.js";

const dbPath = path.join(process.cwd(), "GeoLite2-ASN.mmdb");

interface AsnReader extends Reader {
  asn(ip: string): Asn;
}

let reader: AsnReader | null = null;

async function loadDatabase() {
  try {
    const buf = await readFile(dbPath);
    reader = Reader.openBuffer(buf) as AsnReader;
    logger.info("GeoIP ASN database loaded successfully");
  } catch (err) {
    logger.warn({ err, dbPath }, "GeoIP ASN database not loaded — ASN-based bot detection disabled");
    reader = null;
  }
}

await loadDatabase();

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
