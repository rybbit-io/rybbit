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
   * Get site by either siteId or id
   */
  private async getSiteByAnyId(siteIdOrId: string | number): Promise<SiteConfigData | undefined> {
    const cacheKey = this.getCacheKey(siteIdOrId);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    try {
      const site = await this.findSiteByIdentifier(siteIdOrId);

      if (!site) {
        return undefined;
      }

      const configData: SiteConfigData = {
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

      this.cache.set(cacheKey, {
        data: configData,
        expires: Date.now() + this.cacheTTL,
      });

      return configData;
    } catch (error) {
      logger.error(error as Error, `Error fetching site configuration for ${siteIdOrId}`);
      return undefined;
    }
  }

  /**
   * Get the full site configuration
   */
  async getConfig(siteIdOrId?: string | number): Promise<SiteConfigData | undefined> {
    if (!siteIdOrId) return undefined;
    return this.getSiteByAnyId(siteIdOrId);
  }

  invalidate(site: Pick<SiteConfigData, "id" | "siteId">): void {
    const identifiers: Array<string | number | null> = [site.siteId, String(site.siteId), site.id];

    for (const identifier of identifiers) {
      if (identifier !== null) {
        this.cache.delete(this.getCacheKey(identifier));
      }
    }
  }
}

// Singleton instance
export const siteConfig = new SiteConfig();
