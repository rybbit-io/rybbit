/**
 * Client-side bot detection signals.
 *
 * Checks browser environment characteristics that distinguish real browsers
 * from headless/automated ones. Returns a single weighted integer score.
 * The tracker sends the score plus a compact signal bitmask for aggregate diagnostics.
 */
export const CLIENT_BOT_SIGNAL_MASKS = {
  automationApi: 1 << 0,
  webdriver: 1 << 0,
  zeroOuterDimensions: 1 << 1,
  missingChrome: 1 << 2,
  swiftShader: 1 << 3,
  emptyPlugins: 1 << 4,
  defaultViewport800x600: 1 << 5,
  defaultViewport1024x768: 1 << 6,
  impossibleDimensions: 1 << 7,
  outerDimensionsWeird: 1 << 8,
  pluginApiAbsence: 1 << 9,
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
    if ((mask & signalMask) !== 0) {
      return;
    }
    mask |= signalMask;
    score += weight;
  }

  try {
    const userAgent = navigator.userAgent;
    const isChromeLike = /Chrome\//.test(userAgent) && !/\bwv\b|; wv\)/.test(userAgent);
    const isDesktopUA =
      /Windows NT|Macintosh|X11|Linux x86_64/.test(userAgent) && !/Mobile|Android|iPhone|iPad/.test(userAgent);
    const screenWidth = Number(window.screen?.width);
    const screenHeight = Number(window.screen?.height);
    const outerWidth = Number(window.outerWidth);
    const outerHeight = Number(window.outerHeight);
    const innerWidth = Number(window.innerWidth);
    const innerHeight = Number(window.innerHeight);

    // 1. Automation APIs/globals — strong signal for Selenium, Puppeteer, Playwright, and similar automation
    const automationGlobalNames = [
      "__webdriver_evaluate",
      "__selenium_evaluate",
      "__webdriver_script_function",
      "__webdriver_script_func",
      "__webdriver_script_fn",
      "__fxdriver_evaluate",
      "__driver_unwrapped",
      "__webdriver_unwrapped",
      "__driver_evaluate",
      "__selenium_unwrapped",
      "__fxdriver_unwrapped",
      "_phantom",
      "callPhantom",
      "__nightmare",
      "domAutomation",
      "domAutomationController",
    ];
    const hasAutomationGlobal = automationGlobalNames.some(name => name in window || name in document);
    if ((navigator as any).webdriver === true || hasAutomationGlobal) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.automationApi, 3);
    }

    // 2. Zero outer dimensions — common in headless/browserless environments
    if (outerHeight === 0 || outerWidth === 0) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.zeroOuterDimensions, 2);
    }

    // 3. Impossible screen dimensions — invalid values from a browser-side payload
    if (
      !Number.isFinite(screenWidth) ||
      !Number.isFinite(screenHeight) ||
      screenWidth <= 0 ||
      screenHeight <= 0 ||
      screenWidth > 100000 ||
      screenHeight > 100000
    ) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.impossibleDimensions, 3);
    }

    // 4. Default automation/display server viewport sizes
    if (isDesktopUA && screenWidth === 800 && screenHeight === 600) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.defaultViewport800x600, 3);
    }
    if (isDesktopUA && screenWidth === 1024 && screenHeight === 768) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.defaultViewport1024x768, 3);
    }

    // 5. Outer dimensions smaller than inner dimensions should not happen in normal desktop browsers
    if (
      Number.isFinite(outerWidth) &&
      Number.isFinite(outerHeight) &&
      Number.isFinite(innerWidth) &&
      Number.isFinite(innerHeight) &&
      outerWidth > 0 &&
      outerHeight > 0 &&
      innerWidth > 0 &&
      innerHeight > 0 &&
      (outerWidth + 8 < innerWidth || outerHeight + 8 < innerHeight)
    ) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.outerDimensionsWeird, 2);
    }

    // 6. Missing window.chrome on a Chrome UA — real Chrome usually exposes this object
    //    Only flag for non-WebView Chrome UAs; Android WebView doesn't expose window.chrome
    let hasPluginOrApiAbsence = false;
    if (!(window as any).chrome && isChromeLike) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.missingChrome, 1);
      hasPluginOrApiAbsence = true;
    }

    // 7. WebGL renderer check — headless/containerized Chrome often uses Google SwiftShader
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

    // 8. No plugins — weak supporting signal for Chrome-like UAs only
    if ((!navigator.plugins || navigator.plugins.length === 0) && isChromeLike) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.emptyPlugins, 1);
      hasPluginOrApiAbsence = true;
    }

    if (hasPluginOrApiAbsence) {
      addSignal(CLIENT_BOT_SIGNAL_MASKS.pluginApiAbsence, 0);
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
