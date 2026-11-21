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

export class CsvParser {
  private cancelled: boolean = false;
  private finished: boolean = false;
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
      // The import already exists on the server; close it so it can be deleted.
      void this.finish();
      return;
    }

    // Parsed on the main thread because Papa's worker mode can't pause. Papa doesn't await the
    // chunk callback, so each chunk pauses the parser until its upload lands: uploads run one at
    // a time, only one chunk is held in memory, and `complete` (the final batch) can't overtake them.
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      chunkSize: 5 * 1024 * 1024, // 5MB CSV chunks to stay under 10MB JSON limit
      chunk: (results, parser) => {
        parser.pause();
        this.uploadRows(results.data).then(
          () => (this.cancelled ? parser.abort() : parser.resume()),
          (error: unknown) => {
            console.error("Error uploading chunk:", error);
            this.cancel();
            parser.abort();
          }
        );
      },
      // Also reached through parser.abort(), so a failed or cancelled import still gets its final
      // batch: the server only marks an import complete (and deletable) when that batch arrives.
      complete: () => {
        void this.finish();
      },
      error: (error: Error) => {
        console.error("Error reading import file:", error);
        this.cancel();
        void this.finish();
      },
    });
  }

  private async uploadRows(rows: unknown[]): Promise<void> {
    if (this.cancelled) {
      return;
    }

    if (this.platform === "umami") {
      const validEvents: UmamiEvent[] = [];
      for (const row of rows) {
        const event = this.transformRow(row);
        if (event && this.isDateInRange((event as UmamiEvent).created_at)) {
          validEvents.push(event as UmamiEvent);
        }
      }
      if (validEvents.length > 0) {
        await this.uploadChunk(validEvents, false);
      }
    } else {
      const validEvents: SimpleAnalyticsEvent[] = [];
      for (const row of rows) {
        const event = this.transformRow(row);
        if (event && this.isDateInRange((event as SimpleAnalyticsEvent).added_iso)) {
          validEvents.push(event as SimpleAnalyticsEvent);
        }
      }
      if (validEvents.length > 0) {
        await this.uploadChunk(validEvents, false);
      }
    }
  }

  private async finish(): Promise<void> {
    if (this.finished) {
      return;
    }
    this.finished = true;

    try {
      // Send final batch to mark import as complete
      await this.uploadChunk([], true);
    } catch (error) {
      console.error("Error completing import:", error);
    }
  }

  private isDateInRange(dateStr: string): boolean {
    // Handle both formats: "yyyy-MM-dd HH:mm:ss" (Umami) and ISO (Simple Analytics)
    let createdAt = DateTime.fromFormat(dateStr, "yyyy-MM-dd HH:mm:ss", { zone: "utc" });
    if (!createdAt.isValid) {
      createdAt = DateTime.fromISO(dateStr, { zone: "utc" });
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

  private transformRow(row: unknown): UmamiEvent | SimpleAnalyticsEvent | null {
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
    } else {
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
  }

  private async uploadChunk(events: UmamiEvent[] | SimpleAnalyticsEvent[], isLastBatch: boolean): Promise<void> {
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
