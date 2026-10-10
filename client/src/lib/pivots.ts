import { Filter, FilterParameter, TimeBucket } from "@rybbit/shared";
import { createSerializer } from "nuqs";
import { Comparison, ComparisonMode, Time } from "../components/DateSelector/types";
import { SESSION_PAGE_FILTERS, USER_PAGE_FILTERS } from "./filterGroups";
import { analyticsParsers } from "./parsers";
import type { StatType } from "./store";
import { comparisonToUrlParams, timeToUrlParams } from "./time";

/**
 * A pivot is the doorway from an aggregate (a table row, a funnel step, a
 * chart cell) to the people behind it: the same period and filters, narrowed
 * by the filters that identify the aggregate, on the page that lists them.
 */
export type PivotTarget = "sessions" | "users" | "replays";

const PIVOT_ROUTES: Record<PivotTarget, string> = {
  sessions: "sessions",
  users: "users",
  replays: "replay",
};

/**
 * The filters each target's list query actually sends. The Sessions and Users
 * lists drop every parameter outside their page set before asking the server
 * (useGetSessions, useGetUsers); the replay list sends the store's filters
 * untouched, so it has no restriction.
 */
const PIVOT_FILTERS: Record<PivotTarget, readonly FilterParameter[] | null> = {
  sessions: SESSION_PAGE_FILTERS,
  users: USER_PAGE_FILTERS,
  replays: null,
};

/**
 * Whether the target can honour every filter that identifies the aggregate. A
 * target that would drop one of them lists everyone instead of the people
 * behind the number, so the pivot must not be offered at all.
 */
export function canPivot(target: PivotTarget, extraFilters: Filter[]): boolean {
  const supported = PIVOT_FILTERS[target];
  return supported === null || extraFilters.every(filter => supported.includes(filter.parameter));
}

/**
 * The current filters narrowed by `extras`. An extra takes the place of a
 * current filter on the same parameter and operator and is appended
 * otherwise, which is what the store's `addFilter` does when a row is clicked.
 */
export function mergeFilters(current: Filter[], extras: Filter[]): Filter[] {
  return extras.reduce<Filter[]>((merged, extra) => {
    const index = merged.findIndex(filter => filter.parameter === extra.parameter && filter.type === extra.type);
    return index === -1 ? [...merged, extra] : merged.map((filter, i) => (i === index ? extra : filter));
  }, current);
}

/** The slice of the store a pivot carries over, plus the query string it leaves from. */
export interface PivotContext {
  site: string | number;
  /** Set on a private-link view; the link stays inside it. */
  privateKey?: string | null;
  time: Time;
  comparison: Comparison;
  bucket: TimeBucket;
  selectedStat: StatType;
  filters: Filter[];
  segmentId: number | null;
  /** The current query string. Only the embed options are read from it. */
  search?: string | URLSearchParams;
}

// Not analytics state, so the store does not hold them, but an embedded
// dashboard has to stay embedded when a pivot is followed.
const CARRIED_PARAMS = ["embed", "hideSidebar", "theme"];

const serialize = createSerializer(analyticsParsers);

/**
 * Where a pivot leads: the target page of the same site with the current
 * period, comparison, bucket, stat and segment, and the current filters
 * narrowed by `extraFilters`.
 *
 * The query string is written from the store rather than copied from the
 * address bar, so it is right on pages the URL sync does not cover (retention,
 * bots, a user profile) and never carries a page's own params to another page.
 * It is serialised with the same parsers `useSyncStateWithUrl` reads on
 * arrival.
 */
export function buildPivotHref(target: PivotTarget, context: PivotContext, extraFilters: Filter[] = []): string {
  const { site, privateKey, time, comparison, bucket, selectedStat, segmentId } = context;
  const filters = mergeFilters(context.filters, extraFilters);

  const current = new URLSearchParams(context.search);
  const carried = new URLSearchParams();
  for (const key of CARRIED_PARAMS) {
    const value = current.get(key);
    if (value !== null) carried.set(key, value);
  }

  const path = privateKey ? `/${site}/${privateKey}/${PIVOT_ROUTES[target]}` : `/${site}/${PIVOT_ROUTES[target]}`;
  const comparisonParams = comparisonToUrlParams(comparison);

  const query = serialize(carried, {
    ...timeToUrlParams(time),
    ...comparisonParams,
    // comparisonToUrlParams types the mode as a plain string.
    compare: comparisonParams.compare as ComparisonMode | null,
    bucket,
    stat: selectedStat,
    filters: filters.length > 0 ? filters : null,
    segment: segmentId,
  });

  return `${path}${query}`;
}
