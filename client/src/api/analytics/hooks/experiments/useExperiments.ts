import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExperiment,
  deleteExperiment,
  ExperimentPayload,
  ExperimentUpdatePayload,
  fetchExperimentResults,
  fetchExperiments,
  updateExperiment,
} from "../../endpoints";
import { buildApiParams } from "../../../utils";
import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";

export function useExperiments() {
  const { site } = useStore();

  return useQuery({
    queryKey: ["experiments", site],
    queryFn: () => fetchExperiments(site),
    enabled: !!site,
  });
}

export function useExperimentResults(experimentId: number, enabled = true) {
  const { site, time, timezone } = useStore();
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);
  const params = buildApiParams(time, { filters: filteredFilters });

  return useQuery({
    queryKey: ["experiment-results", site, experimentId, time, filteredFilters, timezone],
    queryFn: () => fetchExperimentResults(site, experimentId, params),
    enabled: !!site && !!experimentId && enabled,
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
      queryClient.invalidateQueries({ queryKey: ["experiment-results", site, variables.experimentId] });
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
