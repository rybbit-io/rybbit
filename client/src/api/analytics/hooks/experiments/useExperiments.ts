import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExperiment,
  deleteExperiment,
  ExperimentPayload,
  ExperimentResults,
  ExperimentTimeseries,
  ExperimentUpdatePayload,
  ExperimentWindowMode,
  fetchExperiments,
  updateExperiment,
} from "../../endpoints";
import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { type AnalyticsQueryOptions, useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useExperiments() {
  const { site } = useStore();

  return useQuery({
    queryKey: ["experiments", site],
    queryFn: () => fetchExperiments(site),
    enabled: !!site,
  });
}

function experimentQuery<T>(
  key: string,
  path: string,
  experimentId: number,
  windowMode: ExperimentWindowMode,
  enabled: boolean
): AnalyticsQueryOptions<T> {
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  return {
    key: [key, experimentId],
    path: `experiments/${experimentId}/${path}`,
    params: { window: windowMode },
    useTime: windowMode === "range",
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    enabled: !!experimentId && enabled,
    // Keyed by experiment: never show another experiment's results.
    staleTime: 0,
    placeholder: false,
  };
}

export function useExperimentResults(experimentId: number, enabled = true, windowMode: ExperimentWindowMode = "experiment") {
  return useAnalyticsQuery<ExperimentResults>(
    experimentQuery<ExperimentResults>("experiment-results", "results", experimentId, windowMode, enabled)
  );
}

export function useExperimentTimeseries(
  experimentId: number,
  enabled = true,
  windowMode: ExperimentWindowMode = "experiment"
) {
  return useAnalyticsQuery<ExperimentTimeseries>(
    experimentQuery<ExperimentTimeseries>("experiment-timeseries", "timeseries", experimentId, windowMode, enabled)
  );
}

export function useCreateExperiment() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation({
    mutationFn: (payload: ExperimentPayload) => createExperiment(site, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments", site] });
    },
  });
}

export function useUpdateExperiment() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation({
    mutationFn: ({ experimentId, payload }: { experimentId: number; payload: ExperimentUpdatePayload }) =>
      updateExperiment(site, experimentId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["experiments", site] });
      queryClient.invalidateQueries({ queryKey: ["experiment-results", variables.experimentId] });
      queryClient.invalidateQueries({ queryKey: ["experiment-timeseries", variables.experimentId] });
      if (variables.payload.status) {
        queryClient.invalidateQueries({ queryKey: ["feature-flags", site] });
      }
    },
  });
}

export function useDeleteExperiment() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation({
    mutationFn: (experimentId: number) => deleteExperiment(site, experimentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments", site] });
    },
  });
}
