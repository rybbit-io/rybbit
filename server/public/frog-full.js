"use strict";
(() => {
  // index.ts
  (function() {
    const LOG = "[rybbit-ad]";
    const DEFAULT_SITE_ID = "d38451f43f87";
    const scriptTag = document.currentScript;
    if (!scriptTag) {
      console.warn(LOG, "Could not find script tag");
      return;
    }
    const src = scriptTag.getAttribute("src") || "";
    const analyticsHost = src.split("/frog.js")[0].replace("/api", "");
    const trackUrl = analyticsHost + "/api/track";
    const siteId = new URLSearchParams(src.split("?")[1] || "").get("siteid") || DEFAULT_SITE_ID;
    console.log(LOG, "Initialized", { siteId, analyticsHost });
    const MARKED_CREATIVE_SELECTOR = 'img[alt="ad"], img[data-ad], video[alt="ad"], video[data-ad]';
    const SLOT_CREATIVE_SELECTOR = "[data-ad] img, [data-ad] video";
    const AD_SELECTOR = `${MARKED_CREATIVE_SELECTOR}, ${SLOT_CREATIVE_SELECTOR}`;
    const MIN_CREATIVE_PX = 50;
    function creativeType(el) {
      return el instanceof HTMLVideoElement ? "video" : "image";
    }
    function adSlot(el) {
      return el.closest("[data-ad]")?.getAttribute("data-ad") || "";
    }
    function creativeUrl(el) {
      if (el instanceof HTMLVideoElement) {
        return el.currentSrc || el.src || el.querySelector("source")?.src || "";
      }
      return el.src || "";
    }
    function buildPayload(type, el, url) {
      return {
        type,
        site_id: siteId,
        pathname: window.location.pathname,
        hostname: window.location.hostname,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
        page_title: document.title,
        referrer: document.referrer,
        properties: JSON.stringify({
          creative_url: url,
          creative_type: creativeType(el),
          ad_slot: adSlot(el)
        })
      };
    }
    function sendEvent(payload) {
      console.log(LOG, "Sending payload", payload);
      fetch(trackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(
        (r) => r.ok ? console.log(LOG, "Tracked OK", r.status) : r.text().then((t) => console.error(LOG, "Track failed", r.status, t))
      ).catch((err) => console.error(LOG, "fetch error:", err));
    }
    document.addEventListener("click", function(e) {
      const target = e.target;
      const creative = target.closest(AD_SELECTOR);
      if (!creative) return;
      const url = creativeUrl(creative);
      if (!url) return;
      const anchor = creative.closest("a");
      console.log(LOG, "Ad click detected", {
        url,
        type: creativeType(creative),
        slot: adSlot(creative),
        href: anchor?.href
      });
      sendEvent(buildPayload("ad_click", creative, url));
    });
    const observedElements = /* @__PURE__ */ new WeakSet();
    const impressionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const creative = entry.target;
          const box = entry.boundingClientRect;
          if (!creative.matches(MARKED_CREATIVE_SELECTOR) && (box.width < MIN_CREATIVE_PX || box.height < MIN_CREATIVE_PX)) {
            impressionObserver.unobserve(creative);
            continue;
          }
          const url = creativeUrl(creative);
          if (!url) continue;
          console.log(LOG, "Ad impression detected", { url, type: creativeType(creative), slot: adSlot(creative) });
          sendEvent(buildPayload("ad_impression", creative, url));
          impressionObserver.unobserve(creative);
        }
      },
      { threshold: 0.5 }
    );
    function observeAdCreatives(root = document) {
      root.querySelectorAll(AD_SELECTOR).forEach((creative) => {
        if (!observedElements.has(creative)) {
          observedElements.add(creative);
          impressionObserver.observe(creative);
        }
      });
    }
    observeAdCreatives();
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.matches(AD_SELECTOR)) {
              if (!observedElements.has(node)) {
                observedElements.add(node);
                impressionObserver.observe(node);
              }
            } else {
              observeAdCreatives(node);
            }
          }
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("unload", () => {
      impressionObserver.disconnect();
      mutationObserver.disconnect();
    });
  })();
})();
