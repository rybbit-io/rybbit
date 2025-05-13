import { DateTime } from "luxon";
import { create } from "zustand";
import { Time } from "../components/DateSelector/types";

export type TimeBucket =
  | "minute"
  | "five_minutes"
  | "ten_minutes"
  | "fifteen_minutes"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

export type StatType =
  | "pageviews"
  | "sessions"
  | "users"
  | "pages_per_session"
  | "bounce_rate"
  | "session_duration";

export type FilterType = "equals" | "not_equals" | "contains" | "not_contains";

export type FilterParameter =
  | "browser"
  | "operating_system"
  | "language"
  | "country"
  | "region"
  | "city"
  | "device_type"
  | "referrer"
  | "pathname"
  | "page_title"
  | "querystring"
  | "event_name"
  | "channel"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_term"
  | "utm_content"
  // derivative parameters
  | "entry_page"
  | "exit_page"
  | "dimensions";

export const SESSION_PAGE_FILTERS: FilterParameter[] = [
  "browser",
  "operating_system",
  "language",
  "country",
  "region",
  "city",
  "device_type",
  "referrer",
  "event_name",
  "channel",
  "entry_page",
  "exit_page",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

export const EVENT_FILTERS: FilterParameter[] = [
  // "event_name",
  // "browser",
  // "operating_system",
  // "country",
  // "device_type",
  // "referrer",

  "browser",
  "operating_system",
  "language",
  "country",
  "region",
  "city",
  "device_type",
  "referrer",
  "pathname",
  "page_title",
  "querystring",
  "event_name",
  "channel",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "entry_page",
  "exit_page",
  "dimensions",
];

export const GOALS_PAGE_FILTERS: FilterParameter[] = [
  "browser",
  "operating_system",
  "language",
  "country",
  "region",
  "city",
  "device_type",
  "referrer",
  "event_name",
  "channel",
  "entry_page",
  "exit_page",
];

export const USER_PAGE_FILTERS: FilterParameter[] = [
  "browser",
  "operating_system",
  "language",
  "country",
  "region",
  "city",
  "device_type",
  "referrer",
];

export type Filter = {
  parameter: FilterParameter;
  value: string[];
  type: FilterType;
};

type Store = {
  site: string;
  setSite: (site: string) => void;
  time: Time;
  previousTime: Time;
  setTime: (time: Time, changeBucket?: boolean) => void;
  bucket: TimeBucket;
  setBucket: (bucket: TimeBucket) => void;
  selectedStat: StatType;
  setSelectedStat: (stat: StatType) => void;
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
};

export const useStore = create<Store>((set) => ({
  site: "",
  setSite: (site) => {
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
    set((state) => ({
      site,
      time: hasTimeInUrl
        ? state.time
        : {
            mode: "day",
            day: DateTime.now().toISODate(),
          },
      previousTime: hasTimeInUrl
        ? state.previousTime
        : {
            mode: "day",
            day: DateTime.now().minus({ days: 1 }).toISODate(),
          },
      bucket: hasBucketInUrl ? state.bucket : "hour",
      selectedStat: hasStatInUrl ? state.selectedStat : "users",
    }));
  },
  time: {
    mode: "day",
    day: DateTime.now().toISODate(),
  },
  previousTime: {
    mode: "day",
    day: DateTime.now().minus({ days: 1 }).toISODate(),
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
    } else if (time.mode === "last-24-hours") {
      bucketToUse = "hour";
      previousTime = {
        mode: "last-24-hours",
      };
    } else if (time.mode === "range") {
      const timeRangeLength =
        DateTime.fromISO(time.endDate).diff(
          DateTime.fromISO(time.startDate),
          "days"
        ).days + 1;

      if (timeRangeLength > 180) {
        bucketToUse = "month";
      } else if (timeRangeLength > 31) {
        bucketToUse = "week";
      } else {
        bucketToUse = "day";
      }

      previousTime = {
        mode: "range",
        startDate:
          DateTime.fromISO(time.startDate)
            .minus({ days: timeRangeLength })
            .toISODate() ?? "",
        endDate:
          DateTime.fromISO(time.startDate).minus({ days: 1 }).toISODate() ?? "",
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
        month:
          DateTime.fromISO(time.month).minus({ months: 1 }).toISODate() ?? "",
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
  setBucket: (bucket) => set({ bucket }),
  selectedStat: "users",
  setSelectedStat: (stat) => set({ selectedStat: stat }),
  filters: [],
  setFilters: (filters) => set({ filters }),
}));

export const resetStore = () => {
  const { setSite, setTime, setBucket, setSelectedStat, setFilters } =
    useStore.getState();
  setSite("");
  setTime({ mode: "day", day: DateTime.now().toISODate() });
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
        startDate:
          startDate.minus({ days: daysBetweenStartAndEnd }).toISODate() ?? "",
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
        month:
          DateTime.fromISO(time.month).minus({ months: 1 }).toISODate() ?? "",
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
        startDate:
          startDate.plus({ days: daysBetweenStartAndEnd }).toISODate() ?? "",
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
        month:
          DateTime.fromISO(time.month).plus({ months: 1 }).toISODate() ?? "",
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
  const filterExists = filters.some(
    (f) =>
      f.parameter === filter.parameter &&
      f.type === filter.type &&
      JSON.stringify(f.value) === JSON.stringify(filter.value)
  );
  if (!filterExists) {
    setFilters([...filters, filter]);
  }
};

export const removeFilter = (filter: Filter) => {
  const { filters, setFilters } = useStore.getState();
  setFilters(filters.filter((f) => f !== filter));
};

export const updateFilter = (filter: Filter, index: number) => {
  const { filters, setFilters } = useStore.getState();
  setFilters(filters.map((f, i) => (i === index ? filter : f)));
};

export const getFilteredFilters = (parameters: FilterParameter[]) => {
  const { filters } = useStore.getState();
  return filters.filter((f) => parameters.includes(f.parameter));
};
