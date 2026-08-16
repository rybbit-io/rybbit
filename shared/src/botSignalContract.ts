/**
 * The Bot Signal contract — the wire format the tracker and the server both speak.
 *
 * The tracker computes a weighted score and a compact signal bitmask in the
 * browser and sends them as `_bs`/`_bsm`; the server re-derives the environment
 * signals it can see server-side, decomposes the mask into convicting vs.
 * corroborating evidence, and aggregates the bits for diagnostics. All three
 * consumers must agree bit-for-bit, so the bit layout, the weights, the
 * plausible-dimension bounds, the implausible-viewport list and the mask's valid
 * range live here rather than being transcribed into each of them.
 *
 * Adding a signal: append a bit, give it a weight, and add it to
 * STRONG_CLIENT_BOT_SIGNAL_BITS if it convicts on its own. Nothing else needs
 * to change — the ingest bound, the stats labels and the score derivation are
 * all computed from this table.
 */

export const CLIENT_BOT_SIGNAL_MASKS = {
  automationApi: 1 << 0,
  zeroOuterDimensions: 1 << 1,
  missingChrome: 1 << 2,
  swiftShader: 1 << 3,
  emptyPlugins: 1 << 4,
  defaultViewport800x600: 1 << 5,
  defaultViewport1024x768: 1 << 6,
  impossibleDimensions: 1 << 7,
  outerDimensionsWeird: 1 << 8,
  pluginApiAbsence: 1 << 9,
  defaultViewport1280x1200: 1 << 10,
  squareScreen: 1 << 11,
  missingScreenDimensions: 1 << 12,
} as const;

export type ClientBotSignalName = keyof typeof CLIENT_BOT_SIGNAL_MASKS;

export const CLIENT_BOT_SIGNAL_NAMES = Object.keys(CLIENT_BOT_SIGNAL_MASKS) as ClientBotSignalName[];

/**
 * Weight each signal contributes to the bot score. The tracker sums these as it
 * detects signals; the server sums them back out of the mask to tell apart the
 * signals that convict from the ones that only corroborate.
 */
export const CLIENT_BOT_SIGNAL_WEIGHTS: Record<ClientBotSignalName, number> = {
  automationApi: 3,
  zeroOuterDimensions: 2,
  missingChrome: 1,
  swiftShader: 1,
  emptyPlugins: 1,
  defaultViewport800x600: 3,
  defaultViewport1024x768: 3,
  impossibleDimensions: 3,
  outerDimensionsWeird: 2,
  pluginApiAbsence: 0,
  defaultViewport1280x1200: 3,
  squareScreen: 3,
  missingScreenDimensions: 1,
};

/**
 * Every bit this contract defines — and therefore the largest `_bsm` a current
 * tracker can send. The ingest schema bounds `_bsm` by this value, so appending
 * a bit above widens the bound with it. A hard-coded bound is how the 12th bit
 * (squareScreen = 2048) came to fail validation and drop whole events.
 */
export const ALL_CLIENT_BOT_SIGNAL_BITS = CLIENT_BOT_SIGNAL_NAMES.reduce(
  (mask, name) => mask | CLIENT_BOT_SIGNAL_MASKS[name],
  0
);

/**
 * Signals automation-specific enough to convict on their own. The remaining
 * (weak) signals — empty plugins, SwiftShader, zero outer dimensions, missing
 * window.chrome, absent screen dimensions — all occur on real devices (Android
 * Chrome ships empty plugins; low-end GPUs fall back to SwiftShader;
 * prerendered pages report zero outer dimensions; a server-side or native
 * integration has no screen to report), so they corroborate other layers but
 * never convict.
 */
export const STRONG_CLIENT_BOT_SIGNAL_BITS =
  CLIENT_BOT_SIGNAL_MASKS.automationApi |
  CLIENT_BOT_SIGNAL_MASKS.impossibleDimensions |
  CLIENT_BOT_SIGNAL_MASKS.defaultViewport800x600 |
  CLIENT_BOT_SIGNAL_MASKS.defaultViewport1024x768 |
  CLIENT_BOT_SIGNAL_MASKS.defaultViewport1280x1200 |
  CLIENT_BOT_SIGNAL_MASKS.squareScreen;

/** Upper bound on the reported bot score, on both sides of the wire. */
export const MAX_CLIENT_BOT_SCORE = 10;

/**
 * Plausible bounds for `screen.width`/`screen.height` — the physical display,
 * not the window, so neither a resized window nor a zoomed page moves them.
 * The smallest real phone screens report ~240 CSS px; the largest single
 * display (8K) reports 7680. Values outside this range come from synthetic
 * renderers: production traffic outside it is 1x1, 16384x16384, and
 * 1920x10000-style screenshot viewports on cloud ASNs, with no engagement.
 */
export const MIN_PLAUSIBLE_SCREEN_DIMENSION = 200;
export const MAX_PLAUSIBLE_SCREEN_DIMENSION = 8192;

/**
 * Default automation/display-server geometries. 1280x1200 is not a panel size
 * any desktop ships; it is a headless window geometry, and in production it
 * appears essentially only on scraper fleets (27M events in one week from a
 * single crawler, against a few hundred from everything else combined). Gated
 * on a desktop user agent, where these sizes are implausible.
 */
export const IMPLAUSIBLE_DESKTOP_VIEWPORTS: readonly {
  width: number;
  height: number;
  signal: ClientBotSignalName;
}[] = [
  { width: 800, height: 600, signal: "defaultViewport800x600" },
  { width: 1024, height: 768, signal: "defaultViewport1024x768" },
  { width: 1280, height: 1200, signal: "defaultViewport1280x1200" },
];

/**
 * `missingScreenDimensions` is the one signal the tracker never sets: a browser
 * always has `window.screen`, so only the server can observe that a hit arrived
 * carrying no dimensions at all. It is deliberately weak (weight 1, never
 * strong) and web-only — a native SDK or a server-side integration has no
 * screen, and neither is a bot. It exists so that the geometry rules, which are
 * skipped outright when nothing is reported, leave a trace of having been
 * skipped rather than silently passing the hit.
 */
export function isPlausibleScreenDimensions(width: number, height: number): boolean {
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width >= MIN_PLAUSIBLE_SCREEN_DIMENSION &&
    height >= MIN_PLAUSIBLE_SCREEN_DIMENSION &&
    width <= MAX_PLAUSIBLE_SCREEN_DIMENSION &&
    height <= MAX_PLAUSIBLE_SCREEN_DIMENSION
  );
}

export function isDesktopUserAgent(userAgent: string): boolean {
  return /Windows NT|Macintosh|X11|Linux x86_64/.test(userAgent) && !/Mobile|Android|iPhone|iPad/.test(userAgent);
}

/**
 * The screen-geometry rules, evaluated identically in the browser (against
 * `window.screen`) and on the server (against the reported dimensions, so the
 * rules apply to every hit regardless of which tracker version sent it).
 *
 * An implausible display short-circuits: there is nothing to say about the
 * shape of a screen that no display reports. Otherwise, no shipping display is
 * square — every square value in production traffic is a renderer default
 * (2000x2000 on Facebook/Amazon/Google infrastructure, 1024x1024 and 1280x1280
 * on Google's, 1366x1366 and 1600x1600 on proxy fleets). Square is not gated on
 * a desktop UA: the square fleets also claim Android and iOS.
 */
export function getScreenDimensionSignals(width: number, height: number, userAgent: string): ClientBotSignalName[] {
  if (!isPlausibleScreenDimensions(width, height)) {
    return ["impossibleDimensions"];
  }

  const signals: ClientBotSignalName[] = [];

  if (width === height) {
    signals.push("squareScreen");
  }

  if (isDesktopUserAgent(userAgent)) {
    for (const viewport of IMPLAUSIBLE_DESKTOP_VIEWPORTS) {
      if (width === viewport.width && height === viewport.height) {
        signals.push(viewport.signal);
      }
    }
  }

  return signals;
}

/** The signals a mask carries, ignoring bits this contract does not define. */
export function getClientBotSignalNames(mask: number): ClientBotSignalName[] {
  return CLIENT_BOT_SIGNAL_NAMES.filter(name => (mask & CLIENT_BOT_SIGNAL_MASKS[name]) !== 0);
}

/** Uncapped sum of the weights of the signals a mask carries. */
export function scoreFromMask(mask: number): number {
  return getClientBotSignalNames(mask).reduce((total, name) => total + CLIENT_BOT_SIGNAL_WEIGHTS[name], 0);
}
