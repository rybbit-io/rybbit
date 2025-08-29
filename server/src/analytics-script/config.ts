import { ScriptConfig } from "./types.js";
import { parseJsonSafely } from "./utils.js";

/**
 * Parse script configuration from the script tag attributes
 */
export function parseScriptConfig(scriptTag: HTMLScriptElement): ScriptConfig | null {
  const src = scriptTag.getAttribute("src");
  if (!src) {
    console.error("Script src attribute is missing");
    return null;
  }

  const analyticsHost = src.split("/script.js")[0];
  if (!analyticsHost) {
    console.error("Please provide a valid analytics host");
    return null;
  }

  const siteId = scriptTag.getAttribute("data-site-id") || scriptTag.getAttribute("site-id");
  if (!siteId || isNaN(Number(siteId))) {
    console.error("Please provide a valid site ID using the data-site-id attribute");
    return null;
  }

  const debounceDuration = scriptTag.getAttribute("data-debounce")
    ? Math.max(0, parseInt(scriptTag.getAttribute("data-debounce")!))
    : 500;

  const skipPatterns = parseJsonSafely<string[]>(scriptTag.getAttribute("data-skip-patterns"), []);

  const maskPatterns = parseJsonSafely<string[]>(scriptTag.getAttribute("data-mask-patterns"), []);

  const apiKey = scriptTag.getAttribute("data-api-key") || undefined;

  const sessionReplayBatchSize = scriptTag.getAttribute("data-replay-batch-size")
    ? Math.max(1, parseInt(scriptTag.getAttribute("data-replay-batch-size")!))
    : 250; // Industry standard batch size

  const sessionReplayBatchInterval = scriptTag.getAttribute("data-replay-batch-interval")
    ? Math.max(1000, parseInt(scriptTag.getAttribute("data-replay-batch-interval")!))
    : 5000; // 5 seconds - industry standard interval

  return {
    analyticsHost,
    siteId,
    debounceDuration,
    autoTrackPageview: scriptTag.getAttribute("data-auto-track-pageview") !== "false",
    autoTrackSpa: scriptTag.getAttribute("data-track-spa") !== "false",
    trackQuerystring: scriptTag.getAttribute("data-track-query") !== "false",
    trackOutbound: scriptTag.getAttribute("data-track-outbound") !== "false",
    enableWebVitals: scriptTag.getAttribute("data-web-vitals") === "true",
    trackErrors: scriptTag.getAttribute("data-track-errors") === "true",
    enableSessionReplay: scriptTag.getAttribute("data-session-replay") === "true",
    sessionReplayBatchSize,
    sessionReplayBatchInterval,
    skipPatterns,
    maskPatterns,
    apiKey,
  };
}
