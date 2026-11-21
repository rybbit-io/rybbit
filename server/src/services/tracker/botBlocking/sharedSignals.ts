/**
 * Definitions more than one rule depends on, kept in one place so they cannot
 * drift apart: the anomaly scorer's hosting-range rule and the learned
 * low-engagement network list both ask "did a person do something?" and both
 * need to know which networks are a crowd by construction.
 */

/**
 * What counts as a person doing something. Vitals are absent on purpose: they
 * are near-universal and fleets send them. Custom events are absent too — a
 * scripted checkout test fires them, and so did the largest crawler measured.
 */
export const HUMAN_INTERACTION_EVENT_TYPES: ReadonlySet<string> = new Set([
  "button_click",
  "input_change",
  "copy",
  "form_submit",
  "outbound",
]);

/**
 * SASE egress: Cato, Zscaler and Netskope route whole companies through cloud
 * addresses, which a hosting flag cannot tell from a rented server.
 */
export const SASE_EGRESS_ASNS: ReadonlySet<number> = new Set([
  13150, // Cato Networks
  22616, // Zscaler
  55256, // Netskope
]);

/** Consumer relays: one range is thousands of unrelated people. */
export const RELAY_EGRESS_ASNS: ReadonlySet<number> = new Set([
  13335, // Cloudflare — WARP, iCloud Private Relay
  36183, // Akamai — iCloud Private Relay
  20940, // Akamai
  54113, // Fastly — iCloud Private Relay
]);
