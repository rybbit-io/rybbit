import { Filter, FilterParameter, TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Comparison, DEFAULT_COMPARISON, Time } from "../components/DateSelector/types";
import { LITE_DASHBOARD } from "./const";
import { getDashboardTimeForRange, getStoredDashboardDefaultTime } from "./defaultTimeRange";
import {
  canGoForward as canGoForwardFrom,
  getBucketForTime,
  hasRangeTimes,
  recalculateTimeForTimezone,
  resolveComparison,
  shiftTimeBackward,
  shiftTimeForward,
} from "./time";

// The lite dashboard is backed by hourly materialized views, so anything finer
// than an hour has no underlying data. Clamp auto-selected buckets up to "hour".
const SUB_HOUR_BUCKETS: TimeBucket[] = ["minute", "five_minutes", "ten_minutes", "fifteen_minutes"];
const clampBucketForLite = (bucket: TimeBucket): TimeBucket =>
  LITE_DASHBOARD && SUB_HOUR_BUCKETS.includes(bucket) ? "hour" : bucket;

// Get system timezone
const getSystemTimezone = () =>
  typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

export type StatType = "pageviews" | "sessions" | "users" | "pages_per_session" | "bounce_rate" | "session_duration";

const getTimeState = (
  time: Time,
  comparison: Comparison = DEFAULT_COMPARISON
): Pick<Store, "time" | "previousTime" | "bucket" | "comparison"> => {
  // Resolve the zone lazily: this runs during store creation (before useStore
  // exists), and only range-with-times values actually need the zone.
  const zone = hasRangeTimes(time) ? getTimezone() : "UTC";
  return {
    time,
    comparison,
    previousTime: resolveComparison(time, comparison, zone),
    bucket: clampBucketForLite(getBucketForTime(time, zone)),
  };
};

type Store = {
  site: string;
  setSite: (site: string) => void;
  privateKey: string | null;
  setPrivateKey: (privateKey: string | null) => void;
  setSiteContext: (site: string, privateKey: string | null) => void;
  time: Time;
  /** The window the comparison line is drawn from; null when comparison is off. */
  previousTime: Time | null;
  setTime: (time: Time, changeBucket?: boolean) => void;
  comparison: Comparison;
  setComparison: (comparison: Comparison) => void;
  bucket: TimeBucket;
  setBucket: (bucket: TimeBucket) => void;
  selectedStat: StatType;
  setSelectedStat: (stat: StatType) => void;
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
  /** The saved segment whose filters are part of `filters`; null when none is applied. */
  segmentId: number | null;
  setSegmentId: (segmentId: number | null) => void;
  timezone: string;
  setTimezone: (timezone: string) => void;
};

type PersistedStore = Pick<Store, "timezone">;

const getUrlParams = () => (typeof window !== "undefined" ? new URLSearchParams(globalThis.location.search) : null);

const getDefaultTime = (): Time => getStoredDashboardDefaultTime(getSystemTimezone());

const getDefaultTimeState = () => getTimeState(getDefaultTime());

// The store is created during both server rendering and the browser's first
// render. Keep that initial state independent of localStorage so React hydrates
// the same markup; client-side URL/default-range initialization runs afterward.
const getInitialTimeState = () => getTimeState(getDashboardTimeForRange("today", "UTC"));

const getSiteStateForUrl = (state: Store, site: string, privateKey?: string | null): Partial<Store> => {
  const urlParams = getUrlParams();
  const hasTimeInUrl = urlParams?.has("timeMode") || urlParams?.has("wellKnown");
  const hasBucketInUrl = urlParams?.has("bucket");
  const hasStatInUrl = urlParams?.has("stat");
  const hasFiltersInUrl = urlParams?.has("filters");
  const hasSegmentInUrl = urlParams?.has("segment");
  const defaultTimeState = getDefaultTimeState();

  return {
    site,
    ...(privateKey !== undefined ? { privateKey } : {}),
    time: hasTimeInUrl ? state.time : defaultTimeState.time,
    previousTime: hasTimeInUrl ? state.previousTime : defaultTimeState.previousTime,
    comparison: hasTimeInUrl ? state.comparison : defaultTimeState.comparison,
    bucket: hasBucketInUrl ? state.bucket : defaultTimeState.bucket,
    selectedStat: hasStatInUrl ? state.selectedStat : "users",
    filters: hasFiltersInUrl ? state.filters : [],
    segmentId: hasSegmentInUrl ? state.segmentId : null,
  };
};

export const useStore = create<Store, [["zustand/persist", PersistedStore]]>(
  persist<Store, [], [], PersistedStore>(
    (set, get) => ({
      site: "",
      setSite: site => {
        set(state => getSiteStateForUrl(state, site));
      },
      privateKey: null,
      setPrivateKey: privateKey => set({ privateKey }),
      setSiteContext: (site, privateKey) => {
        set(state => getSiteStateForUrl(state, site, privateKey));
      },
      ...getInitialTimeState(),
      setTime: (time, changeBucket = true) => {
        const nextTimeState = getTimeState(time, get().comparison);

        if (changeBucket) {
          set(nextTimeState);
        } else {
          set({ time, previousTime: nextTimeState.previousTime });
        }
      },
      // A comparison is stored as the choice, not as the window it resolves to,
      // so stepping the date selector carries it along instead of stranding the
      // dashboard on the period it was picked in.
      setComparison: comparison => set(getTimeState(get().time, comparison)),
      setBucket: bucket => set({ bucket }),
      selectedStat: "users",
      setSelectedStat: stat => set({ selectedStat: stat }),
      filters: [],
      setFilters: filters => set({ filters }),
      segmentId: null,
      setSegmentId: segmentId => set({ segmentId }),
      timezone: "system",
      setTimezone: newTimezone => {
        const state = get();
        const resolvedTz = newTimezone === "system" ? getSystemTimezone() : newTimezone;
        const newTime = recalculateTimeForTimezone(state.time, resolvedTz);

        // If time should be recalculated (has wellKnown), update via setTime
        if (newTime) {
          set({ timezone: newTimezone });
          // Use setTime to properly recalculate previousTime and bucket
          get().setTime(newTime);
        } else {
          set({ timezone: newTimezone });
        }
      },
    }),
    {
      name: "rybbit-store",
      partialize: state => ({ timezone: state.timezone }),
    }
  )
);

// Helper to get actual timezone value (resolves "system" to actual timezone)
export const getTimezone = () => {
  const { timezone } = useStore.getState();
  return timezone === "system" ? getSystemTimezone() : timezone;
};

// Reactive form of getTimezone: re-renders when the user switches timezone.
export const useTimezone = () => {
  const timezone = useStore(state => state.timezone);
  return timezone === "system" ? getSystemTimezone() : timezone;
};

// Whether a comparison window exists at all — false only when the user has
// turned the comparison off, which is what hides every delta and dotted line.
export const useComparisonEnabled = () => useStore(state => state.previousTime !== null);

// Helper to convert a DateTime to the user's selected timezone
export const toUserTimezone = (dt: DateTime): DateTime => {
  return dt.setZone(getTimezone());
};

export const resetStore = () => {
  const { setSite, setPrivateKey, setTime, setSelectedStat, setFilters, setSegmentId, setComparison } =
    useStore.getState();
  setSite("");
  setPrivateKey(null);
  setComparison(DEFAULT_COMPARISON);
  setTime(getDefaultTime());
  setSelectedStat("users");
  setFilters([]);
  setSegmentId(null);
};

export const goBack = () => {
  const { time, setTime } = useStore.getState();
  const next = shiftTimeBackward(time, getTimezone());
  if (next) {
    setTime(next, false);
  }
};

export const goForward = () => {
  const { time, setTime } = useStore.getState();
  const next = shiftTimeForward(time, getTimezone());
  if (next) {
    // Historical quirk kept as-is: forward day steps recalculate the bucket,
    // every other mode keeps the current one (matching goBack).
    setTime(next, next.mode === "day");
  }
};

export const addFilter = (filter: Filter) => {
  const { filters, setFilters } = useStore.getState();
  const filterExists = filters.findIndex(
    f => f.parameter === filter.parameter && f.type === filter.type
    // JSON.stringify(f.value) === JSON.stringify(filter.value)
  );
  if (filterExists === -1) {
    setFilters([...filters, filter]);
  } else {
    setFilters(filters.map((f, i) => (i === filterExists ? filter : f)));
  }
};

export const removeFilter = (filter: Filter) => {
  const { filters, setFilters } = useStore.getState();
  setFilters(filters.filter(f => f !== filter));
};

export const updateFilter = (filter: Filter, index: number) => {
  const { filters, setFilters } = useStore.getState();
  setFilters(filters.map((f, i) => (i === index ? filter : f)));
};

const filterKey = (filter: Filter) => JSON.stringify([filter.parameter, filter.type, filter.value]);

/**
 * Applies a saved segment: its filters go first, ad-hoc filters that are not
 * already part of it follow, and the filters of the segment being replaced
 * (if any) are dropped. Every report keeps reading `filters`, so nothing
 * else in the dashboard learns what a segment is.
 */
export const applySegment = (
  segment: { segmentId: number; filters: Filter[] },
  replacing: Filter[] = []
) => {
  const { filters, setFilters, setSegmentId } = useStore.getState();
  const dropped = new Set(replacing.map(filterKey));
  const segmentKeys = new Set(segment.filters.map(filterKey));
  const adHoc = filters.filter(f => !dropped.has(filterKey(f)) && !segmentKeys.has(filterKey(f)));
  setFilters([...segment.filters, ...adHoc]);
  setSegmentId(segment.segmentId);
};

/** Removes an applied segment and the filters it contributed; ad-hoc filters stay. */
export const clearSegment = (segmentFilters: Filter[]) => {
  const { filters, setFilters, setSegmentId } = useStore.getState();
  const segmentKeys = new Set(segmentFilters.map(filterKey));
  setFilters(filters.filter(f => !segmentKeys.has(filterKey(f))));
  setSegmentId(null);
};

export const getFilteredFilters = (parameters: FilterParameter[]) => {
  const { filters } = useStore.getState();
  return filters.filter(f => parameters.includes(f.parameter));
};

export const canGoForward = (time: Time) => canGoForwardFrom(time, getTimezone());

export const canGoBack = (time: Time) => shiftTimeBackward(time, getTimezone()) !== null;
