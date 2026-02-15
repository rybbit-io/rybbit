"use strict";
(() => {
  // index.ts
  (function() {
    const LOG = "[rybbit-ad]";
    const siteId = "d38451f43f87";
    const scriptTag = document.currentScript;
    if (!scriptTag) {
      console.warn(LOG, "Could not find script tag");
      return;
    }
    const src = scriptTag.getAttribute("src") || "";
    const analyticsHost = src.split("/frog.js")[0].replace("/api", "");
    const trackUrl = analyticsHost + "/api/track";
    console.log(LOG, "Initialized", { siteId, analyticsHost });
    function buildPayload(type, imgSrc) {
      return {
        type,
        site_id: siteId,
        pathname: imgSrc,
        hostname: window.location.hostname,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
        page_title: document.title,
        referrer: document.referrer
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
      const adImg = target.closest('img[alt="ad"]');
      if (!adImg) return;
      const imgSrc = adImg.src;
      if (!imgSrc) return;
      const anchor = adImg.closest("a");
      console.log(LOG, "Ad click detected", { imgSrc, href: anchor?.href });
      sendEvent(buildPayload("ad_click", imgSrc));
    });
    const observedElements = /* @__PURE__ */ new WeakSet();
    const impressionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const img = entry.target;
            const imgSrc = img.src;
            if (imgSrc) {
              console.log(LOG, "Ad impression detected", { imgSrc });
              sendEvent(buildPayload("ad_impression", imgSrc));
            }
            impressionObserver.unobserve(img);
          }
        }
      },
      { threshold: 0.5 }
    );
    function observeAdImages(root = document) {
      const imgs = root.querySelectorAll('img[alt="ad"]');
      imgs.forEach((img) => {
        if (!observedElements.has(img)) {
          observedElements.add(img);
          impressionObserver.observe(img);
        }
      });
    }
    observeAdImages();
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.matches('img[alt="ad"]')) {
              if (!observedElements.has(node)) {
                observedElements.add(node);
                impressionObserver.observe(node);
              }
            } else {
              observeAdImages(node);
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
