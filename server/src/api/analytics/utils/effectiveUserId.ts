/**
 * How a "user" is counted across analytics queries.
 *
 * `user_id` is an anonymous device fingerprint — sha256(bucketed IP + user agent).
 * It collides whenever visitors share an egress IP and a browser build (corporate
 * proxies, VPNs, Private Relay, CGNAT, managed fleets) and it splits whenever one
 * person uses two devices. `identified_user_id` is the stable ID the site passes to
 * `identify()`, so it is strictly better information wherever it is present.
 *
 * Every user-facing count therefore keys on the identity when there is one and falls
 * back to the fingerprint otherwise. For sites that never call `identify()` the
 * column is '' on every row and these expressions collapse to plain `user_id`,
 * leaving their numbers byte-identical.
 */

/**
 * Event-level key. Use when the query aggregates raw events and has no session
 * grain to resolve against.
 *
 * Caveat: the first pageview of a visit fires before `identify()` resolves, so
 * those rows carry '' and count under the fingerprint — one visitor can register
 * as two users in the window where they cross over. Prefer
 * {@link EFFECTIVE_SESSION_USER_ID} when the query already groups by session.
 */
export const effectiveUserId = (tableAlias = "") => {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  return `COALESCE(NULLIF(${prefix}identified_user_id, ''), ${prefix}user_id)`;
};

/**
 * Session-level key, for use inside a `GROUP BY session_id` aggregation.
 *
 * Sessions are keyed per identified user (see sessionsService.getSessionKey), so a
 * session's events either all carry the same identity or none do — taking any
 * non-empty `identified_user_id` in the session is well defined, and it avoids the
 * pre-identify split that the event-level key has. Pre-#1045 rows, where several
 * identities could share one anonymous session, resolve to whichever identity the
 * aggregate happens to see; that is no worse than the fingerprint they resolve to today.
 */
export const EFFECTIVE_SESSION_USER_ID = `COALESCE(NULLIF(anyIf(identified_user_id, identified_user_id != ''), ''), anyLast(user_id))`;

/**
 * Predicate for "these events belong to the user identified by `valueExpr`", where
 * the value may be either a custom user ID or an anonymous device fingerprint —
 * both appear in dashboard URLs and filters.
 *
 * The fingerprint branch is guarded on `identified_user_id = ''` for the same reason
 * the counts above key on identity: one fingerprint can cover many people behind a
 * shared IP and browser. Matching a fingerprint unguarded pulls in every identified
 * user who happens to sit behind it, so an anonymous visitor's profile would show a
 * whole office's activity. Anonymous rows belong to the device; identified rows
 * belong to the person. See deleteUser for the same predicate over an alias set.
 *
 * `valueExpr` must already be a bound parameter (`{userId:String}`) or an escaped
 * literal — it is interpolated verbatim.
 */
export const matchesUser = (valueExpr: string, tableAlias = "") => {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  return `(${prefix}identified_user_id = ${valueExpr} OR (${prefix}user_id = ${valueExpr} AND ${prefix}identified_user_id = ''))`;
};

/** Exact complement of {@link matchesUser}, so equals/not_equals filters partition the rows. */
export const doesNotMatchUser = (valueExpr: string, tableAlias = "") => `NOT ${matchesUser(valueExpr, tableAlias)}`;
