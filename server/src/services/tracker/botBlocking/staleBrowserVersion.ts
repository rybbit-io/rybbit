/**
 * Stale browser major version detection.
 *
 * A user-agent claiming a browser release that predates the cutoff below is,
 * in practice, a fabricated one. The fleets that motivated this rule rotate a
 * fixed list of old version strings to mint fresh identities: one of them spans
 * Chrome 39-60 x Android 5.0-8.0 uniformly (~400 identities per cell, ~1 event
 * each) across 40+ countries and thousands of sites, which defeats every
 * per-identity rate rule and stays under the cohort-uniformity rule's volume
 * gate by spreading thinly across sites.
 *
 * Measured over a full day of production traffic, Chrome/Edge/Firefox traffic
 * reporting a major version below the cutoff was 36,807 visitors producing
 * 1.04-1.18 events each, with 15 interaction events in total (0.035% of events,
 * against 6.1% for current-version traffic) and web vitals on 2.5% of pageviews
 * (against 26%). The population is not human, so this convicts.
 */

/**
 * Chrome 70 shipped 2018-10; Firefox 70 shipped 2019-10. Both auto-update
 * aggressively, and a browser this old could not run the tracker that reported
 * the hit. Deliberately far behind current (150+) so that genuinely old but
 * real installs — which cluster in the 90-110 range and do show engagement —
 * stay out of scope.
 */
const MIN_SUPPORTED_MAJOR_VERSION = 70;

/**
 * Version tokens whose numbering tracks a fast-moving, auto-updating release
 * train, so a low value is meaningful.
 *
 * Excluded on purpose:
 * - `Version/` (Safari) — its numbering is slow and tied to the OS, so real
 *   devices legitimately sit many majors back.
 * - `SamsungBrowser`, `OPR` — separate numbering schemes on their own cadence.
 * - Android WebView (`; wv`) — an unupdated system WebView genuinely reports an
 *   old Chrome major, and native app traffic is not browser-shaped anyway.
 */
const VERSION_TOKEN_PATTERN = /(?:EdgiOS|EdgA|Edge|Edg|CriOS|FxiOS|Firefox|Chrome)\/(\d{1,4})/;

const WEBVIEW_PATTERN = /\bwv\b|;\s?wv\)/;

export interface StaleBrowserClassification {
  isStale: boolean;
  /** e.g. "Chrome/40" — stored as the matched pattern for auditing. */
  matchedVersion: string | null;
  majorVersion: number | null;
}

const NOT_STALE: StaleBrowserClassification = { isStale: false, matchedVersion: null, majorVersion: null };

/**
 * Classify a user-agent by the major version of its browser release token.
 */
export function classifyStaleBrowserVersion(userAgent: string | null | undefined): StaleBrowserClassification {
  if (typeof userAgent !== "string" || userAgent.length === 0) {
    return NOT_STALE;
  }

  if (WEBVIEW_PATTERN.test(userAgent)) {
    return NOT_STALE;
  }

  const match = VERSION_TOKEN_PATTERN.exec(userAgent);
  if (!match) {
    return NOT_STALE;
  }

  const majorVersion = Number(match[1]);
  if (!Number.isFinite(majorVersion) || majorVersion <= 0 || majorVersion >= MIN_SUPPORTED_MAJOR_VERSION) {
    return NOT_STALE;
  }

  return {
    isStale: true,
    matchedVersion: `${match[0].split("/")[0]}/${majorVersion}`,
    majorVersion,
  };
}
