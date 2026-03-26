import JSZip from "jszip";
import Papa from "papaparse";
import { DateTime } from "luxon";
import { authedFetch } from "@/api/utils";

interface DistEntry<T> {
  value: T;
  weight: number;
}

interface BrowserInfo {
  browser: string;
  browser_version: string;
}

interface DeviceInfo {
  device_type: string;
}

interface OsInfo {
  operating_system: string;
  operating_system_version: string;
}

interface LocationInfo {
  country: string;
  region: string;
  city: string;
}

interface SourceInfo {
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
}

interface PlausibleSyntheticEvent {
  timestamp: string;
  session_id: string;
  user_id: string;
  hostname: string;
  pathname: string;
  querystring: string;
  referrer: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  device_type: string;
  country: string;
  region: string;
  city: string;
  type: string;
  event_name: string;
  props: string;
}

type DailyDist<T> = Map<string, DistEntry<T>[]>;

const CHUNK_SIZE = 5000;

// Simple deterministic pseudo-random based on index
function deterministicPick<T>(
  items: DistEntry<T>[],
  index: number
): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from empty distribution");
  }
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return items[0].value;
  // Use a prime multiplier for better distribution
  const position = ((index * 7919) % totalWeight + totalWeight) % totalWeight;
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight;
    if (position < cumulative) return item.value;
  }
  return items[items.length - 1].value;
}

function generateUUID(seed1: number, seed2: number): string {
  // Generate a deterministic UUID-like string from two seed numbers
  const hex = (n: number) => {
    const h = ((n * 2654435761) >>> 0).toString(16).padStart(8, "0");
    return h;
  };
  const a = hex(seed1);
  const b = hex(seed2);
  const c = hex(seed1 + seed2);
  const d = hex(seed1 * 3 + seed2 * 7);
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-${c.slice(0, 4)}-${d}${c.slice(4, 8)}`.slice(
    0,
    36
  );
}

function identifyFile(
  headers: string[]
): string | null {
  const headerSet = new Set(headers);
  if (headerSet.has("browser") && headerSet.has("browser_version"))
    return "browsers";
  if (headerSet.has("device") && !headerSet.has("browser"))
    return "devices";
  if (headerSet.has("operating_system") && headerSet.has("operating_system_version"))
    return "operating_systems";
  if (headerSet.has("country") && headerSet.has("region") && headerSet.has("city"))
    return "locations";
  if (headerSet.has("source") && headerSet.has("utm_source"))
    return "sources";
  if (headerSet.has("page") && headerSet.has("hostname"))
    return "pages";
  if (headerSet.has("name") && headerSet.has("visitors") && headerSet.has("events"))
    return "custom_events";
  if (headerSet.has("entry_page")) return "entry_pages";
  if (headerSet.has("exit_page")) return "exit_pages";
  if (
    headerSet.has("visitors") &&
    headerSet.has("pageviews") &&
    headerSet.has("bounces") &&
    !headerSet.has("page") &&
    !headerSet.has("browser") &&
    !headerSet.has("device") &&
    !headerSet.has("country")
  )
    return "visitors";
  if (headerSet.has("property") && headerSet.has("value"))
    return "custom_props";
  return null;
}

function normalizeDevice(device: string): string {
  const lower = device.toLowerCase();
  if (lower === "desktop" || lower === "laptop") return "Desktop";
  if (lower === "mobile" || lower === "tablet") return "Mobile";
  return device;
}

function buildReferrerUrl(source: string, referrer: string): string {
  if (!source && !referrer) return "";
  if (referrer) return `https://${referrer}`;
  if (source && source !== "Direct / None") return `https://${source}`;
  return "";
}

function buildQuerystring(utm: SourceInfo): string {
  const params = new URLSearchParams();
  if (utm.utm_source) params.set("utm_source", utm.utm_source);
  if (utm.utm_medium) params.set("utm_medium", utm.utm_medium);
  if (utm.utm_campaign) params.set("utm_campaign", utm.utm_campaign);
  if (utm.utm_content) params.set("utm_content", utm.utm_content);
  if (utm.utm_term) params.set("utm_term", utm.utm_term);
  const str = params.toString();
  return str ? `?${str}` : "";
}

export class PlausibleCsvParser {
  private cancelled = false;
  private readonly siteId: number;
  private readonly importId: string;
  private readonly earliestAllowedDate: DateTime;
  private readonly latestAllowedDate: DateTime;

  constructor(
    siteId: number,
    importId: string,
    earliestAllowedDate: string,
    latestAllowedDate: string
  ) {
    this.siteId = siteId;
    this.importId = importId;
    this.earliestAllowedDate = DateTime.fromFormat(
      earliestAllowedDate,
      "yyyy-MM-dd",
      { zone: "utc" }
    ).startOf("day");
    this.latestAllowedDate = DateTime.fromFormat(
      latestAllowedDate,
      "yyyy-MM-dd",
      { zone: "utc" }
    ).endOf("day");

    if (!this.earliestAllowedDate.isValid || !this.latestAllowedDate.isValid) {
      this.cancelled = true;
    }
  }

  cancel(): void {
    this.cancelled = true;
  }

  async startImport(file: File): Promise<void> {
    if (this.cancelled) return;

    try {
      // Phase 1: Extract CSVs from ZIP
      const zip = await JSZip.loadAsync(file);
      const csvFiles = new Map<string, Record<string, string>[]>();

      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (this.cancelled) return;
        if (zipEntry.dir || !filename.endsWith(".csv")) continue;

        const csvText = await zipEntry.async("string");
        const parsed = Papa.parse<Record<string, string>>(csvText, {
          header: true,
          skipEmptyLines: "greedy",
        });

        if (parsed.data.length === 0 || !parsed.meta.fields) continue;

        const fileType = identifyFile(parsed.meta.fields);
        if (fileType) {
          csvFiles.set(fileType, parsed.data);
        }
      }

      const pagesData = csvFiles.get("pages");
      if (!pagesData || pagesData.length === 0) {
        // Must have pages data to generate events
        await this.uploadChunk([], true);
        return;
      }

      // Phase 2: Build daily distributions
      const browserDist = this.buildDist<BrowserInfo>(
        csvFiles.get("browsers"),
        (row) => ({
          browser: row.browser || "",
          browser_version: row.browser_version || "",
        }),
        (row) => parseInt(row.pageviews || "0", 10)
      );

      const deviceDist = this.buildDist<DeviceInfo>(
        csvFiles.get("devices"),
        (row) => ({ device_type: normalizeDevice(row.device || "") }),
        (row) => parseInt(row.pageviews || "0", 10)
      );

      const osDist = this.buildDist<OsInfo>(
        csvFiles.get("operating_systems"),
        (row) => ({
          operating_system: row.operating_system || "",
          operating_system_version: row.operating_system_version || "",
        }),
        (row) => parseInt(row.pageviews || "0", 10)
      );

      const locationDist = this.buildDist<LocationInfo>(
        csvFiles.get("locations"),
        (row) => ({
          country: row.country || "",
          region: row.region || "",
          city: row.city || "",
        }),
        (row) => parseInt(row.pageviews || "0", 10)
      );

      const sourceDist = this.buildDist<SourceInfo>(
        csvFiles.get("sources"),
        (row) => ({
          referrer: buildReferrerUrl(row.source || "", row.referrer || ""),
          utm_source: row.utm_source || "",
          utm_medium: row.utm_medium || "",
          utm_campaign: row.utm_campaign || "",
          utm_content: row.utm_content || "",
          utm_term: row.utm_term || "",
        }),
        (row) => parseInt(row.pageviews || "0", 10)
      );

      // Phase 3: Generate synthetic pageview events
      let buffer: PlausibleSyntheticEvent[] = [];
      let globalIndex = 0;

      for (const row of pagesData) {
        if (this.cancelled) return;

        const date = row.date;
        if (!date || !this.isDateInRange(date)) continue;

        const hostname = row.hostname || "";
        const page = row.page || "/";
        const pageviews = parseInt(row.pageviews || "0", 10);
        const visits = parseInt(row.visits || "1", 10);

        if (pageviews <= 0) continue;

        // Generate session IDs for this row's visits
        const sessionsForRow = Math.max(1, Math.min(visits, pageviews));
        const sessionIds: string[] = [];
        for (let s = 0; s < sessionsForRow; s++) {
          sessionIds.push(generateUUID(globalIndex + s, s * 31337));
        }

        for (let i = 0; i < pageviews; i++) {
          const eventIndex = globalIndex + i;
          // Spread timestamps evenly across the day
          const secondsInDay = 86400;
          const offsetSeconds = Math.floor(
            (i * secondsInDay) / pageviews
          );
          const hours = Math.floor(offsetSeconds / 3600);
          const minutes = Math.floor((offsetSeconds % 3600) / 60);
          const seconds = offsetSeconds % 60;
          const timestamp = `${date} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

          const sessionId = sessionIds[i % sessionsForRow];

          const browser = this.pickFromDist(browserDist, date, eventIndex, {
            browser: "",
            browser_version: "",
          });
          const device = this.pickFromDist(deviceDist, date, eventIndex, {
            device_type: "",
          });
          const os = this.pickFromDist(osDist, date, eventIndex, {
            operating_system: "",
            operating_system_version: "",
          });
          const location = this.pickFromDist(locationDist, date, eventIndex, {
            country: "",
            region: "",
            city: "",
          });
          const source = this.pickFromDist(sourceDist, date, eventIndex, {
            referrer: "",
            utm_source: "",
            utm_medium: "",
            utm_campaign: "",
            utm_content: "",
            utm_term: "",
          });

          buffer.push({
            timestamp,
            session_id: sessionId,
            user_id: sessionId,
            hostname,
            pathname: page,
            querystring: buildQuerystring(source),
            referrer: source.referrer,
            browser: browser.browser,
            browser_version: browser.browser_version,
            operating_system: os.operating_system,
            operating_system_version: os.operating_system_version,
            device_type: device.device_type,
            country: location.country,
            region: location.region,
            city: location.city,
            type: "pageview",
            event_name: "",
            props: "{}",
          });

          if (buffer.length >= CHUNK_SIZE) {
            await this.uploadChunk(buffer, false);
            buffer = [];
          }
        }

        globalIndex += pageviews;
      }

      // Phase 4: Generate synthetic custom events
      const customEventsData = csvFiles.get("custom_events");
      if (customEventsData) {
        for (const row of customEventsData) {
          if (this.cancelled) return;

          const date = row.date;
          if (!date || !this.isDateInRange(date)) continue;

          const eventName = row.name || "";
          const path = row.path || "/";
          const eventCount = parseInt(row.events || "0", 10);

          if (eventCount <= 0 || !eventName) continue;

          for (let i = 0; i < eventCount; i++) {
            const eventIndex = globalIndex + i;
            const secondsInDay = 86400;
            const offsetSeconds = Math.floor(
              (i * secondsInDay) / eventCount
            );
            const hours = Math.floor(offsetSeconds / 3600);
            const minutes = Math.floor((offsetSeconds % 3600) / 60);
            const seconds = offsetSeconds % 60;
            const timestamp = `${date} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

            const sessionId = generateUUID(eventIndex, eventIndex * 7);

            const browser = this.pickFromDist(browserDist, date, eventIndex, {
              browser: "",
              browser_version: "",
            });
            const device = this.pickFromDist(deviceDist, date, eventIndex, {
              device_type: "",
            });
            const os = this.pickFromDist(osDist, date, eventIndex, {
              operating_system: "",
              operating_system_version: "",
            });
            const location = this.pickFromDist(
              locationDist,
              date,
              eventIndex,
              { country: "", region: "", city: "" }
            );

            buffer.push({
              timestamp,
              session_id: sessionId,
              user_id: sessionId,
              hostname: "",
              pathname: path,
              querystring: "",
              referrer: "",
              browser: browser.browser,
              browser_version: browser.browser_version,
              operating_system: os.operating_system,
              operating_system_version: os.operating_system_version,
              device_type: device.device_type,
              country: location.country,
              region: location.region,
              city: location.city,
              type: "custom_event",
              event_name: eventName,
              props: "{}",
            });

            if (buffer.length >= CHUNK_SIZE) {
              await this.uploadChunk(buffer, false);
              buffer = [];
            }
          }

          globalIndex += eventCount;
        }
      }

      // Final flush
      if (this.cancelled) return;
      if (buffer.length > 0) {
        await this.uploadChunk(buffer, false);
      }
      await this.uploadChunk([], true);
    } catch (error) {
      console.error("Plausible import error:", error);
      // Try to mark import complete even on error
      try {
        await this.uploadChunk([], true);
      } catch {
        // ignore
      }
    }
  }

  private buildDist<T>(
    rows: Record<string, string>[] | undefined,
    extractor: (row: Record<string, string>) => T,
    weightFn: (row: Record<string, string>) => number
  ): DailyDist<T> {
    const dist: DailyDist<T> = new Map();
    if (!rows) return dist;

    for (const row of rows) {
      const date = row.date;
      if (!date) continue;
      const weight = weightFn(row);
      if (weight <= 0) continue;

      if (!dist.has(date)) {
        dist.set(date, []);
      }
      dist.get(date)!.push({ value: extractor(row), weight });
    }

    return dist;
  }

  private pickFromDist<T>(
    dist: DailyDist<T>,
    date: string,
    index: number,
    fallback: T
  ): T {
    const entries = dist.get(date);
    if (!entries || entries.length === 0) return fallback;
    return deterministicPick(entries, index);
  }

  private isDateInRange(dateStr: string): boolean {
    const date = DateTime.fromFormat(dateStr, "yyyy-MM-dd", { zone: "utc" });
    if (!date.isValid) return false;
    return date >= this.earliestAllowedDate && date <= this.latestAllowedDate;
  }

  private async uploadChunk(
    events: PlausibleSyntheticEvent[],
    isLastBatch: boolean
  ): Promise<void> {
    if (events.length === 0 && !isLastBatch) return;

    await authedFetch(
      `/sites/${this.siteId}/imports/${this.importId}/events`,
      undefined,
      {
        method: "POST",
        data: {
          events,
          isLastBatch,
        },
      }
    );
  }
}
