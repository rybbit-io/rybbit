import { ScriptConfig } from "./types.js";
import { parseJsonSafely } from "./utils.js";

function createVisitorId(): string {
  try {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // crypto may be unavailable in older browsers
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateVisitorId(namespace: string): string {
  const key = `${namespace}-visitor-id`;

  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;

    const visitorId = createVisitorId();
    localStorage.setItem(key, visitorId);
    return visitorId;
  } catch (e) {
    return createVisitorId();
  }
}

function getIdentifiedUserId(namespace: string): string | undefined {
  try {
    return localStorage.getItem(`${namespace}-user-id`) || undefined;
  } catch (e) {
    return undefined;
  }
}

function getEvaluationPathname(url: URL): string {
  if (url.hash && url.hash.startsWith("#/")) {
    return url.hash.substring(1);
  }

  return url.pathname;
}

async function fetchFeatureFlags(
  analyticsHost: string,
  siteId: string,
  namespace: string,
  visitorId: string
): Promise<ScriptConfig["featureFlags"]> {
  try {
    const url = new URL(window.location.href);
    const response = await fetch(`${analyticsHost}/site/${siteId}/feature-flags/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "omit",
      body: JSON.stringify({
        anonymousId: visitorId,
        identifiedUserId: getIdentifiedUserId(namespace),
        hostname: url.hostname,
        pathname: getEvaluationPathname(url),
        querystring: url.search,
        query: Object.fromEntries(url.searchParams.entries()),
        referrer: document.referrer,
        language: navigator.language,
        screenWidth: screen.width,
        screenHeight: screen.height,
      }),
    });

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    return data?.flags && typeof data.flags === "object" ? data.flags : {};
  } catch (e) {
    return {};
  }
}

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

  const namespace = scriptTag.getAttribute("data-namespace") || "rybbit";
  const visitorId = getOrCreateVisitorId(namespace);

  // These can be overridden via data attributes for testing/debugging
  const skipPatterns = parseJsonSafely<string[]>(scriptTag.getAttribute("data-skip-patterns"), []);
  const maskPatterns = parseJsonSafely<string[]>(scriptTag.getAttribute("data-mask-patterns"), []);
  const sessionReplayMaskTextSelectors = parseJsonSafely<string[]>(
    scriptTag.getAttribute("data-replay-mask-text-selectors"),
    []
  );

  const debounceDuration = scriptTag.getAttribute("data-debounce")
    ? Math.max(0, parseInt(scriptTag.getAttribute("data-debounce")!))
    : 500;

  const sessionReplayBatchSize = scriptTag.getAttribute("data-replay-batch-size")
    ? Math.max(1, parseInt(scriptTag.getAttribute("data-replay-batch-size")!))
    : 250;

  const sessionReplayBatchInterval = scriptTag.getAttribute("data-replay-batch-interval")
    ? Math.max(1000, parseInt(scriptTag.getAttribute("data-replay-batch-interval")!))
    : 5000;

  // Parse rrweb session replay options
  const sessionReplayBlockClass = scriptTag.getAttribute("data-replay-block-class") || undefined;
  const sessionReplayBlockSelector = scriptTag.getAttribute("data-replay-block-selector") || undefined;
  const sessionReplayIgnoreClass = scriptTag.getAttribute("data-replay-ignore-class") || undefined;
  const sessionReplayIgnoreSelector = scriptTag.getAttribute("data-replay-ignore-selector") || undefined;
  const sessionReplayMaskTextClass = scriptTag.getAttribute("data-replay-mask-text-class") || undefined;

  const maskAllInputsAttr = scriptTag.getAttribute("data-replay-mask-all-inputs");
  const sessionReplayMaskAllInputs = maskAllInputsAttr !== null ? maskAllInputsAttr !== "false" : undefined;

  const maskInputOptionsAttr = scriptTag.getAttribute("data-replay-mask-input-options");
  const sessionReplayMaskInputOptions = maskInputOptionsAttr
    ? parseJsonSafely<Record<string, boolean>>(maskInputOptionsAttr, { password: true, email: true })
    : undefined;

  const collectFontsAttr = scriptTag.getAttribute("data-replay-collect-fonts");
  const sessionReplayCollectFonts = collectFontsAttr !== null ? collectFontsAttr !== "false" : undefined;

  const samplingAttr = scriptTag.getAttribute("data-replay-sampling");
  const sessionReplaySampling = samplingAttr ? parseJsonSafely<Record<string, any>>(samplingAttr, {}) : undefined;

  const slimDOMAttr = scriptTag.getAttribute("data-replay-slim-dom-options");
  const sessionReplaySlimDOMOptions = slimDOMAttr
    ? parseJsonSafely<Record<string, boolean> | boolean>(slimDOMAttr, {})
    : undefined;

  const sampleRateAttr = scriptTag.getAttribute("data-replay-sample-rate");
  const sessionReplaySampleRate = sampleRateAttr ? Math.min(100, Math.max(0, parseInt(sampleRateAttr, 10))) : undefined;

  const tag = scriptTag.getAttribute("data-tag") || "";

  // Default config with minimal settings
  const defaultConfig: ScriptConfig = {
    namespace,
    analyticsHost,
    siteId,
    visitorId,
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
    trackButtonClicks: false,
    trackCopy: false,
    trackFormInteractions: false,
    tag,
    featureFlags: {},
    // rrweb session replay options (undefined means use rrweb defaults)
    sessionReplayBlockClass,
    sessionReplayBlockSelector,
    sessionReplayIgnoreClass,
    sessionReplayIgnoreSelector,
    sessionReplayMaskTextClass,
    sessionReplayMaskAllInputs,
    sessionReplayMaskInputOptions,
    sessionReplayCollectFonts,
    sessionReplaySampling,
    sessionReplaySlimDOMOptions,
    sessionReplaySampleRate,
  };

  let resolvedConfig = defaultConfig;

  try {
    // Fetch configuration from API
    const configUrl = `${analyticsHost}/site/tracking-config/${siteId}`;
    const response = await fetch(configUrl, {
      method: "GET",
      // Include credentials if needed for authentication
      credentials: "omit",
    });

    if (response.ok) {
      const apiConfig = await response.json();

      // Merge API config with defaults, API config takes precedence
      resolvedConfig = {
        ...defaultConfig,
        // Map API field names to script config field names
        autoTrackPageview: apiConfig.trackInitialPageView ?? defaultConfig.autoTrackPageview,
        autoTrackSpa: apiConfig.trackSpaNavigation ?? defaultConfig.autoTrackSpa,
        trackQuerystring: apiConfig.trackUrlParams ?? defaultConfig.trackQuerystring,
        trackOutbound: apiConfig.trackOutbound ?? defaultConfig.trackOutbound,
        enableWebVitals: apiConfig.webVitals ?? defaultConfig.enableWebVitals,
        trackErrors: apiConfig.trackErrors ?? defaultConfig.trackErrors,
        enableSessionReplay: apiConfig.sessionReplay ?? defaultConfig.enableSessionReplay,
        trackButtonClicks: apiConfig.trackButtonClicks ?? defaultConfig.trackButtonClicks,
        trackCopy: apiConfig.trackCopy ?? defaultConfig.trackCopy,
        trackFormInteractions: apiConfig.trackFormInteractions ?? defaultConfig.trackFormInteractions,
      };
    } else {
      // If API call fails, log warning and use defaults
      console.warn("Failed to fetch tracking config from API, using defaults");
    }
  } catch (error) {
    // If network error, log and use defaults
    console.warn("Error fetching tracking config:", error);
  }

  resolvedConfig.featureFlags = await fetchFeatureFlags(analyticsHost, siteId, namespace, visitorId);
  return resolvedConfig;
}
