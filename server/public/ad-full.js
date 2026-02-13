"use strict";
(() => {
  // index.ts
  (function() {
    const scriptTag = document.currentScript;
    if (!scriptTag) return;
    const src = scriptTag.getAttribute("src") || "";
    const analyticsHost = src.split("/ad.js")[0].replace("/api", "");
    const siteId = scriptTag.getAttribute("data-site-id") || "";
    if (!siteId) return;
    document.addEventListener("click", function(e) {
      const target = e.target;
      const anchor = target.closest("a");
      if (!anchor) return;
      const img = anchor.querySelector("img");
      if (!img) return;
      const imgSrc = img.src;
      if (!imgSrc) return;
      let imgHostname = "";
      try {
        imgHostname = new URL(imgSrc).hostname;
      } catch {
      }
      const payload = {
        type: "ad_click",
        site_id: siteId,
        pathname: imgSrc,
        hostname: imgHostname,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
        page_title: document.title,
        referrer: document.referrer
      };
      const url = analyticsHost + "/api/track";
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, JSON.stringify(payload));
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {
        });
      }
    });
  })();
})();
