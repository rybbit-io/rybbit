import {
  emailAppIds,
  getMediumType,
  getSourceType,
  isMobileAppId,
  isPaidTraffic,
  // New imports for expanded categories
  newsAppIds,
  productivityAppIds,
  searchAppIds,
  shoppingAppIds,
  socialAppIds,
  videoAppIds,
} from "./const.js";
import { getUTMParams } from "./utils.js";

// Categorize mobile app by its bundle ID/package name
function getMobileAppCategory(appId: string): { type: string; isPaid: boolean } | null {
  const appIdLower = appId.toLowerCase();

  // Check against our defined app ID lists
  if (socialAppIds.some(id => appIdLower.includes(id))) {
    return { type: "Organic Social", isPaid: false };
  }

  if (videoAppIds.some(id => appIdLower.includes(id))) {
    return { type: "Organic Video", isPaid: false };
  }

  if (searchAppIds.some(id => appIdLower.includes(id))) {
    return { type: "Organic Search", isPaid: false };
  }

  if (emailAppIds.some(id => appIdLower.includes(id))) {
    return { type: "Email", isPaid: false };
  }

  if (shoppingAppIds.some(id => appIdLower.includes(id))) {
    return { type: "Organic Shopping", isPaid: false };
  }

  if (newsAppIds.some(id => appIdLower.includes(id))) {
    return { type: "News", isPaid: false };
  }

  if (productivityAppIds.some(id => appIdLower.includes(id))) {
    return { type: "Productivity", isPaid: false };
  }

  return null;
}

function getDomainFromReferrer(referrer: string): string {
  if (!referrer) return "$direct";

  try {
    const url = new URL(referrer);
    return url.hostname;
  } catch (e) {
    // Handle invalid URLs
    return "$direct";
  }
}

// Checks if the referrer is from the same site as the current hostname
function isSelfReferral(referringDomain: string, hostname: string): boolean {
  if (!referringDomain || !hostname) return false;

  // Handle subdomain variations
  // Strip 'www.' prefixes for both domains
  const stripWww = (domain: string) => domain.replace(/^www\./, "");
  const refDomain = stripWww(referringDomain);
  const currentDomain = stripWww(hostname);

  // Check if domains match or if referrer is a subdomain of current domain
  return refDomain === currentDomain || refDomain.endsWith("." + currentDomain);
}

/**
 * Get detailed channel analysis including source type, medium type, and paid status
 *
 * @example
 * ```typescript
 * const details = getChannelDetails(
 *   "https://google.com/search?q=example",
 *   "utm_source=google&utm_medium=cpc&utm_campaign=brand"
 * );
 * // Returns:
 * // {
 * //   channel: "Paid Search",
 * //   sourceType: "search",
 * //   mediumType: "cpc",
 * //   isPaid: true,
 * //   isMobile: false,
 * //   details: { source: "google", medium: "cpc", campaign: "brand", referringDomain: "google.com" }
 * // }
 * ```
 */
function getChannelDetails(
  referrer: string,
  querystring: string,
  hostname?: string
): {
  channel: string;
  sourceType: string;
  mediumType: string;
  isPaid: boolean;
  isMobile: boolean;
  details: {
    source: string;
    medium: string;
    campaign: string;
    referringDomain: string;
  };
} {
  const utmParams = getUTMParams(querystring);
  const referringDomain = getDomainFromReferrer(referrer);

  const utmSource = utmParams["utm_source"] || "";
  const utmMedium = utmParams["utm_medium"] || "";
  const utmCampaign = utmParams["utm_campaign"] || "";

  const channel = getChannel(referrer, querystring, hostname);
  const sourceType = getSourceType(utmSource || referringDomain);
  const mediumType = getMediumType(utmMedium);
  const isPaid =
    isPaidTraffic(utmMedium, utmSource) || utmParams["gclid"] !== undefined || utmParams["gad_source"] !== undefined;
  const isMobile = utmSource ? isMobileAppId(utmSource) : false;

  return {
    channel,
    sourceType,
    mediumType,
    isPaid,
    isMobile,
    details: {
      source: utmSource || referringDomain,
      medium: utmMedium,
      campaign: utmCampaign,
      referringDomain,
    },
  };
}

export function getChannel(referrer: string, querystring: string, hostname?: string): string {
  const utmParams = getUTMParams(querystring);
  const referringDomain = getDomainFromReferrer(referrer);

  // Check if this is a self-referral (internal navigation)
  const selfReferral = hostname ? isSelfReferral(referringDomain, hostname) : false;

  // UTM parameters
  const utmSource = utmParams["utm_source"] || "";
  const utmMedium = utmParams["utm_medium"] || "";
  const utmCampaign = utmParams["utm_campaign"] || "";
  const gclid = utmParams["gclid"] || "";
  const gadSource = utmParams["gad_source"] || "";

  // Check for mobile app sources using reverse DNS format (bundle IDs/package names)
  if (utmSource && isMobileAppId(utmSource)) {
    const appCategory = getMobileAppCategory(utmSource);
    if (appCategory) {
      return appCategory.isPaid ? "Paid " + appCategory.type.split(" ")[1] : appCategory.type;
    }
  }

  // If it's a self-referral and has no UTM parameters, treat it as internal traffic
  if (!referrer && !utmSource && !utmMedium && !utmCampaign && !gclid && !gadSource) {
    return selfReferral ? "Internal" : "Direct";
  }

  // Use utility functions for better categorization
  const sourceType = getSourceType(utmSource || referringDomain);
  const mediumType = getMediumType(utmMedium);
  const isPaid = isPaidTraffic(utmMedium, utmSource) || gclid !== "" || gadSource !== "";

  // Apply channel detection logic (in order of precedence)

  // Cross Network
  if (utmCampaign === "cross-network") return "Cross-Network";

  // Direct traffic
  if (
    (referringDomain === "$direct" || (!referrer && !selfReferral)) &&
    !utmMedium &&
    (!utmSource || utmSource === "direct" || utmSource === "(direct)")
  ) {
    return "Direct";
  }

  // Paid channels - use intelligent categorization
  if (isPaid) {
    switch (sourceType) {
      case "search":
        return "Paid Search";
      case "social":
        return "Paid Social";
      case "video":
        return "Paid Video";
      case "shopping":
        return "Paid Shopping";
      default:
        // Fall back to medium-based detection for paid traffic
        switch (mediumType) {
          case "social":
            return "Paid Social";
          case "video":
            return "Paid Video";
          case "display":
          case "cpm":
            return "Display";
          case "cpc":
            return "Paid Search";
          case "influencer":
            return "Paid Influencer";
          case "audio":
            return "Paid Audio";
          default:
            return "Paid Unknown";
        }
    }
  }

  // Organic channels - prioritize source type detection
  switch (sourceType) {
    case "search":
      return "Organic Search";
    case "social":
      return "Organic Social";
    case "video":
      return "Organic Video";
    case "shopping":
      return "Organic Shopping";
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "news":
      return "News";
    case "productivity":
      return "Productivity";
  }

  // Medium-based detection for organic traffic
  switch (mediumType) {
    case "social":
      return "Organic Social";
    case "video":
      return "Organic Video";
    case "affiliate":
      return "Affiliate";
    case "referral":
      return "Referral";
    case "display":
      return "Display";
    case "audio":
      return "Audio";
    case "push":
      return "Push";
    case "influencer":
      return "Influencer";
    case "content":
      return "Content";
    case "event":
      return "Event";
    case "email":
      return "Email";
  }

  // Campaign-based detection as fallback
  if (/video/.test(utmCampaign)) return "Organic Video";
  if (/shop|shopping/.test(utmCampaign)) return "Organic Shopping";
  if (/influencer|creator|sponsored/.test(utmCampaign)) return "Influencer";
  if (/event|conference|webinar/.test(utmCampaign)) return "Event";
  if (/social|facebook|twitter|instagram|linkedin/.test(utmCampaign)) return "Organic Social";

  // If referring domain exists but we couldn't categorize it
  // Don't mark as referral if it's a self-referral
  if (referringDomain && referringDomain !== "$direct" && !selfReferral) return "Referral";

  // Default fallback
  return "Unknown";
}
