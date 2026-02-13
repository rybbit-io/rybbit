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

  document.addEventListener("click", function (e) {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;

    const img = anchor.querySelector("img");
    if (!img) {
      console.debug(LOG, "Click on <a> but no <img> found inside, skipping");
      return;
    }

    const imgSrc = img.src; // fully resolved URL
    if (!imgSrc) {
      console.debug(LOG, "Image has no src, skipping");
      return;
    }

    let imgHostname = "";
    try {
      imgHostname = new URL(imgSrc).hostname;
    } catch {
      // not a valid URL, use as-is
    }

    const payload = {
      type: "ad_click" as const,
      site_id: siteId,
      pathname: imgSrc,
      hostname: imgHostname,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      language: navigator.language,
      page_title: document.title,
      referrer: document.referrer,
    };

    const url = analyticsHost + "/api/track";

    console.log(LOG, "Sending ad_click", { url, payload });

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(url, JSON.stringify(payload));
      console.log(LOG, "sendBeacon result:", sent);
    } else {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then((r) => console.log(LOG, "fetch response:", r.status))
        .catch((err) => console.error(LOG, "fetch error:", err));
    }
  });
})();
