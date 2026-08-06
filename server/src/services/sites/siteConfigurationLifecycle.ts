import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getSubscriptionInner } from "../../api/stripe/getSubscription.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import { validateIPPattern } from "../../lib/ipUtils.js";
import { siteConfig, type SiteConfigData } from "../../lib/siteConfig.js";

type SiteRow = typeof sites.$inferSelect;
type SiteInsert = typeof sites.$inferInsert;
type SiteType = "web" | "mobile";

export type CreateSiteInput = {
  organizationId: string;
  createdBy?: string;
  domain: string;
  name: string;
  type?: SiteType | null;
  public?: boolean;
  saltUserIds?: boolean;
  blockBots?: boolean;
  excludedIPs?: string[];
  excludedCountries?: string[];
  sessionReplay?: boolean;
  webVitals?: boolean;
  trackErrors?: boolean;
  trackOutbound?: boolean;
  trackUrlParams?: boolean;
  trackInitialPageView?: boolean;
  trackSpaNavigation?: boolean;
  trackIp?: boolean;
  trackButtonClicks?: boolean;
  trackCopy?: boolean;
  trackFormInteractions?: boolean;
  tags?: string[];
};

export type UpdateSiteConfigurationInput = {
  name?: string;
  type?: SiteType | null;
  public?: boolean;
  embedEnabled?: boolean;
  saltUserIds?: boolean;
  blockBots?: boolean;
  firstPartyProxy?: boolean;
  domain?: string;
  excludedIPs?: string[];
  excludedCountries?: string[];
  excludedPaths?: string[];
  excludedHostnames?: string[];
  excludedUserAgents?: string[];
  excludedASNs?: string[];
  excludedQueryParams?: string[];
  tags?: string[];
  sessionReplay?: boolean;
  webVitals?: boolean;
  trackErrors?: boolean;
  trackOutbound?: boolean;
  trackUrlParams?: boolean;
  trackInitialPageView?: boolean;
  trackSpaNavigation?: boolean;
  trackIp?: boolean;
  trackButtonClicks?: boolean;
  trackCopy?: boolean;
  trackFormInteractions?: boolean;
};

export type SiteLifecycleErrorCode =
  | "invalid_site_id"
  | "invalid_web_domain"
  | "invalid_mobile_identifier"
  | "mobile_feature_not_supported"
  | "organization_not_found"
  | "replay_not_entitled"
  | "standard_features_not_entitled"
  | "site_limit_reached"
  | "site_not_found"
  | "invalid_ip_patterns"
  | "empty_update"
  | "domain_conflict";

export class SiteLifecycleError extends Error {
  constructor(
    readonly code: SiteLifecycleErrorCode,
    readonly statusCode: 400 | 403 | 404 | 409,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "SiteLifecycleError";
  }
}

const DOMAIN_PATTERN = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+\p{L}{2,}$/u;
const APP_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,252}$/;
const STANDARD_FEATURES = [
  "webVitals",
  "trackErrors",
  "trackButtonClicks",
  "trackCopy",
  "trackFormInteractions",
] as const;
const DIRECT_UPDATE_FIELDS = [
  "name",
  "public",
  "embedEnabled",
  "saltUserIds",
  "blockBots",
  "firstPartyProxy",
  "excludedIPs",
  "excludedCountries",
  "excludedPaths",
  "excludedHostnames",
  "excludedUserAgents",
  "excludedASNs",
  "excludedQueryParams",
  "tags",
  "sessionReplay",
  "webVitals",
  "trackErrors",
  "trackOutbound",
  "trackUrlParams",
  "trackInitialPageView",
  "trackSpaNavigation",
  "trackIp",
  "trackButtonClicks",
  "trackCopy",
  "trackFormInteractions",
] as const satisfies ReadonlyArray<keyof UpdateSiteConfigurationInput>;

function normalizeSiteType(type: SiteType | null | undefined): SiteType {
  return type === "mobile" ? "mobile" : "web";
}

function normalizeDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function validateSiteIdentity(type: SiteType, domain: string): void {
  if (type === "web" && !DOMAIN_PATTERN.test(domain)) {
    throw new SiteLifecycleError(
      "invalid_web_domain",
      400,
      "Invalid domain format. Must be a valid domain like example.com or sub.example.com"
    );
  }

  if (type === "mobile" && !APP_IDENTIFIER_PATTERN.test(domain)) {
    throw new SiteLifecycleError(
      "invalid_mobile_identifier",
      400,
      "Invalid app identifier. Use a bundle/package identifier like com.example.app"
    );
  }
}

function validateMobileFeatures(type: SiteType, input: Pick<CreateSiteInput, "sessionReplay" | "webVitals">): void {
  if (type === "mobile" && (input.sessionReplay || input.webVitals)) {
    throw new SiteLifecycleError(
      "mobile_feature_not_supported",
      400,
      "Session replay and Web Vitals are only available for web sites"
    );
  }
}

function validateSiteId(siteId: number): void {
  if (!Number.isInteger(siteId) || siteId <= 0) {
    throw new SiteLifecycleError("invalid_site_id", 400, "Invalid site ID: must be a positive integer");
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    (typeof error === "object" && error !== null && "code" in error && error.code === "23505") ||
    String(error).includes("duplicate key value violates unique constraint")
  );
}

class SiteConfigurationLifecycle {
  private async findSite(siteId: number): Promise<SiteRow> {
    validateSiteId(siteId);

    const site = await db.query.sites.findFirst({
      where: eq(sites.siteId, siteId),
    });

    if (!site) {
      throw new SiteLifecycleError("site_not_found", 404, "Site not found");
    }

    return site;
  }

  async create(input: CreateSiteInput): Promise<SiteRow> {
    const siteType = normalizeSiteType(input.type);
    const domain = normalizeDomain(input.domain);

    validateSiteIdentity(siteType, domain);
    validateMobileFeatures(siteType, input);

    if (IS_CLOUD) {
      const subscription = await getSubscriptionInner(input.organizationId);

      if (!subscription) {
        throw new SiteLifecycleError("organization_not_found", 404, "Organization not found");
      }

      if (input.sessionReplay && !subscription.includesReplay) {
        throw new SiteLifecycleError("replay_not_entitled", 403, "Session replay requires a Pro subscription");
      }

      const requestedStandardFeatures = STANDARD_FEATURES.filter(feature => input[feature]);
      const hasActiveSubscription = subscription.status === "active" || subscription.status === "trialing";
      if (requestedStandardFeatures.length > 0 && !hasActiveSubscription) {
        throw new SiteLifecycleError(
          "standard_features_not_entitled",
          403,
          `The following features require an active subscription: ${requestedStandardFeatures.join(", ")}`
        );
      }

      const siteLimit = subscription.siteLimit ?? null;
      if (siteLimit !== null) {
        const existingSites = await db
          .select({ siteId: sites.siteId })
          .from(sites)
          .where(eq(sites.organizationId, input.organizationId));

        if (existingSites.length >= siteLimit) {
          throw new SiteLifecycleError(
            "site_limit_reached",
            403,
            `You have reached the limit of ${siteLimit} website${siteLimit === 1 ? "" : "s"} for your plan. Please upgrade to add more.`
          );
        }
      }
    }

    try {
      const [createdSite] = await db
        .insert(sites)
        .values({
          id: randomBytes(6).toString("hex"),
          type: siteType === "web" ? null : siteType,
          domain,
          name: input.name,
          createdBy: input.createdBy,
          organizationId: input.organizationId,
          public: input.public ?? false,
          saltUserIds: input.saltUserIds ?? false,
          blockBots: input.blockBots ?? true,
          ...(input.excludedIPs !== undefined && { excludedIPs: input.excludedIPs }),
          ...(input.excludedCountries !== undefined && { excludedCountries: input.excludedCountries }),
          ...(input.sessionReplay !== undefined && { sessionReplay: input.sessionReplay }),
          ...(input.webVitals !== undefined && { webVitals: input.webVitals }),
          ...(input.trackErrors !== undefined && { trackErrors: input.trackErrors }),
          ...(input.trackOutbound !== undefined && { trackOutbound: input.trackOutbound }),
          ...(input.trackUrlParams !== undefined && { trackUrlParams: input.trackUrlParams }),
          ...(input.trackInitialPageView !== undefined && { trackInitialPageView: input.trackInitialPageView }),
          ...(input.trackSpaNavigation !== undefined && { trackSpaNavigation: input.trackSpaNavigation }),
          ...(input.trackIp !== undefined && { trackIp: input.trackIp }),
          ...(input.trackButtonClicks !== undefined && { trackButtonClicks: input.trackButtonClicks }),
          ...(input.trackCopy !== undefined && { trackCopy: input.trackCopy }),
          ...(input.trackFormInteractions !== undefined && { trackFormInteractions: input.trackFormInteractions }),
          ...(input.tags !== undefined && { tags: input.tags }),
        })
        .returning();

      if (!createdSite) {
        throw new Error("Site insert returned no row");
      }

      return createdSite;
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new SiteLifecycleError("domain_conflict", 409, "Domain already in use");
      }
      throw error;
    }
  }

  async update(siteId: number, input: UpdateSiteConfigurationInput): Promise<SiteConfigData> {
    const site = await this.findSite(siteId);
    const nextSiteType = normalizeSiteType(input.type === undefined ? site.type : input.type);
    const domain = normalizeDomain(input.domain ?? site.domain);

    if (input.domain !== undefined || input.type !== undefined) {
      validateSiteIdentity(nextSiteType, domain);
    }
    validateMobileFeatures(nextSiteType, input);

    if (IS_CLOUD && input.sessionReplay === true) {
      const subscription = site.organizationId ? await getSubscriptionInner(site.organizationId) : null;
      if (!subscription?.includesReplay) {
        throw new SiteLifecycleError("replay_not_entitled", 403, "Session replay requires a Pro plan");
      }
    }

    if (input.excludedIPs) {
      const validationErrors = input.excludedIPs.flatMap(ip => {
        const validation = validateIPPattern(ip);
        return validation.valid ? [] : [`${ip}: ${validation.error}`];
      });

      if (validationErrors.length > 0) {
        throw new SiteLifecycleError("invalid_ip_patterns", 400, "Invalid IP patterns", validationErrors);
      }
    }

    const updateData: Partial<SiteInsert> = {};
    for (const field of DIRECT_UPDATE_FIELDS) {
      const value = input[field];
      if (value !== undefined) {
        Object.assign(updateData, { [field]: value });
      }
    }

    if (input.type !== undefined) {
      updateData.type = nextSiteType === "web" ? null : nextSiteType;
    }
    if (input.domain !== undefined) {
      updateData.domain = domain;
    }
    if (nextSiteType === "mobile") {
      updateData.sessionReplay = false;
      updateData.webVitals = false;
    }

    if (Object.keys(updateData).length === 0) {
      throw new SiteLifecycleError("empty_update", 400, "No fields to update");
    }

    updateData.updatedAt = new Date().toISOString();

    try {
      await db.update(sites).set(updateData).where(eq(sites.siteId, siteId));
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new SiteLifecycleError("domain_conflict", 409, "Domain already in use");
      }
      throw error;
    }

    siteConfig.invalidate(site);
    const updatedConfig = await siteConfig.getConfig(siteId);
    if (!updatedConfig) {
      throw new Error(`Updated Site ${siteId} could not be reloaded`);
    }

    return updatedConfig;
  }

  async updatePrivateLink(
    siteId: number,
    action: "generate_private_link_key" | "revoke_private_link_key"
  ): Promise<string | null> {
    const site = await this.findSite(siteId);
    const privateLinkKey = action === "generate_private_link_key" ? randomBytes(6).toString("hex") : null;

    await db.update(sites).set({ privateLinkKey }).where(eq(sites.siteId, siteId));
    siteConfig.invalidate(site);

    return privateLinkKey;
  }

  async delete(siteId: number): Promise<void> {
    const site = await this.findSite(siteId);

    await Promise.all([
      clickhouse.command({
        query: "DELETE FROM session_replay_events WHERE site_id = {id:UInt32}",
        query_params: { id: siteId },
      }),
      clickhouse.command({
        query: "DELETE FROM session_replay_metadata WHERE site_id = {id:UInt32}",
        query_params: { id: siteId },
      }),
    ]);

    await db.delete(sites).where(eq(sites.siteId, siteId));
    siteConfig.invalidate(site);
  }
}

export const siteConfigurationLifecycle = new SiteConfigurationLifecycle();
