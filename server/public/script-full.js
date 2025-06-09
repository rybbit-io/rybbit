// Rybbit Analytics Script
// NOTE: script.js is generated via `npm run pack-script` from the `server` directory
(function () {
  const scriptTag = document.currentScript;
  const ANALYTICS_HOST = scriptTag.getAttribute("src").split("/script.js")[0];

  // Load Web Vitals library dynamically from CDN
  const loadWebVitals = () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js";
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load web-vitals library"));
      document.head.appendChild(script);
    });
  };

  // Initialize web vitals loading
  loadWebVitals()
    .then(() => {
      initWebVitals();
    })
    .catch((e) => {
      console.warn("Failed to load web vitals library:", e);
    });

  // Check if the user has opted out of tracking
  if (!window.__RYBBIT_OPTOUT__ || localStorage.getItem("disable-rybbit") !== null) {
    // Create a no-op implementation to ensure the API still works
    window.rybbit = {
      pageview: () => {},
      event: () => {},
      trackOutbound: () => {},
      identify: () => {},
      clearUserId: () => {},
      getUserId: () => null,
    };
    return;
  }

  if (!ANALYTICS_HOST) {
    console.error("Please provide a valid analytics host");
    return;
  }

  const SITE_ID =
    scriptTag.getAttribute("data-site-id") || scriptTag.getAttribute("site-id");

  if (!SITE_ID || isNaN(Number(SITE_ID))) {
    console.error(
      "Please provide a valid site ID using the data-site-id attribute"
    );
    return;
  }

  const debounceDuration = scriptTag.getAttribute("data-debounce")
    ? Math.max(0, parseInt(scriptTag.getAttribute("data-debounce")))
    : 500;

  const autoTrackPageview =
    scriptTag.getAttribute("data-auto-track-pageview") !== "false";
  const autoTrackSpa = scriptTag.getAttribute("data-track-spa") !== "false";
  const trackQuerystring =
    scriptTag.getAttribute("data-track-query") !== "false";
  const trackOutbound =
    scriptTag.getAttribute("data-track-outbound") !== "false";

  let skipPatterns = [];
  try {
    const skipAttr = scriptTag.getAttribute("data-skip-patterns");
    if (skipAttr) {
      skipPatterns = JSON.parse(skipAttr);
      if (!Array.isArray(skipPatterns)) skipPatterns = [];
    }
  } catch (e) {
    console.error("Error parsing data-skip-patterns:", e);
  }

  let maskPatterns = [];
  try {
    const maskAttr = scriptTag.getAttribute("data-mask-patterns");
    if (maskAttr) {
      maskPatterns = JSON.parse(maskAttr);
      if (!Array.isArray(maskPatterns)) maskPatterns = [];
    }
  } catch (e) {
    console.error("Error parsing data-mask-patterns:", e);
  }

  // Add user ID management
  let customUserId = null;

  // Load stored user ID from localStorage on script initialization
  try {
    const storedUserId = localStorage.getItem("rybbit-user-id");
    if (storedUserId) {
      customUserId = storedUserId;
    }
  } catch (e) {
    // localStorage not available, ignore
  }

  // Helper function to convert wildcard pattern to regex
  function patternToRegex(pattern) {
    // Use a safer approach by replacing wildcards with unique tokens first
    const DOUBLE_WILDCARD_TOKEN = "__DOUBLE_ASTERISK_TOKEN__";
    const SINGLE_WILDCARD_TOKEN = "__SINGLE_ASTERISK_TOKEN__";

    // Replace wildcards with tokens
    let tokenized = pattern
      .replace(/\*\*/g, DOUBLE_WILDCARD_TOKEN)
      .replace(/\*/g, SINGLE_WILDCARD_TOKEN);

    // Escape special regex characters
    let escaped = tokenized.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

    // Escape forward slashes
    escaped = escaped.replace(/\//g, "\\/");

    // Replace tokens with appropriate regex patterns
    let regexPattern = escaped
      .replace(new RegExp(DOUBLE_WILDCARD_TOKEN, "g"), ".*")
      .replace(new RegExp(SINGLE_WILDCARD_TOKEN, "g"), "[^/]+");

    return new RegExp("^" + regexPattern + "$");
  }

  function findMatchingPattern(path, patterns) {
    for (const pattern of patterns) {
      try {
        const regex = patternToRegex(pattern);
        if (regex.test(path)) {
          return pattern; // Return the pattern string itself
        }
      } catch (e) {
        console.error(`Invalid pattern: ${pattern}`, e);
      }
    }
    return null;
  }

  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Check if a URL is an outbound link
  function isOutboundLink(url) {
    try {
      const currentHost = window.location.hostname;
      const linkHost = new URL(url).hostname;
      return linkHost !== currentHost && linkHost !== "";
    } catch (e) {
      return false;
    }
  }

  // Helper function to create base payload with pattern matching
  const createBasePayload = () => {
    const url = new URL(window.location.href);
    let pathname = url.pathname;

    // Always handle hash-based SPA routing
    if (url.hash && url.hash.startsWith("#/")) {
      // For #/path format, replace pathname with just /path
      pathname = url.hash.substring(1);
    }

    // Check skip patterns
    if (findMatchingPattern(pathname, skipPatterns)) {
      return null; // Indicates tracking should be skipped
    }

    // Apply mask patterns
    const maskMatch = findMatchingPattern(pathname, maskPatterns);
    if (maskMatch) {
      pathname = maskMatch;
    }

    const payload = {
      site_id: SITE_ID,
      hostname: url.hostname,
      pathname: pathname,
      querystring: trackQuerystring ? url.search : "",
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      language: navigator.language,
      page_title: document.title,
      referrer: document.referrer,
    };

    // Add custom user ID only if it's set
    if (customUserId) {
      payload.user_id = customUserId;
    }

    return payload;
  };

  // Helper function to send tracking data
  const sendTrackingData = (payload) => {
    fetch(`${ANALYTICS_HOST}/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      mode: "cors",
      keepalive: true,
    }).catch(console.error);
  };

  const track = (eventType = "pageview", eventName = "", properties = {}) => {
    if (
      eventType === "custom_event" &&
      (!eventName || typeof eventName !== "string")
    ) {
      console.error(
        "Event name is required and must be a string for custom events"
      );
      return;
    }

    const basePayload = createBasePayload();
    if (!basePayload) {
      return; // Skip tracking due to pattern match
    }

    const payload = {
      ...basePayload,
      type: eventType,
      event_name: eventName,
      properties:
        eventType === "custom_event" || eventType === "outbound"
          ? JSON.stringify(properties)
          : undefined,
    };

    sendTrackingData(payload);
  };

  // Web vitals collection state
  let webVitalsData = {
    lcp: null,
    cls: null,
    inp: null,
    fcp: null,
    ttfb: null,
  };
  let webVitalsSent = false;
  let webVitalsTimeout = null;

  // Check if all metrics are collected and send if ready
  const checkAndSendWebVitals = () => {
    if (webVitalsSent) return;

    const allMetricsCollected = Object.values(webVitalsData).every(
      (value) => value !== null
    );

    if (allMetricsCollected) {
      sendWebVitals();
    }
  };

  // Send web vitals data in a single request
  const sendWebVitals = () => {
    if (webVitalsSent) return;
    webVitalsSent = true;

    // Clear timeout if it exists
    if (webVitalsTimeout) {
      clearTimeout(webVitalsTimeout);
      webVitalsTimeout = null;
    }

    const basePayload = createBasePayload();
    if (!basePayload) {
      return; // Skip web vitals tracking due to pattern match
    }

    const payload = {
      ...basePayload,
      type: "performance",
      event_name: "web-vitals",
      // Include all collected metrics
      lcp: webVitalsData.lcp,
      cls: webVitalsData.cls,
      inp: webVitalsData.inp,
      fcp: webVitalsData.fcp,
      ttfb: webVitalsData.ttfb,
    };

    sendTrackingData(payload);
  };

  // Individual metric collectors
  const collectMetric = (metric) => {
    if (webVitalsSent) return;

    webVitalsData[metric.name.toLowerCase()] = metric.value;
    checkAndSendWebVitals();
  };

  // Initialize web vitals tracking if available
  const initWebVitals = () => {
    if (typeof webVitals !== "undefined") {
      try {
        // Track Core Web Vitals
        webVitals.getLCP(collectMetric);
        webVitals.getCLS(collectMetric);
        webVitals.getINP(collectMetric);

        // Track additional metrics
        webVitals.getFCP(collectMetric);
        webVitals.getTTFB(collectMetric);

        // Set a timeout to send metrics even if not all are collected
        // This handles cases where some metrics might not fire (e.g., no user interactions for INP)
        webVitalsTimeout = setTimeout(() => {
          if (!webVitalsSent) {
            sendWebVitals();
          }
        }, 20000);

        // Also send on page unload to capture any remaining metrics
        window.addEventListener("beforeunload", () => {
          if (!webVitalsSent) {
            sendWebVitals();
          }
        });
      } catch (e) {
        console.warn("Error initializing web vitals tracking:", e);
      }
    }
  };

  const trackPageview = () => track("pageview");

  const debouncedTrackPageview =
    debounceDuration > 0
      ? debounce(trackPageview, debounceDuration)
      : trackPageview;

  // Track outbound link clicks and custom data-attribute events
  document.addEventListener("click", function (e) {
    // First check for custom events via data attributes
    let target = e.target;
    while (target && target !== document) {
      if (target.hasAttribute("data-rybbit-event")) {
        const eventName = target.getAttribute("data-rybbit-event");
        if (eventName) {
          // Collect additional properties from data-rybbit-prop-* attributes
          const properties = {};
          for (const attr of target.attributes) {
            if (attr.name.startsWith("data-rybbit-prop-")) {
              const propName = attr.name.replace("data-rybbit-prop-", "");
              properties[propName] = attr.value;
            }
          }
          track("custom_event", eventName, properties);
        }
        break;
      }
      target = target.parentElement;
    }
    
    // Then check for outbound links
    if (trackOutbound) {
      const link = e.target.closest("a");
      if (!link || !link.href) return;

      if (isOutboundLink(link.href)) {
        track("outbound", "", {
          url: link.href,
          text: link.innerText || link.textContent || "",
          target: link.target || "_self",
        });
      }
    }
  });

  if (autoTrackSpa) {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      debouncedTrackPageview();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      debouncedTrackPageview();
    };

    window.addEventListener("popstate", debouncedTrackPageview);
    // Always listen for hashchange events for hash-based routing
    window.addEventListener("hashchange", debouncedTrackPageview);
  }

  window.rybbit = {
    pageview: trackPageview,
    event: (name, properties = {}) => track("custom_event", name, properties),
    trackOutbound: (url, text = "", target = "_self") =>
      track("outbound", "", { url, text, target }),

    // New methods for user identification
    identify: (userId) => {
      if (typeof userId !== "string" || userId.trim() === "") {
        console.error("User ID must be a non-empty string");
        return;
      }
      customUserId = userId.trim();
      try {
        localStorage.setItem("rybbit-user-id", customUserId);
      } catch (e) {
        // localStorage not available, user ID will only persist for session
        console.warn("Could not persist user ID to localStorage");
      }
    },

    clearUserId: () => {
      customUserId = null;
      try {
        localStorage.removeItem("rybbit-user-id");
      } catch (e) {
        // localStorage not available, ignore
      }
    },

    getUserId: () => customUserId,
  };

  if (autoTrackPageview) {
    trackPageview();
  }
})();
