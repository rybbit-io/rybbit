/**
 * Strip version numbers out of a user agent so the anonymous fingerprint
 * survives a browser or app update.
 *
 * `generateUserId` hashes the raw user agent, so every byte of it is part of a
 * visitor's identity — including the version tokens that change every time
 * their browser or app updates. An update therefore mints a brand-new "user"
 * for the same person on the same machine.
 *
 * On the web that damage is invisible because vendors stagger rollouts: the
 * resets dribble in over weeks and read as ordinary new-visitor acquisition.
 * It becomes obvious when an update is *synchronised* — an Electron app whose
 * auto-updater flips the whole install base inside a day re-mints every
 * identity at once, so any reporting window spanning the release counts each
 * machine twice (measured on op.gg's desktop app, 2026-08-14: `user_id`
 * overlap across the release boundary fell to 1.6%, and identity survived only
 * for the machines that had *not* updated).
 *
 * The fix is to hash a version-free view of the user agent. What we remove is
 * exactly what an update changes:
 *
 *   - numeric version tokens after a slash — `Chrome/151.0.0.0`,
 *     `Firefox/153.0`, `Edg/143.0.0.0`, `CriOS/151.0.7922.112`,
 *     `Electron/39.8.13`, `Version/26.6`
 *   - alphanumeric build ids under a known key — `Mobile/15E148`,
 *     `Build/UP1A.231005.007`
 *   - Gecko's `rv:153.0`
 *   - OS versions — `Windows NT 10.0`, `Android 15`, `CPU iPhone OS 26_6`,
 *     `Mac OS X 10_15_7`, `CrOS x86_64 14541.0.0`
 *
 * What we deliberately keep is everything that identifies the *device* rather
 * than its patch level: product names (`Chrome`, `CriOS`, `Edg`,
 * `opgg-electron-app`), form factor (`iPhone`, `iPad`, `Mobile`, `Macintosh`),
 * architecture (`Win64; x64`, `Intel`), and Android device models
 * (`SM-S928N`), hardware identifiers that sit where a version usually does
 * (`FBDV/SM-J320F`, `FBCA/armeabi-v7a`), and two-part marketing model names
 * (`Nokia 6.1 Plus`) — all of which carry digits but never change under the
 * user.

 * It is a heuristic, and it errs toward *missing* a version rather than
 * eliding a device token: a miss leaves today's behaviour (identity resets on
 * that update), while an over-elision actively fuses two people who were
 * previously counted apart. Some exotic native-app agents still reset —
 * Instagram's trailing bare APK version code, for one — which is part of why a
 * persistent client id (`anonymous_id`) remains the durable fix.
 *
 * This trades splitting for merging, the same trade `bucketIpForIdentity`
 * already makes: visitors who share an IP and a device class collapse into one
 * user, where before one visitor exploded into several across time. Merging
 * costs a headline number; splitting corrupts sessions, retention and
 * acquisition alike.
 *
 * Identity only. Reporting keeps parsing the raw user agent, so the browser and
 * OS *versions* shown in the dashboard are unaffected.
 */

/**
 * A slash-delimited *numeric* version: `Chrome/151.0.0.0`, `Version/26.6`,
 * `AppleWebKit/605.1.15`, `FBAV/440.0.0.32.108`, `MyApp/v2.3.1`.
 *
 * Deliberately numeric-only. An earlier draft elided any slash value that
 * merely *contained* a digit, which silently ate hardware identifiers that sit
 * in the same position and never change under the user — Facebook's
 * `FBDV/SM-J320F` (the Android `Build.MODEL`) and `FBCA/armeabi-v7a` (the CPU
 * ABI). Worse, `FBDV/iPhone12,8` became `FBDV/#,8`, collapsing every iPhone
 * model onto its point release and merging genuinely different phones.
 * Preserving anything non-numeric costs a few missed version tokens; the
 * alternative cost was fusing distinct devices, which is the failure this
 * whole module exists to prevent.
 */
const SLASHED_VERSION = /\/v?[0-9]+(?:[._][0-9]+)*/g;

/**
 * Build identifiers, which are alphanumeric rather than numeric and so fall
 * outside `SLASHED_VERSION`, but do change on every OS update:
 * `Build/UP1A.231005.007`, `Mobile/15E148`. Matched by key, because only these
 * keys are unambiguous — a bare alphanumeric token elsewhere is far more likely
 * to be a model name.
 */
const SLASHED_BUILD = /\b(Build|Mobile)\/[0-9A-Za-z._-]+/g;

/** Gecko's `rv:153.0` revision token. */
const GECKO_REVISION = /\brv:[0-9][0-9._]*/g;

/**
 * A bare, space-delimited dotted version — the trailing `8.0.14` in
 * `RybbitReactNative/0.1.1 8.0.14`, or Instagram's `76.0.0.15.395`.
 *
 * Three numeric groups minimum. Two would also match `Nokia 6.1 Plus` and
 * `Nokia 8.3 Plus`, whose `6.1` and `8.3` are *model* names — eliding them
 * merges two different handsets. Marketing names stop at two components;
 * software versions in this position generally have three or more. Applied
 * last, once the slash and OS rules have claimed the versions they own.
 */
const BARE_VERSION = /(?<=^|[ (;])[0-9]+(?:\.[0-9]+){2,}(?=$|[ );])/g;

/**
 * OS version numbers, matched only where an OS name introduces them so that
 * device models keep their digits. `_` separators cover Apple's `10_15_7`
 * style; the trailing `x86_64`-aware form covers ChromeOS.
 */
const OS_VERSIONS: RegExp[] = [
  /\b(Windows NT) [0-9][0-9._]*/g,
  /\b(Windows Phone(?: OS)?) [0-9][0-9._]*/g,
  /\b(Android)[ /][0-9][0-9._]*/g,
  /\b(CPU(?: iPhone)? OS) [0-9][0-9._]*/g,
  /\b(Mac OS X) [0-9][0-9._]*/g,
  /\b(CrOS [^ )]+) [0-9][0-9._]*/g,
];

/** Placeholder standing in for every elided version. */
const ELIDED = "#";

/**
 * The identity-bearing view of a user agent: the same string with every version
 * number replaced by `#`.
 *
 * Pure and allocation-light — this runs once per ingested event.
 */
export function normalizeUserAgentForIdentity(userAgent: string): string {
  if (!userAgent) return userAgent;

  let normalized = userAgent
    .replace(SLASHED_VERSION, `/${ELIDED}`)
    .replace(SLASHED_BUILD, `$1/${ELIDED}`)
    .replace(GECKO_REVISION, `rv:${ELIDED}`);

  for (const pattern of OS_VERSIONS) {
    normalized = normalized.replace(pattern, `$1 ${ELIDED}`);
  }

  return normalized.replace(BARE_VERSION, ELIDED);
}
