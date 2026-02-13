"use strict";
(() => {
  // index.ts
  (function() {
    const LOG = "[rybbit-ad]";
    const scriptTag = document.currentScript;
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
    function sendAdClick(creative) {
      let creativeHostname = "";
      try {
        creativeHostname = new URL(creative).hostname;
      } catch {
      }
      const payload = {
        type: "ad_click",
        site_id: siteId,
        pathname: creative,
        hostname: creativeHostname,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
        page_title: document.title,
        referrer: document.referrer
      };
      console.log(LOG, "Sending ad_click", payload);
      fetch(trackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(
        (r) => r.ok ? console.log(LOG, "Tracked OK", r.status) : r.text().then((t) => console.error(LOG, "Track failed", r.status, t))
      ).catch((err) => console.error(LOG, "fetch error:", err));
    }
    function getAdCreative(iframe) {
      if (iframe.src) return iframe.src;
      let el = iframe;
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
    document.addEventListener("click", function(e) {
      const target = e.target;
      const anchor = target.closest("a");
      if (!anchor) return;
      const img = anchor.querySelector("img");
      if (!img) return;
      const imgSrc = img.src;
      if (!imgSrc) return;
      console.log(LOG, "Direct <a><img> click detected", imgSrc);
      sendAdClick(imgSrc);
    });
    let hoveredIframe = null;
    let blurTimeout = null;
    function onIframeMouseEnter() {
      hoveredIframe = this;
      console.debug(LOG, "Mouse entered iframe", this.src || "(no src)");
    }
    function onIframeMouseLeave() {
      if (hoveredIframe === this) {
        hoveredIframe = null;
      }
    }
    function attachIframeListeners(iframe) {
      iframe.addEventListener("mouseenter", onIframeMouseEnter);
      iframe.addEventListener("mouseleave", onIframeMouseLeave);
    }
    function scanIframes() {
      const iframes = document.querySelectorAll("iframe");
      console.log(LOG, `Found ${iframes.length} iframes on page`);
      iframes.forEach(attachIframeListeners);
    }
    const observer = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLIFrameElement) {
            console.debug(LOG, "New iframe added", node.src || "(no src)");
            attachIframeListeners(node);
          }
          if (node instanceof HTMLElement) {
            const nested = node.querySelectorAll("iframe");
            nested.forEach(attachIframeListeners);
          }
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    window.addEventListener("blur", function() {
      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(function() {
        if (hoveredIframe) {
          const creative = getAdCreative(hoveredIframe);
          console.log(LOG, "Iframe click detected via blur", creative);
          sendAdClick(creative);
          hoveredIframe = null;
        }
      }, 100);
    });
    window.addEventListener("focus", function() {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", scanIframes);
    } else {
      scanIframes();
    }
  })();
})();
