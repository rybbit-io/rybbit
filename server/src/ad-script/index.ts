(function () {
  const LOG = "[rybbit-ad]";
  const siteId = "d38451f43f87";

  const scriptTag = document.currentScript as HTMLScriptElement;
  if (!scriptTag) {
    console.warn(LOG, "Could not find script tag");
    return;
  }

  const src = scriptTag.getAttribute("src") || "";
  const analyticsHost = src.split("/frog.js")[0].replace("/api", "");
  const trackUrl = analyticsHost + "/api/track";

  console.log(LOG, "Initialized", { siteId, analyticsHost });

  // Ad creatives are marked with alt="ad" or data-ad. <video> has no alt
  // attribute, so video creatives should use data-ad; alt="ad" is still matched
  // on video so a single convention works across both formats.
  const AD_SELECTOR = 'img[alt="ad"], img[data-ad], video[alt="ad"], video[data-ad]';

  function creativeType(el: Element): "image" | "video" {
    return el instanceof HTMLVideoElement ? "video" : "image";
  }

  // For <video>, currentSrc is the URL the browser actually picked, but it stays
  // empty until loading starts — so fall back to the markup, which is readable
  // immediately whether the src is on the element or a child <source>.
  function creativeUrl(el: Element): string {
    if (el instanceof HTMLVideoElement) {
      return el.currentSrc || el.src || el.querySelector("source")?.src || "";
    }
    return (el as HTMLImageElement).src || "";
  }

  function buildPayload(type: "ad_click" | "ad_impression", el: Element, url: string) {
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
      properties: JSON.stringify({ creative_url: url, creative_type: creativeType(el) }),
    };
  }

  function sendEvent(payload: ReturnType<typeof buildPayload>) {
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
  }

  // Ad clicks: only fire on clicks on an ad creative (or their parent anchor)
  document.addEventListener("click", function (e) {
    const target = e.target as HTMLElement;
    const creative = target.closest(AD_SELECTOR);
    if (!creative) return;

    const url = creativeUrl(creative);
    if (!url) return;

    const anchor = creative.closest("a");
    console.log(LOG, "Ad click detected", { url, type: creativeType(creative), href: anchor?.href });

    sendEvent(buildPayload("ad_click", creative, url));
  });

  // Ad impressions: IntersectionObserver on ad creatives
  const observedElements = new WeakSet<Element>();

  const impressionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const creative = entry.target;
        const url = creativeUrl(creative);
        // Keep observing when there is no URL yet (e.g. a <source> added later)
        // so the impression isn't dropped on the next visibility change.
        if (!url) continue;

        console.log(LOG, "Ad impression detected", { url, type: creativeType(creative) });
        sendEvent(buildPayload("ad_impression", creative, url));
        impressionObserver.unobserve(creative);
      }
    },
    { threshold: 0.5 }
  );

  function observeAdCreatives(root: Element | Document = document) {
    root.querySelectorAll(AD_SELECTOR).forEach((creative) => {
      if (!observedElements.has(creative)) {
        observedElements.add(creative);
        impressionObserver.observe(creative);
      }
    });
  }

  // Observe existing ad creatives
  observeAdCreatives();

  // Watch for dynamically added ad creatives
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

  // Cleanup on page unload
  window.addEventListener("unload", () => {
    impressionObserver.disconnect();
    mutationObserver.disconnect();
  });
})();
