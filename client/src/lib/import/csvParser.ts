import Papa from "papaparse";
import { DateTime } from "luxon";
import { authedFetch } from "@/api/utils";
import { ImportPlatform } from "@/types/import";

interface UmamiEvent {
  session_id: string;
  hostname: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  language: string;
  country: string;
  region: string;
  city: string;
  url_path: string;
  url_query: string;
  referrer_path: string;
  referrer_domain: string;
  page_title: string;
  event_type: string;
  event_name: string;
  distinct_id: string;
  created_at: string;
}

interface SimpleAnalyticsEvent {
  added_iso: string;
  country_code: string;
  datapoint: string;
  document_referrer: string;
  hostname: string;
  lang_language: string;
  lang_region: string;
  path: string;
  query: string;
  screen_height: string;
  screen_width: string;
  session_id: string;
  user_agent: string;
  uuid: string;
}

interface MatomoEvent {
  idVisit: string;
  visitorId: string;
  userId: string;

  type: string;
  url: string;
  pageTitle: string;
  linkUrl: string;
  eventCategory: string;
  eventAction: string;
  eventName: string;
  eventValue: string;
  timestamp: string;

  referrerUrl: string;

  browserName: string;
  browserVersion: string;
  operatingSystemName: string;
  operatingSystemVersion: string;
  deviceType: string;

  languageCode: string;
  countryCode: string;
  regionCode: string;
  city: string;
  latitude: string;
  longitude: string;
  resolution: string;
}

// Matomo action types with a Rybbit equivalent. Goals, ecommerce and content
// interactions have none and are skipped.
const MATOMO_ACTION_TYPES = new Set(["action", "search", "outlink", "download", "event"]);

// Matomo strips campaign parameters from the URLs it stores, but Rybbit reads
// campaigns from utm_* parameters, so they're rebuilt from the visit's columns.
function withMatomoCampaign(url: string, row: Record<string, string>): string {
  if (row.referrerType !== "campaign") {
    return url;
  }

  try {
    const existing = new URL(url).searchParams;
    const campaign = new URLSearchParams();
    const candidates: [string, string | undefined][] = [
      ["utm_campaign", row.campaignName || row.referrerName],
      ["utm_source", row.campaignSource],
      ["utm_medium", row.campaignMedium],
      ["utm_term", row.campaignKeyword || row.referrerKeyword],
      ["utm_content", row.campaignContent],
    ];
    for (const [key, value] of candidates) {
      if (value && !existing.has(key)) {
        campaign.set(key, value);
      }
    }

    const query = campaign.toString();
    if (!query) {
      return url;
    }

    const hashIndex = url.indexOf("#");
    const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
    return `${base}${base.includes("?") ? "&" : "?"}${query}${hash}`;
  } catch {
    return url;
  }
}

// Papa decodes each chunk of a file separately, so a byte order mark only
// reaches the first one and later chunks fall back to UTF-8. Matomo exports
// UTF-16 by default, so the encoding has to be named up front.
async function detectUtf16Encoding(file: File): Promise<string | undefined> {
  try {
    const [first, second] = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    if (first === 0xff && second === 0xfe) {
      return "utf-16le";
    }
    if (first === 0xfe && second === 0xff) {
      return "utf-16be";
    }
  } catch {
    // Leave unreadable input to Papa's default decoding and error reporting
  }
  return undefined;
}

export class CsvParser {
  private cancelled: boolean = false;
  private readonly siteId: number;
  private readonly importId: string;
  private readonly platform: ImportPlatform;
  private readonly earliestAllowedDate: DateTime;
  private readonly latestAllowedDate: DateTime;

  constructor(
    siteId: number,
    importId: string,
    platform: ImportPlatform,
    earliestAllowedDate: string,
    latestAllowedDate: string
  ) {
    this.siteId = siteId;
    this.importId = importId;
    this.platform = platform;
    this.earliestAllowedDate = DateTime.fromFormat(earliestAllowedDate, "yyyy-MM-dd", { zone: "utc" }).startOf("day");
    this.latestAllowedDate = DateTime.fromFormat(latestAllowedDate, "yyyy-MM-dd", { zone: "utc" }).endOf("day");

    // Pre-validate dates during instantiation
    if (!this.earliestAllowedDate.isValid || !this.latestAllowedDate.isValid) {
      this.cancelled = true;
    }
  }

  async startImport(file: File): Promise<void> {
    if (this.cancelled) {
      return;
    }

    const encoding = await detectUtf16Encoding(file);

    Papa.parse(file, {
      encoding,
      header: true,
      skipEmptyLines: "greedy",
      worker: true,
      chunkSize: 5 * 1024 * 1024, // 5MB CSV chunks to stay under 10MB JSON limit
      chunk: async (results, parser) => {
        if (this.cancelled) {
          parser.abort();
          return;
        }

        try {
          if (this.platform === "umami") {
            const validEvents: UmamiEvent[] = [];
            for (const row of results.data) {
              const event = this.transformRow(row);
              if (event && this.isDateInRange((event as UmamiEvent).created_at)) {
                validEvents.push(event as UmamiEvent);
              }
            }
            if (validEvents.length > 0) {
              await this.uploadChunk(validEvents, false);
            }
          } else if (this.platform === "simple_analytics") {
            const validEvents: SimpleAnalyticsEvent[] = [];
            for (const row of results.data) {
              const event = this.transformRow(row);
              if (event && this.isDateInRange((event as SimpleAnalyticsEvent).added_iso)) {
                validEvents.push(event as SimpleAnalyticsEvent);
              }
            }
            if (validEvents.length > 0) {
              await this.uploadChunk(validEvents, false);
            }
          } else if (this.platform === "matomo") {
            const validEvents: MatomoEvent[] = [];
            for (const row of results.data) {
              // Unroll visit into individual events
              const events = this.unrollMatomoVisit(row as Record<string, string>);
              for (const event of events) {
                if (this.isDateInRange(event.timestamp, true)) {
                  validEvents.push(event);
                }
              }
            }
            if (validEvents.length > 0) {
              await this.uploadChunk(validEvents, false);
            }
          }
        } catch (error) {
          console.error("Error uploading chunk:", error);
          this.cancel();
          parser.abort();
        }
      },
      complete: async () => {
        if (this.cancelled) return;

        try {
          // Send final batch to mark import as complete
          await this.uploadChunk([], true);
        } catch (error) {
          console.error("Error completing import:", error);
        }
      },
      error: () => {
        if (this.cancelled) return;
        this.cancelled = true;
      },
    });
  }

  private isDateInRange(dateStr: string, isUnixTimestamp: boolean = false): boolean {
    // Handle Unix timestamp (Matomo), "yyyy-MM-dd HH:mm:ss" (Umami), and ISO (Simple Analytics)
    let createdAt: DateTime;

    if (isUnixTimestamp) {
      createdAt = DateTime.fromSeconds(parseInt(dateStr, 10), { zone: "utc" });
    } else {
      createdAt = DateTime.fromFormat(dateStr, "yyyy-MM-dd HH:mm:ss", { zone: "utc" });
      if (!createdAt.isValid) {
        createdAt = DateTime.fromISO(dateStr, { zone: "utc" });
      }
    }

    if (!createdAt.isValid) {
      return false;
    }

    if (createdAt < this.earliestAllowedDate) {
      return false;
    }

    if (createdAt > this.latestAllowedDate) {
      return false;
    }

    return true;
  }

  private transformRow(row: unknown): UmamiEvent | SimpleAnalyticsEvent | MatomoEvent | null {
    const rawEvent = row as Record<string, string>;

    if (this.platform === "umami") {
      const umamiEvent: UmamiEvent = {
        session_id: rawEvent.session_id,
        hostname: rawEvent.hostname,
        browser: rawEvent.browser,
        os: rawEvent.os,
        device: rawEvent.device,
        screen: rawEvent.screen,
        language: rawEvent.language,
        country: rawEvent.country,
        region: rawEvent.region,
        city: rawEvent.city,
        url_path: rawEvent.url_path,
        url_query: rawEvent.url_query,
        referrer_path: rawEvent.referrer_path,
        referrer_domain: rawEvent.referrer_domain,
        page_title: rawEvent.page_title,
        event_type: rawEvent.event_type,
        event_name: rawEvent.event_name,
        distinct_id: rawEvent.distinct_id,
        created_at: rawEvent.created_at,
      };

      if (!umamiEvent.created_at) {
        return null;
      }

      return umamiEvent;
    } else if (this.platform === "simple_analytics") {
      const simpleAnalyticsEvent: SimpleAnalyticsEvent = {
        added_iso: rawEvent.added_iso,
        country_code: rawEvent.country_code,
        datapoint: rawEvent.datapoint,
        document_referrer: rawEvent.document_referrer,
        hostname: rawEvent.hostname,
        lang_language: rawEvent.lang_language,
        lang_region: rawEvent.lang_region,
        path: rawEvent.path,
        query: rawEvent.query,
        screen_height: rawEvent.screen_height,
        screen_width: rawEvent.screen_width,
        session_id: rawEvent.session_id,
        user_agent: rawEvent.user_agent,
        uuid: rawEvent.uuid,
      };

      if (!simpleAnalyticsEvent.added_iso) {
        return null;
      }

      return simpleAnalyticsEvent;
    }

    return null;
  }

  // A Matomo export has one row per visit, with its actions flattened into
  // actionDetails_<n>_<field> columns; each supported action becomes an event.
  private unrollMatomoVisit(rawEvent: Record<string, string>): MatomoEvent[] {
    const events: MatomoEvent[] = [];

    // Find all action indices by scanning for actionDetails_N_* columns
    const actionIndices = new Set<number>();
    for (const key of Object.keys(rawEvent)) {
      const match = key.match(/^actionDetails_(\d+)_/);
      if (match) {
        actionIndices.add(parseInt(match[1], 10));
      }
    }
    const sortedIndices = Array.from(actionIndices).sort((a, b) => a - b);
    const actionField = (index: number, field: string) => rawEvent[`actionDetails_${index}_${field}`] || "";

    const firstTimestamp = sortedIndices.map(index => actionField(index, "timestamp")).find(Boolean);
    const visitorId = rawEvent.visitorId || "";

    // Extract visit-level metadata
    const visitMetadata = {
      // An export trimmed with showColumns can lack idVisit. Each row is one
      // visit, so its visitor and first timestamp identify it just as well.
      idVisit: rawEvent.idVisit || (visitorId && firstTimestamp ? `${visitorId}-${firstTimestamp}` : ""),
      visitorId,
      userId: rawEvent.userId || "",
      referrerUrl: rawEvent.referrerUrl || "",
      browserName: rawEvent.browserName || "",
      browserVersion: rawEvent.browserVersion || "",
      operatingSystemName: rawEvent.operatingSystemName || "",
      operatingSystemVersion: rawEvent.operatingSystemVersion || "",
      deviceType: rawEvent.deviceType || "",
      languageCode: rawEvent.languageCode || "",
      countryCode: rawEvent.countryCode || "",
      regionCode: rawEvent.regionCode || "",
      city: rawEvent.city || "",
      latitude: rawEvent.latitude || "",
      longitude: rawEvent.longitude || "",
      resolution: rawEvent.resolution || "",
    };

    // Matomo records only the target of an outlink or download, so those take
    // the page the visitor was last on
    let page = { url: "", title: "" };
    let isLandingPage = true;

    for (const index of sortedIndices) {
      const type = actionField(index, "type");
      const timestamp = actionField(index, "timestamp");
      if (!MATOMO_ACTION_TYPES.has(type) || !timestamp) {
        continue;
      }

      const actionUrl = actionField(index, "url");
      let url = page.url;
      let pageTitle = page.title;

      if (type === "action" || type === "search") {
        page = { url: actionUrl, title: actionField(index, "pageTitle") };
        url = isLandingPage ? withMatomoCampaign(actionUrl, rawEvent) : actionUrl;
        pageTitle = page.title;
        isLandingPage = false;
      } else if (type === "event" && actionUrl && actionUrl !== page.url) {
        // An event reports the page it fired on, which can differ from the last pageview
        url = actionUrl;
        pageTitle = "";
      }

      const isEvent = type === "event";
      events.push({
        ...visitMetadata,
        type,
        url,
        pageTitle,
        linkUrl: type === "outlink" || type === "download" ? actionUrl : "",
        eventCategory: isEvent ? actionField(index, "eventCategory") : "",
        eventAction: isEvent ? actionField(index, "eventAction") : "",
        eventName: isEvent ? actionField(index, "eventName") : "",
        eventValue: isEvent ? actionField(index, "eventValue") : "",
        timestamp,
      });
    }

    return events;
  }

  private async uploadChunk(
    events: UmamiEvent[] | SimpleAnalyticsEvent[] | MatomoEvent[],
    isLastBatch: boolean
  ): Promise<void> {
    // Skip empty chunks unless it's the last one (needed for finalization)
    if (events.length === 0 && !isLastBatch) {
      return;
    }

    await authedFetch(`/sites/${this.siteId}/imports/${this.importId}/events`, undefined, {
      method: "POST",
      data: {
        events,
        isLastBatch,
      },
    });
  }

  cancel() {
    this.cancelled = true;
  }
}
