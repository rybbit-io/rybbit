import { Filter, FilterParameter, TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Time } from "../components/DateSelector/types";
import { LITE_DASHBOARD } from "./const";
import { getDashboardTimeForRange, getStoredDashboardDefaultTime } from "./defaultTimeRange";
import {
  canGoForward as canGoForwardFrom,
  deriveTimeState,
  hasRangeTimes,
  recalculateTimeForTimezone,
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

const getTimeState = (time: Time): Pick<Store, "time" | "previousTime" | "bucket"> => {
  // Resolve the zone lazily: this runs during store creation (before useStore
  // exists), and only range-with-times values actually need the zone.
  const zone = hasRangeTimes(time) ? getTimezone() : "UTC";
  const { previousTime, bucket } = deriveTimeState(time, zone);
  return { time, previousTime, bucket: clampBucketForLite(bucket) };
};

type Store = {
  site: string;
  setSite: (site: string) => void;
  privateKey: string | null;
  setPrivateKey: (privateKey: string | null) => void;
  setSiteContext: (site: string, privateKey: string | null) => void;
  time: Time;
  previousTime: Time;
  setTime: (time: Time, changeBucket?: boolean) => void;
  bucket: TimeBucket;
  setBucket: (bucket: TimeBucket) => void;
  selectedStat: StatType;
  setSelectedStat: (stat: StatType) => void;
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
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
  const defaultTimeState = getDefaultTimeState();

  return {
    site,
    ...(privateKey !== undefined ? { privateKey } : {}),
    time: hasTimeInUrl ? state.time : defaultTimeState.time,
    previousTime: hasTimeInUrl ? state.previousTime : defaultTimeState.previousTime,
    bucket: hasBucketInUrl ? state.bucket : defaultTimeState.bucket,
    selectedStat: hasStatInUrl ? state.selectedStat : "users",
    filters: hasFiltersInUrl ? state.filters : [],
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
        const nextTimeState = getTimeState(time);

        if (changeBucket) {
          set(nextTimeState);
        } else {
          set({ time, previousTime: nextTimeState.previousTime });
        }
      },
      setBucket: bucket => set({ bucket }),
      selectedStat: "users",
      setSelectedStat: stat => set({ selectedStat: stat }),
      filters: [],
      setFilters: filters => set({ filters }),
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

// Helper to convert a DateTime to the user's selected timezone
export const toUserTimezone = (dt: DateTime): DateTime => {
  return dt.setZone(getTimezone());
};

export const resetStore = () => {
  const { setSite, setPrivateKey, setTime, setSelectedStat, setFilters } = useStore.getState();
  setSite("");
  setPrivateKey(null);
  setTime(getDefaultTime());
  setSelectedStat("users");
  setFilters([]);
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

export const getFilteredFilters = (parameters: FilterParameter[]) => {
  const { filters } = useStore.getState();
  return filters.filter(f => parameters.includes(f.parameter));
};

export const canGoForward = (time: Time) => canGoForwardFrom(time, getTimezone());
