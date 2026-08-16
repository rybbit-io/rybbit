import { eq, type SQL } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { sites } from "../db/postgres/schema.js";
import { logger } from "./logger/logger.js";

// Site configuration interface
export interface SiteConfigData {
  id: string | null;
  siteId: number;
  type: "web" | "mobile";
  public: boolean;
  embedEnabled: boolean;
  saltUserIds: boolean;
  domain: string;
  blockBots: boolean;
  firstPartyProxy: boolean;
  excludedIPs: string[];
  excludedCountries: string[];
  excludedPaths: string[];
  excludedHostnames: string[];
  excludedUserAgents: string[];
  excludedASNs: string[];
  excludedQueryParams: string[];
  privateLinkKey?: string | null;
  sessionReplay: boolean;
  webVitals: boolean;
  trackErrors: boolean;
  trackOutbound: boolean;
  trackUrlParams: boolean;
  trackInitialPageView: boolean;
  trackSpaNavigation: boolean;
  trackIp: boolean;
  trackButtonClicks: boolean;
  trackCopy: boolean;
  trackFormInteractions: boolean;
  tags: string[];
}

type SiteConfigRow = typeof sites.$inferSelect;

// A Site is reachable under several identifier spellings — its text id, its
// numeric siteId, and (because a digit-only string falls back to siteId) any
// zero-padded rendering of that number. The route guards resolve whatever the
// caller put in the URL, before authentication, so the key space is attacker-
// controlled and the cache has to be bounded rather than merely expiring.
const MAX_CACHE_ENTRIES = 10_000;

class SiteConfig {
  private cache = new Map<string, { data: SiteConfigData; expires: number }>();
  private cacheTTL = 60 * 1000; // 1 minute TTL

  /**
   * Helper to determine if the input can be interpreted as a legacy numeric siteId
   */
  private isNumericId(id: string | number): boolean {
    if (typeof id === "number") {
      return Number.isInteger(id);
    }

    return /^\d+$/.test(id);
  }

  private getCacheKey(siteIdOrId: string | number): string {
    return `${typeof siteIdOrId}:${siteIdOrId}`;
  }

  private async querySiteConfig(where: SQL): Promise<SiteConfigRow | undefined> {
    const [site] = await db.select().from(sites).where(where).limit(1);

    return site;
  }

  private async findSiteByIdentifier(siteIdOrId: string | number): Promise<SiteConfigRow | undefined> {
    if (typeof siteIdOrId === "number") {
      return Number.isInteger(siteIdOrId) ? this.querySiteConfig(eq(sites.siteId, siteIdOrId)) : undefined;
    }

    const siteByExactId = await this.querySiteConfig(eq(sites.id, siteIdOrId));
    if (siteByExactId || !this.isNumericId(siteIdOrId)) {
      return siteByExactId;
    }

    return this.querySiteConfig(eq(sites.siteId, Number(siteIdOrId)));
  }

  /**
   * Read the row and apply the field defaults. Every read of a tracking-relevant
   * Site field goes through here, so a caller can never see the raw column where
   * this would have supplied a default (`blockBots` being the sharp one: the
   * column is nullable, the configuration is `true`).
   *
   * Throws if Postgres does. `getConfig` swallows that into `undefined` because
   * ingestion must not fail on a database blip; `reload` lets it out so an admin
   * read answers 500 rather than claiming the Site does not exist.
   */
  private async loadSiteConfig(siteIdOrId: string | number): Promise<SiteConfigData | undefined> {
    const site = await this.findSiteByIdentifier(siteIdOrId);

    if (!site) {
      return undefined;
    }

    return {
      id: site.id,
      siteId: site.siteId,
      type: site.type || "web",
      public: site.public || false,
      embedEnabled: site.embedEnabled || false,
      saltUserIds: site.saltUserIds || false,
      domain: site.domain || "",
      blockBots: site.blockBots === undefined ? true : site.blockBots,
      firstPartyProxy: site.firstPartyProxy || false,
      excludedIPs: Array.isArray(site.excludedIPs) ? site.excludedIPs : [],
      excludedCountries: Array.isArray(site.excludedCountries) ? site.excludedCountries : [],
      excludedPaths: Array.isArray(site.excludedPaths) ? site.excludedPaths : [],
      excludedHostnames: Array.isArray(site.excludedHostnames) ? site.excludedHostnames : [],
      excludedUserAgents: Array.isArray(site.excludedUserAgents) ? site.excludedUserAgents : [],
      excludedASNs: Array.isArray(site.excludedASNs) ? site.excludedASNs : [],
      excludedQueryParams: Array.isArray(site.excludedQueryParams) ? site.excludedQueryParams : [],
      privateLinkKey: site.privateLinkKey,
      sessionReplay: site.sessionReplay || false,
      webVitals: site.webVitals || false,
      trackErrors: site.trackErrors || false,
      trackOutbound: site.trackOutbound ?? true,
      trackUrlParams: site.trackUrlParams ?? true,
      trackInitialPageView: site.trackInitialPageView ?? true,
      trackSpaNavigation: site.trackSpaNavigation ?? true,
      trackIp: site.trackIp || false,
      trackButtonClicks: site.trackButtonClicks || false,
      trackCopy: site.trackCopy || false,
      trackFormInteractions: site.trackFormInteractions || false,
      tags: Array.isArray(site.tags) ? site.tags : [],
    };
  }

  private cacheConfig(siteIdOrId: string | number, configData: SiteConfigData): void {
    this.cache.set(this.getCacheKey(siteIdOrId), {
      data: configData,
      expires: Date.now() + this.cacheTTL,
    });
    this.evictIfOverCapacity();
  }

  private evictIfOverCapacity(): void {
    if (this.cache.size <= MAX_CACHE_ENTRIES) return;

    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expires <= now) {
        this.cache.delete(key);
      }
    }

    // Still over after sweeping the expired: shed in insertion order.
    for (const key of this.cache.keys()) {
      if (this.cache.size <= MAX_CACHE_ENTRIES) break;
      this.cache.delete(key);
    }
  }

  /**
   * Get site by either siteId or id
   */
  private async getSiteByAnyId(siteIdOrId: string | number): Promise<SiteConfigData | undefined> {
    const cached = this.cache.get(this.getCacheKey(siteIdOrId));

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const configData = await this.loadSiteConfig(siteIdOrId);

    if (configData) {
      this.cacheConfig(siteIdOrId, configData);
    }

    return configData;
  }

  /**
   * Get the full site configuration, served from the cache when it is warm.
   *
   * Never throws: ingestion reads this per event and must degrade to "no
   * configuration" rather than fail on a Postgres blip.
   */
  async getConfig(siteIdOrId?: string | number): Promise<SiteConfigData | undefined> {
    if (!siteIdOrId) return undefined;

    try {
      return await this.getSiteByAnyId(siteIdOrId);
    } catch (error) {
      logger.error(error as Error, `Error fetching site configuration for ${siteIdOrId}`);
      return undefined;
    }
  }

  /**
   * Get the full site configuration, always from Postgres.
   *
   * The cache is invalidated on write, but only in the process that served the
   * write — under `CLUSTER_WORKERS` a sibling worker can still be holding the
   * pre-write value for up to the TTL. Settings screens read their own writes
   * back immediately, so they use this; the ingestion path, which tolerates a
   * minute of staleness, uses `getConfig`. Either way the read is the module's,
   * and the fresh row repopulates the cache for everyone behind it.
   *
   * Throws when Postgres does, so the caller can tell "no such Site" from "could
   * not ask".
   */
  async reload(siteIdOrId?: string | number): Promise<SiteConfigData | undefined> {
    if (!siteIdOrId) return undefined;

    const configData = await this.loadSiteConfig(siteIdOrId);

    if (!configData) {
      // The Site is gone (or was never there). Anything we were still holding
      // for it is stale, and the cached entry is the only record of the other
      // identifiers it answered to.
      const cacheKey = this.getCacheKey(siteIdOrId);
      const stale = this.cache.get(cacheKey);
      if (stale) {
        this.invalidate(stale.data);
      }
      this.cache.delete(cacheKey);
      return undefined;
    }

    // Drop every spelling's stale entry, then re-seat the ones this row is
    // unambiguously the answer for. `String(siteId)` is not among them: a
    // digit-only string resolves against `sites.id` first, so another Site could
    // legitimately own that key — it stays evicted and re-resolves on demand.
    this.invalidate(configData);
    this.cacheConfig(configData.siteId, configData);
    if (configData.id !== null) {
      this.cacheConfig(configData.id, configData);
    }
    this.cacheConfig(siteIdOrId, configData);

    return configData;
  }

  /**
   * Resolve any Site identifier — text id or legacy numeric siteId — to the
   * numeric siteId. Shares the configuration cache, so the route guards and the
   * ingestion path warm each other rather than keeping separate tables.
   */
  async resolveSiteId(siteIdOrId?: string | number): Promise<number | null> {
    const config = await this.getConfig(siteIdOrId);
    return config?.siteId ?? null;
  }

  /**
   * Drop everything cached for one Site.
   *
   * Enumerating the identifier spellings would miss the zero-padded ones, so
   * this matches on the cached row's own identity instead — the cache is
   * bounded, and writes are rare next to reads.
   */
  invalidate(site: Pick<SiteConfigData, "id" | "siteId">): void {
    for (const [key, entry] of this.cache) {
      if (entry.data.siteId === site.siteId || (site.id !== null && entry.data.id === site.id)) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const siteConfig = new SiteConfig();
