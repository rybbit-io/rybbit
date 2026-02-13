(function () {
  const LOG = "[rybbit-ad]";
  const siteId = "d38451f43f87";

  const scriptTag = document.currentScript as HTMLScriptElement;
  if (!scriptTag) {
    console.warn(LOG, "Could not find script tag");
    return;
  }

  const src = scriptTag.getAttribute("src") || "";
  const analyticsHost = src.split("/ad.js")[0].replace("/api", "");
  const trackUrl = analyticsHost + "/api/track";

  console.log(LOG, "Initialized", { siteId, analyticsHost });

  document.addEventListener("click", function (e) {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;

    const img = anchor.querySelector("img");
    if (!img) return;

    const imgSrc = img.src;
    if (!imgSrc) return;

    console.log(LOG, "Ad click detected", { imgSrc, href: anchor.href });

    const payload = {
      type: "ad_click" as const,
      site_id: siteId,
      pathname: imgSrc,
      hostname: window.location.hostname,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      language: navigator.language,
      page_title: document.title,
      referrer: document.referrer,
    };

    console.log(LOG, "Sending payload", payload);

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
  });
})();
