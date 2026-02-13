(function () {
  const LOG = "[rybbit-ad]";

  const scriptTag = document.currentScript as HTMLScriptElement;
  if (!scriptTag) {
    console.warn(LOG, "Could not find script tag");
    return;
  }

  const src = scriptTag.getAttribute("src") || "";
  const analyticsHost = src.split("/ad.js")[0].replace("/api", "");
  const siteId = scriptTag.getAttribute("data-site-id") || "";

  console.log(LOG, "Initialized", { siteId, analyticsHost, src });

  if (!siteId) {
    console.warn(LOG, "No data-site-id attribute found on script tag");
    return;
  }

  const trackUrl = analyticsHost + "/api/track";

  function sendAdClick(creative: string) {
    let creativeHostname = "";
    try {
      creativeHostname = new URL(creative).hostname;
    } catch {
      // not a valid URL
    }

    const payload = {
      type: "ad_click" as const,
      site_id: siteId,
      pathname: creative,
      hostname: creativeHostname,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      language: navigator.language,
      page_title: document.title,
      referrer: document.referrer,
    };

    console.log(LOG, "Sending ad_click", payload);

    fetch(trackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((r) =>
        r.ok
          ? console.log(LOG, "Tracked OK", r.status)
          : r.text().then((t) => console.error(LOG, "Track failed", r.status, t))
      )
      .catch((err) => console.error(LOG, "fetch error:", err));
  }

  // Identify the creative URL for an ad iframe or its container
  function getAdCreative(iframe: HTMLIFrameElement): string {
    // 1. Check the iframe src itself
    if (iframe.src) return iframe.src;

    // 2. Walk up to find a container with an ad-related identifier
    let el: HTMLElement | null = iframe;
    while (el) {
      const id = el.getAttribute("id") || "";
      const dataAdSlot = el.getAttribute("data-ad-slot") || "";
      const dataAdClient = el.getAttribute("data-ad-client") || "";
      if (dataAdSlot) return `ad-slot:${dataAdSlot}`;
      if (dataAdClient) return `ad-client:${dataAdClient}`;
      if (id) return `container:${id}`;
      el = el.parentElement;
    }

    return "unknown-ad";
  }

  // === Strategy 1: Direct clicks on <a><img> patterns (same-origin ads) ===
  document.addEventListener("click", function (e) {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;

    const img = anchor.querySelector("img");
    if (!img) return;

    const imgSrc = img.src;
    if (!imgSrc) return;

    console.log(LOG, "Direct <a><img> click detected", imgSrc);
    sendAdClick(imgSrc);
  });

  // === Strategy 2: Detect clicks into cross-origin iframes ===
  // When a user clicks inside an iframe, the parent window loses focus.
  // We track which iframe the mouse last entered and fire on blur.

  let hoveredIframe: HTMLIFrameElement | null = null;
  let blurTimeout: ReturnType<typeof setTimeout> | null = null;

  function onIframeMouseEnter(this: HTMLIFrameElement) {
    hoveredIframe = this;
    console.debug(LOG, "Mouse entered iframe", this.src || "(no src)");
  }

  function onIframeMouseLeave(this: HTMLIFrameElement) {
    if (hoveredIframe === this) {
      hoveredIframe = null;
    }
  }

  function attachIframeListeners(iframe: HTMLIFrameElement) {
    iframe.addEventListener("mouseenter", onIframeMouseEnter);
    iframe.addEventListener("mouseleave", onIframeMouseLeave);
  }

  // Attach to all current iframes
  function scanIframes() {
    const iframes = document.querySelectorAll("iframe");
    console.log(LOG, `Found ${iframes.length} iframes on page`);
    iframes.forEach(attachIframeListeners);
  }

  // Watch for dynamically added iframes (ads often load late)
  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof HTMLIFrameElement) {
          console.debug(LOG, "New iframe added", node.src || "(no src)");
          attachIframeListeners(node);
        }
        // Also check children of added nodes
        if (node instanceof HTMLElement) {
          const nested = node.querySelectorAll("iframe");
          nested.forEach(attachIframeListeners);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // When window loses focus while hovering an iframe, that's a click
  window.addEventListener("blur", function () {
    // Small delay to let activeElement update
    if (blurTimeout) clearTimeout(blurTimeout);
    blurTimeout = setTimeout(function () {
      if (hoveredIframe) {
        const creative = getAdCreative(hoveredIframe);
        console.log(LOG, "Iframe click detected via blur", creative);
        sendAdClick(creative);
        hoveredIframe = null;
      }
    }, 100);
  });

  // Also check: when focus returns to the window after an iframe click,
  // activeElement might still be the iframe
  window.addEventListener("focus", function () {
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      blurTimeout = null;
    }
  });

  // Initial scan once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanIframes);
  } else {
    scanIframes();
  }
})();
