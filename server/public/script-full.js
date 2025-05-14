// Rybbit Analytics Script
(function () {
  const scriptTag = document.currentScript;
  const ANALYTICS_HOST = scriptTag.getAttribute("src").split("/script.js")[0];

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

    const url = new URL(window.location.href);
    let pathname = url.pathname;

    if (findMatchingPattern(pathname, skipPatterns)) {
      return;
    }

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
      type: eventType,
      event_name: eventName,
      properties:
        eventType === "custom_event" || eventType === "outbound"
          ? JSON.stringify(properties)
          : undefined,
    };

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

  const trackPageview = () => track("pageview");

  const debouncedTrackPageview =
    debounceDuration > 0
      ? debounce(trackPageview, debounceDuration)
      : trackPageview;

  // Track outbound link clicks
  if (trackOutbound) {
    document.addEventListener("click", function (e) {
      const link = e.target.closest("a");
      if (!link || !link.href) return;

      if (isOutboundLink(link.href)) {
        track("outbound", "", {
          url: link.href,
          text: link.innerText || link.textContent || "",
          target: link.target || "_self",
        });
      }
    });
  }

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
  }

  window.rybbit = {
    pageview: trackPageview,
    event: (name, properties = {}) => track("custom_event", name, properties),
    trackOutbound: (url, text = "", target = "_self") =>
      track("outbound", "", { url, text, target }),
  };

  trackPageview();
})();
