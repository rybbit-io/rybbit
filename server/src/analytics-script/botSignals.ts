/**
 * Client-side bot detection signals.
 *
 * Checks browser environment characteristics that distinguish real browsers
 * from headless/automated ones. Returns a single weighted integer score.
 * Only the score is transmitted, never individual signal values, preserving user privacy.
 */
let cachedBotScore: number | null = null;

const MAX_BOT_SCORE = 10;

export function getBotScore(): number {
  if (cachedBotScore !== null) {
    return cachedBotScore;
  }

  cachedBotScore = calculateBotScore();
  return cachedBotScore;
}

function calculateBotScore(): number {
  let score = 0;

  try {
    const userAgent = navigator.userAgent;
    const isChromeLike = /Chrome\//.test(userAgent) && !/\bwv\b|; wv\)/.test(userAgent);

    // 1. navigator.webdriver — strong signal for Selenium, Puppeteer, Playwright, and similar automation
    if ((navigator as any).webdriver === true) {
      score += 3;
    }

    // 2. Zero outer dimensions — common in headless/browserless environments
    if (window.outerHeight === 0 || window.outerWidth === 0) {
      score += 2;
    }

    // 3. Missing window.chrome on a Chrome UA — real Chrome usually exposes this object
    //    Only flag for non-WebView Chrome UAs; Android WebView doesn't expose window.chrome
    if (!((window as any).chrome) && isChromeLike) {
      score++;
    }

    // 4. WebGL renderer check — headless/containerized Chrome often uses Google SwiftShader
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

    // 5. No plugins — weak supporting signal for Chrome-like UAs only
    if (navigator.plugins.length === 0 && isChromeLike) {
      score++;
    }
  } catch (e) {
    // If any top-level access fails, return whatever we've accumulated
  }

  return Math.min(score, MAX_BOT_SCORE);
}

export function resetBotScoreCacheForTests() {
  cachedBotScore = null;
}
