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
  visitorId: string;
  fingerprint: string;
  siteName: string;

  type: string;
  url: string;
  pageTitle: string;
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

  startImport(file: File): void {
    if (this.cancelled) {
      return;
    }

    Papa.parse(file, {
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

  private unrollMatomoVisit(rawEvent: Record<string, string>): MatomoEvent[] {
    const events: MatomoEvent[] = [];

    // Extract visit-level metadata
    const visitMetadata = {
      visitorId: rawEvent.visitorId || "",
      fingerprint: rawEvent.fingerprint || "",
      siteName: rawEvent.siteName || "",
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

    // Find all action indices by scanning for actionDetails_N_* columns
    const actionIndices = new Set<number>();
    for (const key of Object.keys(rawEvent)) {
      const match = key.match(/^actionDetails_(\d+)_/);
      if (match) {
        actionIndices.add(parseInt(match[1], 10));
      }
    }

    // Track most recent "action" type's url and pageTitle for outlinks
    let lastActionUrl = "";
    let lastActionPageTitle = "";

    // Create one MatomoEvent per action (sorted by index)
    for (const index of Array.from(actionIndices).sort((a, b) => a - b)) {
      const type = rawEvent[`actionDetails_${index}_type`] || "";
      const timestamp = rawEvent[`actionDetails_${index}_timestamp`] || "";

      // Only process "action" and "outlink" types
      if ((type !== "action" && type !== "outlink") || !timestamp) {
        continue;
      }

      const actionUrl = rawEvent[`actionDetails_${index}_url`] || "";
      const actionPageTitle = rawEvent[`actionDetails_${index}_pageTitle`] || "";

      // For "action" type, update tracking and use its own url/pageTitle
      // For "outlink" type, use the most recent "action"'s url/pageTitle
      let url: string;
      let pageTitle: string;

      if (type === "action") {
        lastActionUrl = actionUrl;
        lastActionPageTitle = actionPageTitle;
        url = actionUrl;
        pageTitle = actionPageTitle;
      } else {
        // outlink - use last action's url/pageTitle
        url = lastActionUrl;
        pageTitle = lastActionPageTitle;
      }

      const event: MatomoEvent = {
        ...visitMetadata,
        type,
        url,
        pageTitle,
        timestamp,
      };

      events.push(event);
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
