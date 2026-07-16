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

interface Session {
  sessionId: string;
  userId: string;
  hostname: string;
  browser: BrowserInfo;
  device: DeviceInfo;
  os: OsInfo;
  location: LocationInfo;
  source: SourceInfo;
  budget: number;
  pagesUsed: number;
  startSeconds: number;
  perPageSeconds: number;
}

interface DayPool {
  sessions: Session[];
  cursor: number;
}

interface PoolDistributions {
  browserDist: DailyDist<BrowserInfo>;
  deviceDist: DailyDist<DeviceInfo>;
  osDist: DailyDist<OsInfo>;
  locationDist: DailyDist<LocationInfo>;
  sourceDist: DailyDist<SourceInfo>;
  hostnameDist: DailyDist<string>;
  hostnameFallback: string;
}

const CHUNK_SIZE = 5000;
const SECONDS_IN_DAY = 86400;
const DEFAULT_PAGE_GAP_SECONDS = 30;

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
    return ((n * 2654435761) >>> 0).toString(16).padStart(8, "0");
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

const osMap: Record<string, string> = {
  "gnu/linux": "Linux",
  ubuntu: "Linux",
  mac: "macOS",
  "mac os": "macOS",
  "mac os x": "macOS",
  ios: "iOS",
  ipados: "iOS",
  android: "Android",
  windows: "Windows",
  "chrome os": "Chrome OS",
  chromeos: "Chrome OS",
};

function normalizeOs(os: string): string {
  if (!os) return "";
  return osMap[os.toLowerCase()] ?? os;
}

const browserMap: Record<string, string> = {
  "microsoft edge": "Edge",
  "samsung browser": "Samsung Internet",
  "yandex browser": "Yandex",
};

function normalizeBrowser(browser: string): string {
  if (!browser) return "";
  return browserMap[browser.toLowerCase()] ?? browser;
}

function buildReferrerUrl(source: string, referrer: string): string {
  const value = referrer || source;
  if (!value) return "";
  // Already has a scheme (e.g. "android-app://com.linkedin.android") — keep as-is.
  if (value.includes("://")) return value;
  // Friendly source names like "Brave" or "Bing" aren't URLs and can't become one.
  if (!value.includes(".") && !value.includes("/")) return "";
  return `https://${value}`;
}

function hashDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = ((h << 5) - h + date.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

function clampSecondsToDay(seconds: number): number {
  if (seconds < 0) return 0;
  if (seconds > SECONDS_IN_DAY - 1) return SECONDS_IN_DAY - 1;
  return Math.floor(seconds);
}

function formatTimestamp(date: string, secondsOfDay: number): string {
  const s = clampSecondsToDay(secondsOfDay);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return `${date} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
          browser: normalizeBrowser(row.browser || ""),
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
          operating_system: normalizeOs(row.operating_system || ""),
          operating_system_version: row.operating_system_version || "",
        }),
        (row) => parseInt(row.pageviews || "0", 10)
      );

      const locationDist = this.buildDist<LocationInfo>(
        csvFiles.get("locations"),
        (row) => ({
          country: row.country || "",
          region: row.region || "",
          // Plausible exports city as a numeric Geonames ID (e.g. "2654264"), not a name.
          // We have no lookup table, so drop it rather than store a fake city name.
          city: "",
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

      // Custom-event rows have no hostname column, so derive one from the pages CSV.
      const hostnameDist = this.buildDist<string>(
        pagesData,
        (row) => row.hostname || "",
        (row) => parseInt(row.pageviews || "0", 10)
      );
      let hostnameFallback = "";
      let hostnameFallbackWeight = 0;
      for (const row of pagesData) {
        const h = row.hostname || "";
        if (!h) continue;
        const w = parseInt(row.pageviews || "0", 10);
        if (w > hostnameFallbackWeight) {
          hostnameFallbackWeight = w;
          hostnameFallback = h;
        }
      }

      // Phase 3: Build per-date session pools.
      //
      // Plausible exports daily totals (visitors, visits, bounces, pageviews) plus
      // per-page rows that re-aggregate the same activity. We use the daily totals
      // to size a pool of users + sessions for each date, give each session a
      // single set of context (browser/device/os/location/source/hostname) so the
      // context is consistent across all of that session's pageviews, and then
      // distribute pages from the pages CSV across the sessions. This produces
      // multi-page sessions with a real bounce rate, matching the source data.
      const visitorsData = csvFiles.get("visitors");
      const visitorsByDate = new Map<string, Record<string, string>>();
      if (visitorsData) {
        for (const row of visitorsData) {
          if (row.date) visitorsByDate.set(row.date, row);
        }
      }

      // Per-date pageview/visit totals from the pages CSV — used as a fallback
      // when no visitors row exists for a date.
      const pagesTotalsByDate = new Map<string, { pageviews: number; visits: number }>();
      for (const row of pagesData) {
        const date = row.date;
        if (!date) continue;
        const t = pagesTotalsByDate.get(date) ?? { pageviews: 0, visits: 0 };
        t.pageviews += parseInt(row.pageviews || "0", 10) || 0;
        t.visits += parseInt(row.visits || "0", 10) || 0;
        pagesTotalsByDate.set(date, t);
      }

      const dists: PoolDistributions = {
        browserDist,
        deviceDist,
        osDist,
        locationDist,
        sourceDist,
        hostnameDist,
        hostnameFallback,
      };

      const pools = new Map<string, DayPool>();
      for (const date of pagesTotalsByDate.keys()) {
        if (!this.isDateInRange(date)) continue;
        const pool = this.buildDayPool(
          date,
          visitorsByDate.get(date) ?? null,
          pagesTotalsByDate.get(date) ?? null,
          dists
        );
        if (pool.sessions.length > 0) pools.set(date, pool);
      }

      // Sort pages by entry-page weight (desc) within each date so the
      // highest-entry-likelihood pages are assigned first — they end up as
      // the first page of sessions, which gives Rybbit's "entry pages" report
      // a distribution that roughly matches Plausible's.
      const entryPagesData = csvFiles.get("entry_pages");
      const entryWeightByDatePage = new Map<string, number>();
      if (entryPagesData) {
        for (const row of entryPagesData) {
          if (!row.date || !row.entry_page) continue;
          const w = parseInt(row.entrances || "0", 10) || 0;
          entryWeightByDatePage.set(`${row.date}|${row.entry_page}`, w);
        }
      }
      const sortedPages = entryWeightByDatePage.size
        ? this.sortPagesByEntryWeight(pagesData, entryWeightByDatePage)
        : pagesData;

      // Phase 4: Generate pageview events using the pools.
      let buffer: PlausibleSyntheticEvent[] = [];

      for (const row of sortedPages) {
        if (this.cancelled) return;

        const date = row.date;
        if (!date) continue;
        const pool = pools.get(date);
        if (!pool) continue;

        const hostname = row.hostname || "";
        const page = row.page || "/";
        const pageviews = parseInt(row.pageviews || "0", 10);
        if (pageviews <= 0) continue;

        for (let i = 0; i < pageviews; i++) {
          const session = this.pickSessionForPageview(pool);
          const offsetSeconds =
            session.startSeconds + session.pagesUsed * session.perPageSeconds;
          const timestamp = formatTimestamp(date, offsetSeconds);

          buffer.push({
            timestamp,
            session_id: session.sessionId,
            user_id: session.userId,
            hostname,
            pathname: page,
            querystring: buildQuerystring(session.source),
            referrer: session.source.referrer,
            browser: session.browser.browser,
            browser_version: session.browser.browser_version,
            operating_system: session.os.operating_system,
            operating_system_version: session.os.operating_system_version,
            device_type: session.device.device_type,
            country: session.location.country,
            region: session.location.region,
            city: session.location.city,
            type: "pageview",
            event_name: "",
            props: "{}",
          });

          session.pagesUsed += 1;
          if (session.budget > 0) session.budget -= 1;

          if (buffer.length >= CHUNK_SIZE) {
            await this.uploadChunk(buffer, false);
            buffer = [];
          }
        }
      }

      // Phase 5: Generate custom events, attached to existing sessions so they
      // share user_ids with pageview activity for the same day.
      const customEventsData = csvFiles.get("custom_events");
      if (customEventsData) {
        for (const row of customEventsData) {
          if (this.cancelled) return;

          const date = row.date;
          if (!date) continue;
          const pool = pools.get(date);
          if (!pool || pool.sessions.length === 0) continue;

          const eventName = row.name || "";
          const path = row.path || "/";
          const linkUrl = row.link_url || "";
          const eventCount = parseInt(row.events || "0", 10);
          if (eventCount <= 0 || !eventName) continue;

          const propsStr = linkUrl ? JSON.stringify({ url: linkUrl }) : "{}";

          for (let i = 0; i < eventCount; i++) {
            const session = pool.sessions[i % pool.sessions.length];
            const offsetSeconds = Math.floor((i * SECONDS_IN_DAY) / eventCount);
            const timestamp = formatTimestamp(date, offsetSeconds);

            buffer.push({
              timestamp,
              session_id: session.sessionId,
              user_id: session.userId,
              hostname: session.hostname,
              pathname: path,
              querystring: buildQuerystring(session.source),
              referrer: session.source.referrer,
              browser: session.browser.browser,
              browser_version: session.browser.browser_version,
              operating_system: session.os.operating_system,
              operating_system_version: session.os.operating_system_version,
              device_type: session.device.device_type,
              country: session.location.country,
              region: session.location.region,
              city: session.location.city,
              type: "custom_event",
              event_name: eventName,
              props: propsStr,
            });

            if (buffer.length >= CHUNK_SIZE) {
              await this.uploadChunk(buffer, false);
              buffer = [];
            }
          }
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

  private buildDayPool(
    date: string,
    visitorsRow: Record<string, string> | null,
    pagesTotals: { pageviews: number; visits: number } | null,
    dists: PoolDistributions
  ): DayPool {
    const visitorsRowPv = parseInt(visitorsRow?.pageviews ?? "", 10) || 0;
    const visitorsRowVisits = parseInt(visitorsRow?.visits ?? "", 10) || 0;
    const visitorsRowVisitors = parseInt(visitorsRow?.visitors ?? "", 10) || 0;
    const visitorsRowBounces = parseInt(visitorsRow?.bounces ?? "", 10) || 0;
    const visitorsRowDuration = parseInt(visitorsRow?.visit_duration ?? "", 10) || 0;

    const totalPageviews = Math.max(visitorsRowPv, pagesTotals?.pageviews ?? 0);
    const numSessions = Math.max(
      1,
      visitorsRowVisits || pagesTotals?.visits || Math.max(1, Math.ceil(totalPageviews / 2))
    );
    const numUsers = Math.max(1, Math.min(numSessions, visitorsRowVisitors || numSessions));
    const numBounces = Math.min(numSessions, Math.max(0, visitorsRowBounces));

    if (totalPageviews <= 0) {
      return { sessions: [], cursor: 0 };
    }

    // Each session gets at least one pageview; bounces get exactly one.
    const minPageviews = Math.max(numSessions, totalPageviews);
    const nonBounce = numSessions - numBounces;
    const remainingForNonBounce = Math.max(0, minPageviews - numBounces);
    const baseNonBounce = nonBounce > 0 ? Math.floor(remainingForNonBounce / nonBounce) : 0;
    const extraNonBounce = nonBounce > 0 ? remainingForNonBounce - baseNonBounce * nonBounce : 0;

    const dateSeed = hashDate(date);
    const userIds: string[] = [];
    for (let i = 0; i < numUsers; i++) {
      userIds.push(generateUUID(dateSeed + i, dateSeed * 3 + i * 31337));
    }

    const sessions: Session[] = [];
    for (let i = 0; i < numSessions; i++) {
      const isBounce = i < numBounces;
      const budget = isBounce
        ? 1
        : Math.max(1, baseNonBounce + (i - numBounces < extraNonBounce ? 1 : 0));

      const startSeconds = Math.floor((i * SECONDS_IN_DAY) / numSessions);
      const avgDurationSeconds = visitorsRowDuration > 0 ? visitorsRowDuration / numSessions : 0;
      const perPageSeconds =
        budget > 1
          ? Math.max(1, Math.floor(avgDurationSeconds / (budget - 1)) || DEFAULT_PAGE_GAP_SECONDS)
          : DEFAULT_PAGE_GAP_SECONDS;

      sessions.push({
        sessionId: generateUUID(dateSeed * 7 + i, dateSeed * 11 + i * 7919),
        userId: userIds[i % numUsers],
        hostname: this.pickFromDist(dists.hostnameDist, date, i, dists.hostnameFallback),
        browser: this.pickFromDist(dists.browserDist, date, i, {
          browser: "",
          browser_version: "",
        }),
        device: this.pickFromDist(dists.deviceDist, date, i, { device_type: "" }),
        os: this.pickFromDist(dists.osDist, date, i, {
          operating_system: "",
          operating_system_version: "",
        }),
        location: this.pickFromDist(dists.locationDist, date, i, {
          country: "",
          region: "",
          city: "",
        }),
        source: this.pickFromDist(dists.sourceDist, date, i, {
          referrer: "",
          utm_source: "",
          utm_medium: "",
          utm_campaign: "",
          utm_content: "",
          utm_term: "",
        }),
        budget,
        pagesUsed: 0,
        startSeconds,
        perPageSeconds,
      });
    }

    return { sessions, cursor: 0 };
  }

  private pickSessionForPageview(pool: DayPool): Session {
    // Prefer sessions with remaining budget, advancing the cursor round-robin.
    for (let i = 0; i < pool.sessions.length; i++) {
      const idx = (pool.cursor + i) % pool.sessions.length;
      const session = pool.sessions[idx];
      if (session.budget > 0) {
        pool.cursor = (idx + 1) % pool.sessions.length;
        return session;
      }
    }
    // All budgets exhausted (page totals exceed the visitors total — possible
    // due to filtering). Over-allocate to keep events flowing rather than drop them.
    const session = pool.sessions[pool.cursor % pool.sessions.length];
    pool.cursor = (pool.cursor + 1) % pool.sessions.length;
    return session;
  }

  private sortPagesByEntryWeight(
    pagesData: Record<string, string>[],
    entryWeights: Map<string, number>
  ): Record<string, string>[] {
    // Group rows by date to preserve date locality, then sort within each
    // date by entry weight descending.
    const byDate = new Map<string, Record<string, string>[]>();
    for (const row of pagesData) {
      const date = row.date || "";
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(row);
    }

    const out: Record<string, string>[] = [];
    for (const [date, rows] of byDate) {
      rows.sort((a, b) => {
        const aw = entryWeights.get(`${date}|${a.page}`) ?? 0;
        const bw = entryWeights.get(`${date}|${b.page}`) ?? 0;
        return bw - aw;
      });
      out.push(...rows);
    }
    return out;
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
