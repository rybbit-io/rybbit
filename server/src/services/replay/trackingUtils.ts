import { UAParser } from "ua-parser-js";
import { getLocation } from "../../db/geolocation/geolocation.js";
import { getChannel } from "../tracker/getChannel.js";
import { getDeviceType } from "../../utils.js";

export interface TrackingData {
  browser: string;
  browserVersion: string;
  operatingSystem: string;
  operatingSystemVersion: string;
  deviceType: string;
  country: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  channel: string;
  language: string;
  hostname: string;
  referrer: string;
}

/**
 * Parse tracking data from user agent, IP address, and other request data
 * This is shared between pageview tracking and session replay
 */
export async function parseTrackingData(
  userAgent: string,
  ipAddress: string,
  referrer: string,
  querystring: string,
  hostname: string,
  language: string,
  screenWidth: number,
  screenHeight: number
): Promise<TrackingData> {
  // Parse user agent
  const ua = UAParser(userAgent);

  const geoData = await getLocation([ipAddress], true);

  const countryCode = geoData?.[ipAddress]?.countryIso || "";
  const regionCode = geoData?.[ipAddress]?.region || "";
  const latitude = geoData?.[ipAddress]?.latitude || 0;
  const longitude = geoData?.[ipAddress]?.longitude || 0;
  const city = geoData?.[ipAddress]?.city || "";

  // Clear self-referrer if it's from the same domain
  if (referrer && hostname) {
    try {
      const referrerUrl = new URL(referrer);
      if (referrerUrl.hostname === hostname) {
        referrer = "";
      }
    } catch (e) {
      // Invalid URL, keep original referrer
    }
  }

  return {
    browser: ua.browser.name || "",
    browserVersion: ua.browser.major || "",
    operatingSystem: ua.os.name || "",
    operatingSystemVersion: ua.os.version || "",
    deviceType: getDeviceType(screenWidth, screenHeight, ua),
    country: countryCode,
    region: countryCode && regionCode ? countryCode + "-" + regionCode : "",
    city: city || "",
    lat: latitude || 0,
    lon: longitude || 0,
    channel: getChannel(referrer, querystring, hostname),
    language: language || "",
    hostname: hostname || "",
    referrer: referrer || "",
  };
}
