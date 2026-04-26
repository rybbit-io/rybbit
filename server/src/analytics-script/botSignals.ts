/**
 * Client-side bot detection signals.
 *
 * Checks browser environment characteristics that distinguish real browsers
 * from headless/automated ones. Returns a single integer score — the number
 * of bot-like signals detected. Only the score is transmitted, never the
 * individual signal values, preserving user privacy.
 */
export function getBotScore(): number {
  let score = 0;

  try {
    // 1. navigator.webdriver — set to true when controlled by automation (Selenium, Puppeteer, Playwright)
    if ((navigator as any).webdriver === true) {
      score++;
    }

    // 2. Zero outer dimensions — headless browsers return 0 for outer window size
    if (window.outerHeight === 0 || window.outerWidth === 0) {
      score++;
    }

    // 3. Zero network RTT — real networks always have latency > 0
    if ((navigator as any).connection?.rtt === 0) {
      score++;
    }

    // 4. Missing window.chrome on a Chrome UA — real Chrome always exposes this object
    //    Only flag for non-WebView Chrome UAs; Android WebView doesn't expose window.chrome
    if (!((window as any).chrome) && /Chrome\//.test(navigator.userAgent) && !/\bwv\b|; wv\)/.test(navigator.userAgent)) {
      score++;
    }

    // 5. WebGL renderer check — headless Chrome uses "Google SwiftShader" (software renderer)
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (typeof renderer === "string" && renderer.includes("SwiftShader")) {
            score++;
          }
        }
      }
    } catch (e) {
      // WebGL not available — not a bot signal by itself
    }

    // 6. No plugins — headless Chrome has 0 plugins, real Chrome has at least PDF viewer
    //    Only flag for non-WebView Chrome UAs; Firefox and Android WebView can legitimately have 0
    if (navigator.plugins.length === 0 && /Chrome\//.test(navigator.userAgent) && !/\bwv\b|; wv\)/.test(navigator.userAgent)) {
      score++;
    }

    // 7. Notification permission inconsistency — headless mode can return contradictory values
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        // In headless, permission is always "denied" but permission query may say "prompt"
        // We only count this if other signals are also present (it's a weak signal alone)
        // Skip — too many false positives on mobile browsers
      }
    } catch (e) {
      // Not available
    }
  } catch (e) {
    // If any top-level access fails, return whatever we've accumulated
  }

  return score;
}
