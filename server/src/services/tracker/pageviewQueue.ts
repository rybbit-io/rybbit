import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getLocation } from "../../db/geolocation/geolocation.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { getDeviceType } from "../../utils.js";
import { getChannel } from "./getChannel.js";
import { clearSelfReferrer, getAllUrlParams } from "./utils.js";
import { TrackingPayload } from "./types.js";

type TotalPayload = TrackingPayload & {
  userId: string;
  timestamp: string;
  sessionId: string;
  ua: UAParser.IResult;
  referrer: string;
  ipAddress: string;
  type?: string;
  event_name?: string;
  properties?: string;
  // Performance metrics
  lcp?: number;
  cls?: number;
  inp?: number;
  fcp?: number;
  ttfb?: number;
};

const getParsedProperties = (properties: string | undefined) => {
  try {
    return properties ? JSON.parse(properties) : undefined;
  } catch (error) {
    return undefined;
  }
};

class PageviewQueue {
  private queue: TotalPayload[] = [];
  private batchSize = 5000;
  private interval = 10000;
  private processing = false;
  private logger = createServiceLogger("pageview-queue");

  constructor() {
    // Start processing interval
    setInterval(() => this.processQueue(), this.interval);
  }

  async add(pageview: TotalPayload) {
    this.queue.push(pageview);
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    // Get batch of pageviews
    const batch = this.queue.splice(0, this.batchSize);
    const ips = [...new Set(batch.map((pv) => pv.ipAddress))];

    let geoData: Record<string, { data: any }> = {};

    try {
      // Process each IP to get geo data using local implementation
      const geoPromises = ips.map(async (ip) => {
        const locationData = await getLocation(ip);
        return { ip, locationData };
      });

      const results = await Promise.all(geoPromises);

      // Format results to match expected structure
      results.forEach(({ ip, locationData }) => {
        geoData[ip] = { data: locationData };
      });
    } catch (error) {
      this.logger.error(error, "Error getting geo data");
    }

    // Process each pageview with its geo data
    const processedPageviews = batch.map((pv) => {
      const dataForIp = geoData?.[pv.ipAddress];

      const countryCode = dataForIp?.data?.countryIso || "";
      const regionCode = dataForIp?.data?.subdivisions?.[0]?.isoCode || "";
      const latitude = dataForIp?.data?.latitude || 0;
      const longitude = dataForIp?.data?.longitude || 0;
      const city = dataForIp?.data?.city || "";

      // Check if referrer is from the same domain and clear it if so
      let referrer = clearSelfReferrer(pv.referrer || "", pv.hostname || "");

      // Get all URL parameters for the url_parameters map
      const allUrlParams = getAllUrlParams(pv.querystring || "");

      return {
        site_id: pv.site_id,
        timestamp: DateTime.fromISO(pv.timestamp).toFormat("yyyy-MM-dd HH:mm:ss"),
        session_id: pv.sessionId,
        user_id: pv.userId,
        hostname: pv.hostname || "",
        pathname: pv.pathname || "",
        querystring: pv.querystring || "",
        page_title: pv.page_title || "",
        referrer: referrer,
        channel: getChannel(referrer, pv.querystring, pv.hostname),
        browser: pv.ua.browser.name || "",
        browser_version: pv.ua.browser.major || "",
        operating_system: pv.ua.os.name || "",
        operating_system_version: pv.ua.os.version || "",
        language: pv.language || "",
        screen_width: pv.screenWidth || 0,
        screen_height: pv.screenHeight || 0,
        device_type: getDeviceType(pv.screenWidth, pv.screenHeight, pv.ua),
        country: countryCode,
        region: countryCode && regionCode ? countryCode + "-" + regionCode : "",
        city: city || "",
        lat: latitude || 0,
        lon: longitude || 0,
        type: pv.type || "pageview",
        event_name: pv.event_name || "",
        props: getParsedProperties(pv.properties),
        url_parameters: allUrlParams,
        // Performance metrics (only included for performance events)
        lcp: pv.lcp || null,
        cls: pv.cls || null,
        inp: pv.inp || null,
        fcp: pv.fcp || null,
        ttfb: pv.ttfb || null,
      };
    });

    this.logger.info({ count: processedPageviews.length }, "Bulk insert to ClickHouse");
    // Bulk insert into database
    try {
      await clickhouse.insert({
        table: "events",
        values: processedPageviews,
        format: "JSONEachRow",
      });
    } catch (error) {
      this.logger.error(error, "Error processing pageview queue");
    } finally {
      this.processing = false;
    }
  }
}

// Create singleton instance
export const pageviewQueue = new PageviewQueue();
