import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFeatureFlag,
  deleteFeatureFlag,
  fetchFeatureFlags,
  FeatureFlagPayload,
  FeatureFlagUpdatePayload,
  updateFeatureFlag,
} from "../../endpoints";
import { useStore } from "../../../../lib/store";

export function useFeatureFlags() {
  const { site } = useStore();

  return useQuery({
    queryKey: ["feature-flags", site],
    queryFn: () => fetchFeatureFlags(site),
    enabled: !!site,
  });
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation({
    mutationFn: (payload: FeatureFlagPayload) => createFeatureFlag(site, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags", site] });
    },
  });
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation({
    mutationFn: ({ flagId, payload }: { flagId: number; payload: FeatureFlagUpdatePayload }) =>
      updateFeatureFlag(site, flagId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags", site] });
    },
  });
}

export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation({
    mutationFn: (flagId: number) => deleteFeatureFlag(site, flagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags", site] });
    },
  });
}
