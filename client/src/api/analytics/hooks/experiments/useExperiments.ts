import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExperiment,
  deleteExperiment,
  ExperimentPayload,
  ExperimentResults,
  ExperimentUpdatePayload,
  fetchExperiments,
  updateExperiment,
} from "../../endpoints";
import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useExperiments() {
  const { site } = useStore();

  return useQuery({
    queryKey: ["experiments", site],
    queryFn: () => fetchExperiments(site),
    enabled: !!site,
  });
}

export function useExperimentResults(experimentId: number, enabled = true) {
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  return useAnalyticsQuery<ExperimentResults>({
    key: ["experiment-results", experimentId],
    path: `experiments/${experimentId}/results`,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    enabled: !!experimentId && enabled,
    // Keyed by experiment: never show another experiment's results.
    staleTime: 0,
    placeholder: false,
  });
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
