import { db } from "../db/postgres/postgres.js";
import { sites } from "../db/postgres/schema.js";
import { logger } from "./logger/logger.js";
import { matchesCIDR, matchesRange } from "./ipUtils.js";

// Site configuration interface
interface SiteConfigData {
  public: boolean;
  saltUserIds: boolean;
  domain: string;
  blockBots: boolean;
  excludedIPs: string[];
  apiKey?: string | null;
}

class SiteConfig {
  private siteConfigMap: Map<number, SiteConfigData> = new Map();
  private initialized: boolean = false;

  async loadSiteConfigs() {
    try {
      const allSites = await db
        .select({
          siteId: sites.siteId,
          public: sites.public,
          saltUserIds: sites.saltUserIds,
          domain: sites.domain,
          blockBots: sites.blockBots,
          excludedIPs: sites.excludedIPs,
          apiKey: sites.apiKey,
        })
        .from(sites);

      // Reset the map
      this.siteConfigMap.clear();

      // Populate the map with site IDs and their configuration
      for (const site of allSites) {
        this.siteConfigMap.set(site.siteId, {
          public: site.public || false,
          saltUserIds: site.saltUserIds || false,
          domain: site.domain || "",
          blockBots: site.blockBots === undefined ? true : site.blockBots,
          excludedIPs: Array.isArray(site.excludedIPs) ? site.excludedIPs : [],
          apiKey: site.apiKey,
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error("Error loading site configurations:", error);
      this.initialized = false;
    }
  }

  /**
   * Check if a site is public without hitting the database
   */
  isSitePublic(siteId: string | number): boolean {
    const numericSiteId = Number(siteId);
    const config = this.siteConfigMap.get(numericSiteId);
    return config?.public || false;
  }

  /**
   * Check if a site has user ID salting enabled
   */
  shouldSaltUserIds(siteId: string | number): boolean {
    const numericSiteId = Number(siteId);
    const config = this.siteConfigMap.get(numericSiteId);
    return config?.saltUserIds || false;
  }

  /**
   * Check if a site has bot blocking enabled
   */
  shouldBlockBots(siteId: string | number): boolean {
    const numericSiteId = Number(siteId);
    const config = this.siteConfigMap.get(numericSiteId);
    // Default to true if configuration is not found (safeguard)
    return config?.blockBots !== false;
  }

  /**
   * Get the domain of a site
   */
  getSiteDomain(siteId: string | number): string {
    const numericSiteId = Number(siteId);
    const config = this.siteConfigMap.get(numericSiteId);
    return config?.domain || "";
  }

  /**
   * Get the full site configuration
   */
  getSiteConfig(siteId: string | number): SiteConfigData | undefined {
    const numericSiteId = Number(siteId);
    return this.siteConfigMap.get(numericSiteId);
  }

  /**
   * Update the public status of a site in the cache
   */
  updateSitePublicStatus(siteId: number, isPublic: boolean): void {
    const config = this.siteConfigMap.get(siteId);
    if (!config) {
      return;
    }
    config.public = isPublic;
    this.siteConfigMap.set(siteId, config);
  }

  /**
   * Update the salt user IDs setting of a site in the cache
   */
  updateSiteSaltSetting(siteId: number, saltUserIds: boolean): void {
    const config = this.siteConfigMap.get(siteId);
    if (!config) {
      return;
    }
    config.saltUserIds = saltUserIds;
    this.siteConfigMap.set(siteId, config);
  }

  /**
   * Update the bot blocking setting of a site in the cache
   */
  updateSiteBlockBotsSetting(siteId: number, blockBots: boolean): void {
    const config = this.siteConfigMap.get(siteId);
    if (!config) {
      return;
    }
    config.blockBots = blockBots;
    this.siteConfigMap.set(siteId, config);
  }

  /**
   * Update the domain of a site in the cache
   */
  updateSiteDomain(siteId: number, domain: string): void {
    const config = this.siteConfigMap.get(siteId);
    if (!config) {
      return;
    }
    config.domain = domain;
    this.siteConfigMap.set(siteId, config);
  }

  /**
   * Update the API key of a site in the cache
   */
  updateSiteApiKey(siteId: number, apiKey: string | null): void {
    const config = this.siteConfigMap.get(siteId);
    if (config) {
      config.apiKey = apiKey;
      this.siteConfigMap.set(siteId, config);
    }
  }

  /**
   * Get excluded IPs for a site
   */
  getExcludedIPs(siteId: string | number): string[] {
    const numericSiteId = Number(siteId);
    const config = this.siteConfigMap.get(numericSiteId);
    return config?.excludedIPs || [];
  }

  /**
   * Update the excluded IPs of a site in the cache
   */
  updateSiteExcludedIPs(siteId: number, excludedIPs: string[]): void {
    const config = this.siteConfigMap.get(siteId);
    if (config) {
      config.excludedIPs = excludedIPs;
      this.siteConfigMap.set(siteId, config);
    }
  }

  /**
   * Add a new site to the cache
   */
  addSite(siteId: number, config: SiteConfigData): void {
    this.siteConfigMap.set(siteId, config);
  }

  /**
   * Remove a site from the cache
   */
  removeSite(siteId: number): void {
    this.siteConfigMap.delete(siteId);
  }

  /**
   * Ensure the cache is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.loadSiteConfigs();
    }
  }

  /**
   * Check if an IP address matches any of the excluded IPs/ranges
   */
  isIPExcluded(ipAddress: string, siteId: string | number): boolean {
    const excludedIPs = this.getExcludedIPs(siteId);
    if (!excludedIPs || excludedIPs.length === 0) {
      return false;
    }

    for (const excludedPattern of excludedIPs) {
      if (this.matchesIPPattern(ipAddress, excludedPattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an IP address matches a specific pattern
   * Supports:
   * - Single IP: 192.168.1.1, 2001:db8::1
   * - CIDR notation: 192.168.1.0/24, 2001:db8::/32
   * - Range notation: 192.168.1.1-192.168.1.10 (IPv4 only, IPv6 ranges not supported)
   */
  private matchesIPPattern(ipAddress: string, pattern: string): boolean {
    try {
      const trimmedPattern = pattern.trim();

      // Single IP match
      if (!trimmedPattern.includes("/") && !trimmedPattern.includes("-")) {
        return ipAddress === trimmedPattern;
      }

      // CIDR notation
      if (trimmedPattern.includes("/")) {
        return matchesCIDR(ipAddress, trimmedPattern);
      }

      // Range notation
      if (trimmedPattern.includes("-")) {
        return matchesRange(ipAddress, trimmedPattern);
      }

      return false;
    } catch (error) {
      logger.warn(error as Error, `Invalid IP pattern: ${pattern}`);
      return false;
    }
  }

}

// Singleton instance
export const siteConfig = new SiteConfig();
