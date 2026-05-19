/**
 * Client-side bot detection signals.
 *
 * Checks browser environment characteristics that distinguish real browsers
 * from headless/automated ones. Returns a single weighted integer score.
 * The tracker sends the score plus a compact signal bitmask for aggregate diagnostics.
 */
export const CLIENT_BOT_SIGNAL_MASKS = {
  webdriver: 1 << 0,
  zeroOuterDimensions: 1 << 1,
  missingChrome: 1 << 2,
  swiftShader: 1 << 3,
  emptyPlugins: 1 << 4,
} as const;

interface BotSignalResult {
  score: number;
  mask: number;
}

let cachedBotSignals: BotSignalResult | null = null;

const MAX_BOT_SCORE = 10;

export function getBotScore(): number {
  return getBotSignals().score;
}

export function getBotSignalMask(): number {
  return getBotSignals().mask;
}

function getBotSignals(): BotSignalResult {
  cachedBotSignals ??= calculateBotSignals();
  return cachedBotSignals;
}

function calculateBotSignals(): BotSignalResult {
  let score = 0;
  let mask = 0;

  function addSignal(signalMask: number, weight: number) {
    mask |= signalMask;
    score += weight;
  }

  try {
    const userAgent = navigator.userAgent;
    const isChromeLike = /Chrome\//.test(userAgent) && !/\bwv\b|; wv\)/.test(userAgent);

    // 1. navigator.webdriver — strong signal for Selenium, Puppeteer, Playwright, and similar automation
    if ((navigator as any).webdriver === true) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.webdriver, 3);
    }

    // 2. Zero outer dimensions — common in headless/browserless environments
    if (window.outerHeight === 0 || window.outerWidth === 0) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.zeroOuterDimensions, 2);
    }

    // 3. Missing window.chrome on a Chrome UA — real Chrome usually exposes this object
    //    Only flag for non-WebView Chrome UAs; Android WebView doesn't expose window.chrome
    if (!((window as any).chrome) && isChromeLike) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.missingChrome, 1);
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
            addSignal(CLIENT_BOT_SIGNAL_MASKS.swiftShader, 1);
          }
        }
      }
    } catch (e) {
      // WebGL not available — not a bot signal by itself
    }

    // 5. No plugins — weak supporting signal for Chrome-like UAs only
    if (navigator.plugins.length === 0 && isChromeLike) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.emptyPlugins, 1);
    }
  } catch (e) {
    // If any top-level access fails, return whatever we've accumulated
  }

  return {
    score: Math.min(score, MAX_BOT_SCORE),
    mask,
  };
}

export function resetBotScoreCacheForTests() {
  cachedBotSignals = null;
}
