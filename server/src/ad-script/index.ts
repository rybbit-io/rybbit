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

  function buildPayload(type: "ad_click" | "ad_impression", imgSrc: string) {
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
      properties: JSON.stringify({ creative_url: imgSrc }),
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

  // Ad clicks: only fire on clicks on <img alt="ad"> (or their parent anchor)
  document.addEventListener("click", function (e) {
    const target = e.target as HTMLElement;
    const adImg = target.closest('img[alt="ad"]') as HTMLImageElement | null;
    if (!adImg) return;

    const imgSrc = adImg.src;
    if (!imgSrc) return;

    const anchor = adImg.closest("a");
    console.log(LOG, "Ad click detected", { imgSrc, href: anchor?.href });

    sendEvent(buildPayload("ad_click", imgSrc));
  });

  // Ad impressions: IntersectionObserver on <img alt="ad"> elements
  const observedElements = new WeakSet<Element>();

  const impressionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
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

  function observeAdImages(root: Element | Document = document) {
    const imgs = root.querySelectorAll('img[alt="ad"]');
    imgs.forEach((img) => {
      if (!observedElements.has(img)) {
        observedElements.add(img);
        impressionObserver.observe(img);
      }
    });
  }

  // Observe existing ad images
  observeAdImages();

  // Watch for dynamically added ad images
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

  // Cleanup on page unload
  window.addEventListener("unload", () => {
    impressionObserver.disconnect();
    mutationObserver.disconnect();
  });
})();
