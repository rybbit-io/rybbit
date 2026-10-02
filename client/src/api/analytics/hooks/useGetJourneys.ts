import { Filter } from "@rybbit/shared";
import { Time } from "../../../components/DateSelector/types";
import { JOURNEY_PAGE_FILTERS } from "../../../lib/filterGroups";
import { useStore } from "../../../lib/store";
import {
  GetOverviewResponse,
  GetSessionsResponse,
  JourneyGrouping,
  JourneysResponse,
  JourneySummary,
  MetricResponse,
} from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

/** The options that decide which sessions become which journey. */
export interface JourneyShape {
  steps?: number;
  stepFilters?: Record<number, string>;
  /** Path pattern the journeys must reach; they are cut at the first visit to it. */
  endsAt?: string;
  groupBy?: JourneyGrouping;
}

export interface JourneyParams extends JourneyShape {
  siteId?: number;
  timeZone?: string;
  /** Left out, the store's period is used. */
  time?: Time;
  /** "previous" asks for the comparison period instead (and runs only while one is set). */
  periodTime?: PeriodTime;
  limit?: number;
  /** Adds each journey's count of sessions that completed this goal. */
  goalId?: number;
  // Merged with the store filters (e.g. scoping journeys to a single user)
  additionalFilters?: Filter[];
  enabled?: boolean;
}

/**
 * The store's filters narrowed to the ones the journeys endpoints honour. An
 * empty subset has to switch filters off: `customFilters` falls back to the
 * store's full list when it is empty.
 */
function useJourneyFilters(additionalFilters?: Filter[]) {
  const filters = useStore(state => state.filters);
  const pageFilters = filters.filter(filter => JOURNEY_PAGE_FILTERS.includes(filter.parameter));
  const customFilters = additionalFilters?.length ? [...pageFilters, ...additionalFilters] : pageFilters;
  return { useFilters: customFilters.length > 0, customFilters };
}

const journeyShapeParams = ({ steps = 3, stepFilters, endsAt, groupBy }: JourneyShape) => ({
  steps,
  stepFilters: stepFilters && Object.keys(stepFilters).length > 0 ? JSON.stringify(stepFilters) : undefined,
  endsAt: endsAt || undefined,
  groupBy: groupBy && groupBy !== "path" ? groupBy : undefined,
});

export const useJourneys = ({
  siteId,
  time,
  periodTime,
  limit = 100,
  goalId,
  additionalFilters,
  enabled = true,
  ...shape
}: JourneyParams) => {
  return useAnalyticsQuery<JourneysResponse>({
    key: "journeys",
    path: "journeys",
    unwrap: false,
    site: siteId,
    overrideTime: time,
    periodTime,
    ...useJourneyFilters(additionalFilters),
    params: { ...journeyShapeParams(shape), limit, goalId },
    enabled: enabled && siteId !== undefined,
  });
};

/** Page-level figures for the journeys page: multi-page sessions, path length, top exit, goal reach. */
export const useJourneySummary = ({
  goalId,
  periodTime,
  enabled = true,
}: {
  goalId?: number;
  periodTime?: PeriodTime;
  enabled?: boolean;
}) => {
  return useAnalyticsQuery<JourneySummary>({
    key: "journey-summary",
    path: "journeys/summary",
    periodTime,
    ...useJourneyFilters(),
    params: { goalId },
    enabled,
  });
};

/** The sessions counted in one journeys row. `shape` must be the one the row was fetched with. */
export const useJourneySessions = ({
  path,
  replaysOnly = false,
  page = 1,
  limit = 25,
  enabled = true,
  ...shape
}: JourneyShape & {
  path: string[];
  replaysOnly?: boolean;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  return useAnalyticsQuery<GetSessionsResponse>({
    key: "journey-sessions",
    path: "journeys/sessions",
    // Another path's sessions must never stand in while this path's load.
    placeholder: false,
    ...useJourneyFilters(),
    params: {
      ...journeyShapeParams(shape),
      path: JSON.stringify(path),
      replays_only: replaysOnly ? "true" : undefined,
      page,
      limit,
    },
    enabled: enabled && path.length > 0,
  });
};

/**
 * All sessions and the most common entry page, from the endpoints the main
 * dashboard reads, under the journeys page's filters, so the figures the stat
 * band borrows match the ones shown there.
 */
export const useJourneyContext = () => {
  const filters = useJourneyFilters();
  const overview = useAnalyticsQuery<GetOverviewResponse>({ key: "overview", path: "overview", ...filters });
  const entryPages = useAnalyticsQuery<{ data: MetricResponse[]; totalCount: number }>({
    key: "entry_page",
    path: "metric",
    ...filters,
    params: { parameter: "entry_page", limit: 1 },
  });

  return {
    sessions: overview.data?.sessions,
    topEntry: entryPages.data?.data[0],
    isLoading: overview.isLoading || entryPages.isLoading,
  };
};
