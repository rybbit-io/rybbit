import { ScriptConfig } from "./types.js";
import { parseJsonSafely } from "./utils.js";

/**
 * Parse minimal script configuration from the script tag attributes
 * Most configuration will be fetched from the API
 */
export async function parseScriptConfig(scriptTag: HTMLScriptElement): Promise<ScriptConfig | null> {
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
  if (!siteId) {
    console.error("Please provide a valid site ID using the data-site-id attribute");
    return null;
  }

  // These can be overridden via data attributes for testing/debugging
  const skipPatterns = parseJsonSafely<string[]>(scriptTag.getAttribute("data-skip-patterns"), []);
  const maskPatterns = parseJsonSafely<string[]>(scriptTag.getAttribute("data-mask-patterns"), []);
  const sessionReplayMaskTextSelectors = parseJsonSafely<string[]>(scriptTag.getAttribute("data-replay-mask-text-selectors"), []);

  const debounceDuration = scriptTag.getAttribute("data-debounce")
    ? Math.max(0, parseInt(scriptTag.getAttribute("data-debounce")!))
    : 500;

  const sessionReplayBatchSize = scriptTag.getAttribute("data-replay-batch-size")
    ? Math.max(1, parseInt(scriptTag.getAttribute("data-replay-batch-size")!))
    : 250;

  const sessionReplayBatchInterval = scriptTag.getAttribute("data-replay-batch-interval")
    ? Math.max(1000, parseInt(scriptTag.getAttribute("data-replay-batch-interval")!))
    : 5000;

  // Default config with minimal settings
  const defaultConfig: ScriptConfig = {
    analyticsHost,
    siteId,
    debounceDuration,
    sessionReplayBatchSize,
    sessionReplayBatchInterval,
    sessionReplayMaskTextSelectors,
    skipPatterns,
    maskPatterns,
    // Default all tracking to true initially (will be updated from API)
    autoTrackPageview: true,
    autoTrackSpa: true,
    trackQuerystring: true,
    trackOutbound: true,
    enableWebVitals: false,
    trackErrors: false,
    enableSessionReplay: false,
  };

  try {
    // Fetch configuration from API
    const configUrl = `${analyticsHost}/site/${siteId}/tracking-config`;
    const response = await fetch(configUrl, {
      method: "GET",
      // Include credentials if needed for authentication
      credentials: "omit",
    });

    if (response.ok) {
      const apiConfig = await response.json();

      // Merge API config with defaults, API config takes precedence
      return {
        ...defaultConfig,
        // Map API field names to script config field names
        autoTrackPageview: apiConfig.trackInitialPageView ?? defaultConfig.autoTrackPageview,
        autoTrackSpa: apiConfig.trackSpaNavigation ?? defaultConfig.autoTrackSpa,
        trackQuerystring: apiConfig.trackUrlParams ?? defaultConfig.trackQuerystring,
        trackOutbound: apiConfig.trackOutbound ?? defaultConfig.trackOutbound,
        enableWebVitals: apiConfig.webVitals ?? defaultConfig.enableWebVitals,
        trackErrors: apiConfig.trackErrors ?? defaultConfig.trackErrors,
        enableSessionReplay: apiConfig.sessionReplay ?? defaultConfig.enableSessionReplay,
      };
    } else {
      // If API call fails, log warning and use defaults
      console.warn("Failed to fetch tracking config from API, using defaults");
      return defaultConfig;
    }
  } catch (error) {
    // If network error, log and use defaults
    console.warn("Error fetching tracking config:", error);
    return defaultConfig;
  }
}
