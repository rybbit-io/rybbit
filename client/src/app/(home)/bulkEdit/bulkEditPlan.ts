import type { GetSitesFromOrgResponse } from "@/api/admin/endpoints";
import { validateIPPattern } from "@/lib/ipValidation";

// Editing settings on several sites at once: what was chosen in the sheet, and the
// per-site config updates that follow from it. Pure, so the review step and the
// apply step are built from the same plan.

export type BulkSite = GetSitesFromOrgResponse["sites"][number];

// Value a toggle has while its column is still null (the column defaults in the sites table).
const TOGGLE_DEFAULTS = {
  sessionReplay: false,
  webVitals: false,
  trackSpaNavigation: true,
  trackUrlParams: true,
  trackUrlFragments: false,
  trackInitialPageView: true,
  trackOutbound: true,
  trackErrors: false,
  trackButtonClicks: false,
  trackCopy: false,
  trackFormInteractions: false,
  public: false,
  saltUserIds: false,
  blockBots: true,
  firstPartyProxy: false,
  trackIp: false,
} as const satisfies Partial<Record<keyof BulkSite, boolean>>;

export type ToggleKey = keyof typeof TOGGLE_DEFAULTS;
export const TOGGLE_KEYS = Object.keys(TOGGLE_DEFAULTS) as ToggleKey[];

// Settings a mobile app's SDK doesn't have. Site settings hides them for mobile
// sites, so a bulk edit leaves those sites alone.
const WEB_ONLY: ReadonlySet<ToggleKey> = new Set([
  "sessionReplay",
  "webVitals",
  "trackSpaNavigation",
  "trackUrlParams",
  "trackUrlFragments",
  "trackOutbound",
  "trackButtonClicks",
  "trackCopy",
  "trackFormInteractions",
]);

// Longest list the server accepts for each list setting.
export const LIST_LIMITS = {
  excludedIPs: 100,
  excludedCountries: 250,
  excludedASNs: 100,
  excludedPaths: 100,
  excludedQueryParams: 100,
  excludedHostnames: 100,
  excludedUserAgents: 100,
  tags: 20,
} as const satisfies Partial<Record<keyof BulkSite, number>>;

export type ListKey = keyof typeof LIST_LIMITS;
export const LIST_KEYS = Object.keys(LIST_LIMITS) as ListKey[];

export type ToggleChoice = "keep" | "on" | "off";
export type ListMode = "keep" | "add" | "remove" | "replace";
export type ListChoice = { mode: ListMode; values: string[] };

export type BulkChoices = {
  toggles: Partial<Record<ToggleKey, ToggleChoice>>;
  lists: Partial<Record<ListKey, ListChoice>>;
};

export const EMPTY_CHOICES: BulkChoices = { toggles: {}, lists: {} };

export type SiteConfigPatch = Partial<Record<ToggleKey, boolean>> & Partial<Record<ListKey, string[]>>;
export type SitePatch = { siteId: number; name: string; config: SiteConfigPatch };

export type PlanChange =
  | { kind: "toggle"; key: ToggleKey; value: boolean; changed: number }
  | { kind: "list"; key: ListKey; mode: Exclude<ListMode, "keep">; changed: number; overLimit: number };

export type BulkPlan = {
  /** One entry per site that would actually change. */
  patches: SitePatch[];
  /** One entry per setting moved off Keep, including those that change nothing. */
  changes: PlanChange[];
};

export function toggleApplies(site: BulkSite, key: ToggleKey): boolean {
  return !(site.type === "mobile" && WEB_ONLY.has(key));
}

export function toggleValue(site: BulkSite, key: ToggleKey): boolean {
  return site[key] ?? TOGGLE_DEFAULTS[key];
}

/** How many of the sites this toggle exists on, and how many of those have it on. */
export function toggleSummary(sites: BulkSite[], key: ToggleKey): { on: number; total: number } {
  const applicable = sites.filter(site => toggleApplies(site, key));
  return { on: applicable.filter(site => toggleValue(site, key)).length, total: applicable.length };
}

export function listValue(site: BulkSite, key: ListKey): string[] {
  // The column is free-form JSON, so trust nothing about its shape.
  const stored: unknown = site[key];
  return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : [];
}

/** How many of the sites have at least one entry in this list. */
export function listSummary(sites: BulkSite[], key: ListKey): number {
  return sites.filter(site => listValue(site, key).length > 0).length;
}

// The form two entries are compared in, so entries that exclude the same traffic
// count as one: tracking matches every exclusion without regard to case, and reads
// "AS13335", "as13335" and "13335" as the same network. Tags are compared as written.
function canonical(key: ListKey, value: string): string {
  const trimmed = value.trim();
  switch (key) {
    case "tags":
      return trimmed;
    case "excludedCountries":
      return trimmed.toUpperCase();
    case "excludedASNs": {
      const digits = trimmed.replace(/^AS/i, "");
      return /^\d+$/.test(digits) ? String(Number(digits)) : digits.toLowerCase();
    }
    default:
      return trimmed.toLowerCase();
  }
}

/** Trims, drops blanks and duplicates, and stores country codes the way the server wants them. */
export function normalizeList(key: ListKey, values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = key === "excludedCountries" ? raw.trim().toUpperCase() : raw.trim();
    const id = canonical(key, value);
    if (!value || seen.has(id)) continue;
    seen.add(id);
    result.push(value);
  }
  return result;
}

export type ListValueError = "ip" | "country" | "asn" | "queryParam" | "tooLong";

const MAX_ENTRY_LENGTH: Partial<Record<ListKey, number>> = {
  excludedPaths: 2048,
  excludedQueryParams: 512,
  excludedHostnames: 253,
  excludedUserAgents: 512,
  tags: 50,
};

/** Why the server would reject this entry, or null when it is fine. Mirrors updateSiteConfig's schema. */
export function validateListValue(key: ListKey, raw: string): ListValueError | null {
  const value = raw.trim();
  const maxLength = MAX_ENTRY_LENGTH[key];
  if (maxLength !== undefined && value.length > maxLength) return "tooLong";
  switch (key) {
    case "excludedIPs":
      return validateIPPattern(value).valid ? null : "ip";
    case "excludedCountries":
      return /^[A-Za-z]{2}$/.test(value) ? null : "country";
    case "excludedASNs":
      return /^(?:AS)?\d{1,10}$/i.test(value) && Number(value.replace(/^AS/i, "")) <= 4294967295 ? null : "asn";
    case "excludedQueryParams":
      return value.startsWith("=") ? "queryParam" : null;
    default:
      return null;
  }
}

// Add and Remove leave the entries a site keeps exactly as they are stored.
function nextList(key: ListKey, current: string[], choice: ListChoice): string[] {
  const values = normalizeList(key, choice.values);
  if (choice.mode === "replace") return values;
  if (choice.mode === "remove") {
    const drop = new Set(values.map(value => canonical(key, value)));
    return current.filter(value => !drop.has(canonical(key, value)));
  }
  const present = new Set(current.map(value => canonical(key, value)));
  return [...current, ...values.filter(value => !present.has(canonical(key, value)))];
}

// The server only takes upper-case country codes, and older rows can hold others.
const forServer = (key: ListKey, list: string[]) =>
  key === "excludedCountries" ? list.map(value => value.toUpperCase()) : list;

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((value, i) => value === b[i]);

export function buildPlan(sites: BulkSite[], choices: BulkChoices): BulkPlan {
  const configs = new Map<number, SiteConfigPatch>();
  const patch = (site: BulkSite) => {
    let config = configs.get(site.siteId);
    if (!config) {
      config = {};
      configs.set(site.siteId, config);
    }
    return config;
  };
  const changes: PlanChange[] = [];

  for (const key of TOGGLE_KEYS) {
    const choice = choices.toggles[key] ?? "keep";
    if (choice === "keep") continue;
    const value = choice === "on";
    let changed = 0;
    for (const site of sites) {
      if (!toggleApplies(site, key) || toggleValue(site, key) === value) continue;
      patch(site)[key] = value;
      changed++;
    }
    changes.push({ kind: "toggle", key, value, changed });
  }

  for (const key of LIST_KEYS) {
    const choice = choices.lists[key];
    if (!choice || choice.mode === "keep") continue;
    // Adding or removing nothing is a no-op; replacing with nothing clears the list.
    if (choice.mode !== "replace" && normalizeList(key, choice.values).length === 0) continue;
    let changed = 0;
    let overLimit = 0;
    for (const site of sites) {
      const current = listValue(site, key);
      const next = nextList(key, current, choice);
      if (sameList(current, next)) continue;
      if (next.length > LIST_LIMITS[key]) {
        overLimit++;
        continue;
      }
      patch(site)[key] = forServer(key, next);
      changed++;
    }
    changes.push({ kind: "list", key, mode: choice.mode, changed, overLimit });
  }

  const patches = sites.flatMap(site => {
    const config = configs.get(site.siteId);
    return config ? [{ siteId: site.siteId, name: site.name, config }] : [];
  });
  return { patches, changes };
}

/**
 * Narrows a plan built from newer site data to the writes that were reviewed: the
 * same sites and the same settings on each. The values come from the newer plan, so
 * a list is still merged into what the site has now, but a site or setting that
 * only needs changing since the review is left out rather than written unseen.
 */
export function restrictPatches(fresh: SitePatch[], reviewed: SitePatch[]): SitePatch[] {
  const reviewedKeys = new Map(reviewed.map(patch => [patch.siteId, new Set(Object.keys(patch.config))]));
  return fresh.flatMap(patch => {
    const allowed = reviewedKeys.get(patch.siteId);
    const entries = Object.entries(patch.config).filter(([key]) => allowed?.has(key));
    return entries.length > 0 ? [{ ...patch, config: Object.fromEntries(entries) as SiteConfigPatch }] : [];
  });
}

export type PatchResult = { patch: SitePatch; error?: string };

/**
 * Sends each site's update, a few at a time. One site failing doesn't stop the
 * rest: every site gets a result, in the order given.
 */
export async function applyPatches(
  patches: SitePatch[],
  update: (siteId: number, config: SiteConfigPatch) => Promise<unknown>,
  onProgress?: (done: number) => void,
  concurrency = 4
): Promise<PatchResult[]> {
  const results: PatchResult[] = new Array(patches.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < patches.length) {
      const index = next++;
      const patch = patches[index];
      try {
        await update(patch.siteId, patch.config);
        results[index] = { patch };
      } catch (error) {
        results[index] = { patch, error: error instanceof Error ? error.message : String(error) };
      }
      onProgress?.(++done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, patches.length) }, worker));
  return results;
}
