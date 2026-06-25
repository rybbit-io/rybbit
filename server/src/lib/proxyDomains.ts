import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { sites } from "../db/postgres/schema.js";
import { createServiceLogger } from "./logger/logger.js";

const logger = createServiceLogger("proxy-domains");

/**
 * Lowercased set of hostnames that are active managed-proxy first-party hosts.
 *
 * A request arriving with one of these as its Host header is a proxied tracking
 * request: we rewrite its path from "/track" → "/api/track" (etc.) before routing so
 * the existing tracking handlers serve it unchanged (see the rewriteUrl hook in
 * index.ts). The set is refreshed periodically from Postgres and updated eagerly on
 * enable/disable, so a newly-enabled domain works without waiting a full refresh cycle.
 *
 * Each request-serving process maintains its own copy, mirroring the siteConfig cache.
 */
const proxyDomains = new Set<string>();
let refreshTimer: NodeJS.Timeout | null = null;
const REFRESH_INTERVAL_MS = 60 * 1000;

export function isProxyHost(host: string | undefined | null): boolean {
  if (!host) return false;
  // Strip any port and lowercase before comparing.
  const normalized = host.split(":")[0].toLowerCase();
  return proxyDomains.has(normalized);
}

export function addProxyDomain(host: string): void {
  proxyDomains.add(host.toLowerCase());
}

export function removeProxyDomain(host: string): void {
  proxyDomains.delete(host.toLowerCase());
}

export async function refreshProxyDomains(): Promise<void> {
  try {
    const rows = await db
      .select({ proxyDomain: sites.proxyDomain })
      .from(sites)
      .where(and(eq(sites.proxyEnabled, true), isNotNull(sites.proxyDomain)));

    // Rebuild from the DB snapshot. The query above is the only await; the swap below
    // is synchronous, so no request can observe a half-built set.
    proxyDomains.clear();
    for (const row of rows) {
      if (row.proxyDomain) {
        proxyDomains.add(row.proxyDomain.toLowerCase());
      }
    }
  } catch (error) {
    // Keep the previous set on failure rather than blanking it (which would break
    // tracking for every proxied site until the next successful refresh).
    logger.error(error as Error, "Failed to refresh proxy domains");
  }
}

export function startProxyDomainRefresh(): void {
  void refreshProxyDomains();
  if (!refreshTimer) {
    refreshTimer = setInterval(() => void refreshProxyDomains(), REFRESH_INTERVAL_MS);
    refreshTimer.unref?.();
  }
}

export function stopProxyDomainRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
