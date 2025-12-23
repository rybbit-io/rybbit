import { parseScriptConfig } from "./config.js";
import { Tracker } from "./tracking.js";
import { WebVitalsCollector } from "./webVitals.js";
import { debounce, isOutboundLink } from "./utils.js";
import { RybbitAPI, WebVitalsData, ErrorProperties } from "./types.js";

declare global {
  interface Window {
    __RYBBIT_OPTOUT__?: boolean;
    rybbit: RybbitAPI;
  }
}

(async function () {
  const scriptTag = document.currentScript as HTMLScriptElement;
  if (!scriptTag) {
    console.error("Could not find current script tag");
    return;
  }

  // Check if user has opted out
  if (window.__RYBBIT_OPTOUT__ || localStorage.getItem("disable-rybbit") !== null) {
    // Create no-op implementation
    window.rybbit = {
      pageview: () => {},
      event: () => {},
      error: () => {},
      trackOutbound: () => {},
      identify: () => {},
      setTraits: () => {},
      clearUserId: () => {},
      getUserId: () => null,
      startSessionReplay: () => {},
      stopSessionReplay: () => {},
      isSessionReplayActive: () => false,
    };
    return;
  }

  // Parse configuration (now async to fetch from API)
  const config = await parseScriptConfig(scriptTag);
  if (!config) {
    return;
  }

  // Initialize tracker
  const tracker = new Tracker(config);

  // Initialize web vitals if enabled
  if (config.enableWebVitals) {
    const webVitalsCollector = new WebVitalsCollector((vitals: WebVitalsData) => {
      tracker.trackWebVitals(vitals);
    });
    webVitalsCollector.initialize();
  }

  // Initialize error tracking if enabled
  if (config.trackErrors) {
    // Global error handler for uncaught errors
    window.addEventListener("error", event => {
      tracker.trackError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Global handler for unhandled promise rejections
    window.addEventListener("unhandledrejection", event => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      tracker.trackError(error, {
        type: "unhandledrejection",
      });
    });
  }

  // Create debounced pageview tracker
  const trackPageview = () => tracker.trackPageview();
  const debouncedTrackPageview =
    config!.debounceDuration > 0 ? debounce(trackPageview, config!.debounceDuration) : trackPageview;

  // Setup event listeners
  function setupEventListeners() {
    // Track custom events and outbound links
    document.addEventListener("click", function (e) {
      let target = e.target as HTMLElement;

      // Check for custom events via data attributes
      while (target && target !== document.documentElement) {
        if (target.hasAttribute("data-rybbit-event")) {
          const eventName = target.getAttribute("data-rybbit-event");
          if (eventName) {
            const properties: Record<string, string> = {};
            for (const attr of target.attributes) {
              if (attr.name.startsWith("data-rybbit-prop-")) {
                const propName = attr.name.replace("data-rybbit-prop-", "");
                properties[propName] = attr.value;
              }
            }
            tracker.trackEvent(eventName, properties);
          }
          break;
        }
        target = target.parentElement as HTMLElement;
      }

      // Check for outbound links
      if (config!.trackOutbound) {
        const link = (e.target as HTMLElement).closest("a") as HTMLAnchorElement;
        if (link?.href && isOutboundLink(link.href)) {
          tracker.trackOutbound(link.href, link.innerText || link.textContent || "", link.target || "_self");
        }
      }
    });

    // Setup SPA tracking
    if (config!.autoTrackSpa) {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function (...args) {
        originalPushState.apply(this, args);
        debouncedTrackPageview();
        tracker.onPageChange();
      };

      history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        debouncedTrackPageview();
        tracker.onPageChange();
      };

      window.addEventListener("popstate", () => {
        debouncedTrackPageview();
        tracker.onPageChange();
      });
      window.addEventListener("hashchange", () => {
        debouncedTrackPageview();
        tracker.onPageChange();
      });
    }
  }

  // Setup public API
  window.rybbit = {
    pageview: () => tracker.trackPageview(),
    event: (name: string, properties: Record<string, any> = {}) => tracker.trackEvent(name, properties),
    error: (error: Error, properties: ErrorProperties = {}) => tracker.trackError(error, properties),
    trackOutbound: (url: string, text: string = "", target: string = "_self") =>
      tracker.trackOutbound(url, text, target),
    identify: (userId: string, traits?: Record<string, unknown>) => tracker.identify(userId, traits),
    setTraits: (traits: Record<string, unknown>) => tracker.setTraits(traits),
    clearUserId: () => tracker.clearUserId(),
    getUserId: () => tracker.getUserId(),
    startSessionReplay: () => tracker.startSessionReplay(),
    stopSessionReplay: () => tracker.stopSessionReplay(),
    isSessionReplayActive: () => tracker.isSessionReplayActive(),
  };

  // Initialize
  setupEventListeners();

  // Setup cleanup on page unload
  window.addEventListener("beforeunload", () => {
    tracker.cleanup();
  });

  // Track initial pageview if enabled
  if (config!.autoTrackPageview) {
    tracker.trackPageview();
  }
})();