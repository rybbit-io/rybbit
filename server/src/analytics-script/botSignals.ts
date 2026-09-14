/**
 * Client-side bot detection signals.
 *
 * Checks browser environment characteristics that distinguish real browsers
 * from headless/automated ones. Returns a single weighted integer score.
 * The tracker sends the score plus a compact signal bitmask for aggregate diagnostics.
 *
 * The bit layout, the weights and the screen-geometry rules are the wire
 * contract with the server and live in @rybbit/shared/botSignalContract, which
 * both sides import. Nothing about the mask is defined here.
 */
// Imported from the contract module rather than the package barrel: this is a
// browser bundle, and the barrel would drag unrelated shared runtime code
// (the scope tables) onto every tracked page.
import {
  CLIENT_BOT_SIGNAL_MASKS,
  CLIENT_BOT_SIGNAL_WEIGHTS,
  ClientBotSignalName,
  getScreenDimensionSignals,
  MAX_CLIENT_BOT_SCORE,
} from "@rybbit/shared/dist/botSignalContract.js";

interface BotSignalResult {
  score: number;
  mask: number;
}

let cachedBotSignals: BotSignalResult | null = null;

export function getBotScore(): number {
  return getBotSignals().score;
}

export function getBotSignalMask(): number {
  return getBotSignals().mask;
}

function isPrerendering(): boolean {
  return (document as { prerendering?: boolean }).prerendering === true;
}

function getBotSignals(): BotSignalResult {
  // A prerendered page reports zero outer dimensions and other non-representative
  // state. Never cache a score computed before activation — recompute fresh so
  // post-activation events see the real environment.
  if (isPrerendering()) {
    return calculateBotSignals();
  }
  cachedBotSignals ??= calculateBotSignals();
  return cachedBotSignals;
}

function calculateBotSignals(): BotSignalResult {
  let score = 0;
  let mask = 0;

  function addSignal(name: ClientBotSignalName) {
    const signalMask = CLIENT_BOT_SIGNAL_MASKS[name];
    if ((mask & signalMask) !== 0) {
      return;
    }
    mask |= signalMask;
    score += CLIENT_BOT_SIGNAL_WEIGHTS[name];
  }

  try {
    const userAgent = navigator.userAgent;
    const isChromeLike = /Chrome\//.test(userAgent) && !/\bwv\b|; wv\)/.test(userAgent);
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
      addSignal("automationApi");
    }

    // 2. Zero outer dimensions — common in headless/browserless environments.
    //    Skipped while prerendering: Chrome legitimately reports 0 there.
    if ((outerHeight === 0 || outerWidth === 0) && !isPrerendering()) {
      addSignal("zeroOuterDimensions");
    }

    // 3. Screen geometry — displays outside the range any real one reports,
    //    square screens, and default automation viewports. The rules are the
    //    contract's, so the server derives the same signals from the reported
    //    dimensions regardless of which tracker version sent them.
    for (const signal of getScreenDimensionSignals(screenWidth, screenHeight, userAgent)) {
      addSignal(signal);
    }

    // 4. Outer dimensions smaller than inner dimensions should not happen in normal desktop browsers
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
      addSignal("outerDimensionsWeird");
    }

    // 5. Missing window.chrome on a Chrome UA — real Chrome usually exposes this object
    //    Only flag for non-WebView Chrome UAs; Android WebView doesn't expose window.chrome
    let hasPluginOrApiAbsence = false;
    if (!(window as any).chrome && isChromeLike) {
      addSignal("missingChrome");
      hasPluginOrApiAbsence = true;
    }

    // 6. WebGL renderer check — headless/containerized Chrome often uses Google SwiftShader
    try {
      const canvas = document.createElement("canvas");
      const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
      if (gl) {
        try {
          const rendererParts: string[] = [];
          const rendererRaw = gl.getParameter(gl.RENDERER);
          if (typeof rendererRaw === "string") {
            rendererParts.push(rendererRaw);
          }
          try {
            type WebGlDebugRendererInfo = {UNMASKED_RENDERER_WEBGL:number};
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as WebGlDebugRendererInfo | null;
            if (debugInfo) {
              const unmaskedRaw = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
              if (typeof unmaskedRaw === "string") {
                rendererParts.push(unmaskedRaw);
              }
            }
          } catch {
            // Firefox Privacy
          }
          if (rendererParts.join(" ").toLowerCase().includes("swiftshader")) {
            addSignal("swiftShader");
          }
        } finally {
          releaseWebGlContext(canvas, gl);
        }
      }
    } catch {
      // WebGL not available — not a bot signal by itself
    }

    // 7. No plugins — weak supporting signal for Chrome-like UAs only
    if ((!navigator.plugins || navigator.plugins.length === 0) && isChromeLike) {
      addSignal("emptyPlugins");
      hasPluginOrApiAbsence = true;
    }

    if (hasPluginOrApiAbsence) {
      addSignal("pluginApiAbsence");
    }
  } catch (e) {
    // If any top-level access fails, return whatever we've accumulated
  }

  return {
    score: Math.min(score, MAX_CLIENT_BOT_SCORE),
    mask,
  };
}

/**
 * Chrome caps live WebGL contexts per page (~16) and evicts the oldest when
 * exceeded, so the probe context must be released eagerly rather than left
 * to lazy GC — leaking it can break or crash host pages that use WebGL.
 */
function releaseWebGlContext(canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
  try {
    const loseContextExt = gl.getExtension("WEBGL_lose_context") as { loseContext?: () => void } | null;
    loseContextExt?.loseContext?.();
  } catch {
    // best-effort cleanup
  }
  canvas.width = 0;
  canvas.height = 0;
}

export function resetBotScoreCacheForTests() {
  cachedBotSignals = null;
}
