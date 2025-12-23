import { Filter, FilterParameter, TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Time } from "../components/DateSelector/types";

// Get system timezone
const getSystemTimezone = () =>
  typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

// Recalculate time based on wellKnown value for a new timezone
const recalculateTimeForTimezone = (time: Time, timezone: string): Time | null => {
  if (!time.wellKnown) return null;

  const now = DateTime.now().setZone(timezone);
  const today = now.toISODate() ?? "";
  const yesterday = now.minus({ days: 1 }).toISODate() ?? "";

  switch (time.wellKnown) {
    case "today":
      return { mode: "day", day: today, wellKnown: "today" };
    case "yesterday":
      return { mode: "day", day: yesterday, wellKnown: "yesterday" };
    case "last-3-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 2 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-3-days",
      };
    case "last-7-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 6 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-7-days",
      };
    case "last-14-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 13 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-14-days",
      };
    case "last-30-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 29 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-30-days",
      };
    case "last-60-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 59 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-60-days",
      };
    case "this-week":
      return {
        mode: "week",
        week: now.startOf("week").toISODate() ?? "",
        wellKnown: "this-week",
      };
    case "last-week":
      return {
        mode: "week",
        week: now.minus({ weeks: 1 }).startOf("week").toISODate() ?? "",
        wellKnown: "last-week",
      };
    case "this-month":
      return {
        mode: "month",
        month: now.startOf("month").toISODate() ?? "",
        wellKnown: "this-month",
      };
    case "last-month":
      return {
        mode: "month",
        month: now.minus({ months: 1 }).startOf("month").toISODate() ?? "",
        wellKnown: "last-month",
      };
    case "this-year":
      return {
        mode: "year",
        year: now.startOf("year").toISODate() ?? "",
        wellKnown: "this-year",
      };
    case "all-time":
      return { mode: "all-time", wellKnown: "all-time" };
    // past-minutes modes don't need date recalculation (they're relative to "now")
    case "last-30-minutes":
    case "last-1-hour":
    case "last-6-hours":
    case "last-24-hours":
      return null;
    default:
      return null;
  }
};

export type StatType = "pageviews" | "sessions" | "users" | "pages_per_session" | "bounce_rate" | "session_duration";

type Store = {
  site: string;
  setSite: (site: string) => void;
  privateKey: string | null;
  setPrivateKey: (privateKey: string | null) => void;
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

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      site: "",
      setSite: site => {
        // Get current URL search params to check for stored state
        let urlParams: URLSearchParams | null = null;
        if (typeof window !== "undefined") {
          urlParams = new URLSearchParams(globalThis.location.search);
        }

        // Check if we have state stored in the URL
        const hasTimeInUrl = urlParams?.has("timeMode");
        const hasBucketInUrl = urlParams?.has("bucket");
        const hasStatInUrl = urlParams?.has("stat");

        // Only set defaults if not present in URL
        set(state => ({
          site,
          time: hasTimeInUrl
            ? state.time
            : {
                mode: "day",
                day: DateTime.now().toISODate(),
                wellKnown: "today",
              },
          previousTime: hasTimeInUrl
            ? state.previousTime
            : {
                mode: "day",
                day: DateTime.now().minus({ days: 1 }).toISODate(),
                wellKnown: "yesterday",
              },
          bucket: hasBucketInUrl ? state.bucket : "hour",
          selectedStat: hasStatInUrl ? state.selectedStat : "users",
        }));
      },
      privateKey: null,
      setPrivateKey: privateKey => set({ privateKey }),
      time: {
        mode: "day",
        day: DateTime.now().toISODate(),
        wellKnown: "today",
      },
      previousTime: {
        mode: "day",
        day: DateTime.now().minus({ days: 1 }).toISODate(),
        wellKnown: "yesterday",
      },
      setTime: (time, changeBucket = true) => {
        let bucketToUse: TimeBucket = "hour";
        let previousTime: Time;

        if (time.mode === "day") {
          bucketToUse = "hour";
          previousTime = {
            mode: "day",
            day: DateTime.fromISO(time.day).minus({ days: 1 }).toISODate() ?? "",
          };
        } else if (time.mode === "past-minutes") {
          const timeDiff = time.pastMinutesStart - time.pastMinutesEnd;

          if (timeDiff <= 120) {
            bucketToUse = "minute";
          }

          previousTime = {
            mode: "past-minutes",
            pastMinutesStart: time.pastMinutesStart + timeDiff,
            pastMinutesEnd: time.pastMinutesEnd + timeDiff,
          };
        } else if (time.mode === "range") {
          const timeRangeLength =
            DateTime.fromISO(time.endDate).diff(DateTime.fromISO(time.startDate), "days").days + 1;

          if (timeRangeLength > 180) {
            bucketToUse = "month";
          } else if (timeRangeLength > 31) {
            bucketToUse = "week";
          } else {
            bucketToUse = "day";
          }

          previousTime = {
            mode: "range",
            startDate: DateTime.fromISO(time.startDate).minus({ days: timeRangeLength }).toISODate() ?? "",
            endDate: DateTime.fromISO(time.startDate).minus({ days: 1 }).toISODate() ?? "",
          };
        } else if (time.mode === "week") {
          bucketToUse = "day";
          previousTime = {
            mode: "week",
            week: DateTime.fromISO(time.week).minus({ weeks: 1 }).toISODate() ?? "",
          };
        } else if (time.mode === "month") {
          bucketToUse = "day";
          previousTime = {
            mode: "month",
            month: DateTime.fromISO(time.month).minus({ months: 1 }).toISODate() ?? "",
          };
        } else if (time.mode === "year") {
          bucketToUse = "month";
          previousTime = {
            mode: "year",
            year: DateTime.fromISO(time.year).minus({ years: 1 }).toISODate() ?? "",
          };
        } else if (time.mode === "all-time") {
          bucketToUse = "day";
          previousTime = {
            mode: "all-time",
          };
        } else {
          previousTime = time; // fallback case
        }

        if (changeBucket) {
          set({ time, previousTime, bucket: bucketToUse });
        } else {
          set({ time, previousTime });
        }
      },
      bucket: "hour",
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
  const { setSite, setTime, setBucket, setSelectedStat, setFilters } = useStore.getState();
  setSite("");
  setTime({ mode: "day", day: DateTime.now().toISODate(), wellKnown: "today" });
  setBucket("hour");
  setSelectedStat("users");
  setFilters([]);
};

export const goBack = () => {
  const { time, setTime } = useStore.getState();

  if (time.mode === "day") {
    setTime(
      {
        mode: "day",
        day: DateTime.fromISO(time.day).minus({ days: 1 }).toISODate() ?? "",
      },
      false
    );
  } else if (time.mode === "range") {
    const startDate = DateTime.fromISO(time.startDate);
    const endDate = DateTime.fromISO(time.endDate);

    const daysBetweenStartAndEnd = endDate.diff(startDate, "days").days;

    setTime(
      {
        mode: "range",
        startDate: startDate.minus({ days: daysBetweenStartAndEnd }).toISODate() ?? "",
        endDate: startDate.toISODate() ?? "",
      },
      false
    );
  } else if (time.mode === "week") {
    setTime(
      {
        mode: "week",
        week: DateTime.fromISO(time.week).minus({ weeks: 1 }).toISODate() ?? "",
      },
      false
    );
  } else if (time.mode === "month") {
    setTime(
      {
        mode: "month",
        month: DateTime.fromISO(time.month).minus({ months: 1 }).toISODate() ?? "",
      },
      false
    );
  } else if (time.mode === "year") {
    setTime(
      {
        mode: "year",
        year: DateTime.fromISO(time.year).minus({ years: 1 }).toISODate() ?? "",
      },
      false
    );
  }
};

export const goForward = () => {
  const { time, setTime } = useStore.getState();

  if (time.mode === "day") {
    setTime({
      mode: "day",
      day: DateTime.fromISO(time.day).plus({ days: 1 }).toISODate() ?? "",
    });
  } else if (time.mode === "range") {
    const startDate = DateTime.fromISO(time.startDate);
    const endDate = DateTime.fromISO(time.endDate);
    const now = DateTime.now();

    const daysBetweenStartAndEnd = endDate.diff(startDate, "days").days;
    const proposedEndDate = endDate.plus({ days: daysBetweenStartAndEnd });

    // Don't allow moving forward if it would put the entire range in the future
    if (startDate.plus({ days: daysBetweenStartAndEnd }) > now) {
      return;
    }

    setTime(
      {
        mode: "range",
        startDate: startDate.plus({ days: daysBetweenStartAndEnd }).toISODate() ?? "",
        // Cap the end date at today
        endDate: proposedEndDate.toISODate() ?? "",
      },
      false
    );
  } else if (time.mode === "week") {
    setTime(
      {
        mode: "week",
        week: DateTime.fromISO(time.week).plus({ weeks: 1 }).toISODate() ?? "",
      },
      false
    );
  } else if (time.mode === "month") {
    setTime(
      {
        mode: "month",
        month: DateTime.fromISO(time.month).plus({ months: 1 }).toISODate() ?? "",
      },
      false
    );
  } else if (time.mode === "year") {
    setTime(
      {
        mode: "year",
        year: DateTime.fromISO(time.year).plus({ years: 1 }).toISODate() ?? "",
      },
      false
    );
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

export const canGoForward = (time: Time) => {
  const currentDay = DateTime.now().startOf("day");
  if (time.mode === "day") {
    return !(DateTime.fromISO(time.day).startOf("day") >= currentDay);
  }

  if (time.mode === "range") {
    return !(DateTime.fromISO(time.endDate).startOf("day") >= currentDay);
  }

  if (time.mode === "week") {
    return !(DateTime.fromISO(time.week).startOf("week") >= currentDay);
  }

  if (time.mode === "month") {
    return !(DateTime.fromISO(time.month).startOf("month") >= currentDay);
  }

  if (time.mode === "year") {
    return !(DateTime.fromISO(time.year).startOf("year") >= currentDay);
  }

  return false;
};
