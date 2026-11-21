import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import {
  fetchExcludedPaths,
  updateExcludedPaths,
  fetchExcludedHostnames,
  updateExcludedHostnames,
  fetchExcludedUserAgents,
  updateExcludedUserAgents,
  fetchExcludedASNs,
  updateExcludedASNs,
  fetchExcludedQueryParams,
  updateExcludedQueryParams,
} from "../endpoints";

// Excluded paths
export const useGetExcludedPaths = (siteId: number) => {
  return useQuery({
    queryKey: ["excludedPaths", siteId],
    queryFn: () => fetchExcludedPaths(siteId.toString()),
    enabled: !!siteId,
  });
};

export const useUpdateExcludedPaths = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { siteId: number; excludedPaths: string[] }>({
    mutationFn: ({ siteId, excludedPaths }) => updateExcludedPaths(siteId, excludedPaths),
    onSuccess: (_, variables) => {
      toast.success("Excluded paths updated successfully");
      queryClient.invalidateQueries({ queryKey: ["excludedPaths", variables.siteId] });
    },
    onError: error => {
      toast.error(error.message || "Failed to update excluded paths");
    },
  });
};

// Excluded hostnames
export const useGetExcludedHostnames = (siteId: number) => {
  return useQuery({
    queryKey: ["excludedHostnames", siteId],
    queryFn: () => fetchExcludedHostnames(siteId.toString()),
    enabled: !!siteId,
  });
};

export const useUpdateExcludedHostnames = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { siteId: number; excludedHostnames: string[] }>({
    mutationFn: ({ siteId, excludedHostnames }) => updateExcludedHostnames(siteId, excludedHostnames),
    onSuccess: (_, variables) => {
      toast.success("Excluded hostnames updated successfully");
      queryClient.invalidateQueries({ queryKey: ["excludedHostnames", variables.siteId] });
    },
    onError: error => {
      toast.error(error.message || "Failed to update excluded hostnames");
    },
  });
};

// Excluded user agents
export const useGetExcludedUserAgents = (siteId: number) => {
  return useQuery({
    queryKey: ["excludedUserAgents", siteId],
    queryFn: () => fetchExcludedUserAgents(siteId.toString()),
    enabled: !!siteId,
  });
};

export const useUpdateExcludedUserAgents = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { siteId: number; excludedUserAgents: string[] }>({
    mutationFn: ({ siteId, excludedUserAgents }) => updateExcludedUserAgents(siteId, excludedUserAgents),
    onSuccess: (_, variables) => {
      toast.success("Excluded user agents updated successfully");
      queryClient.invalidateQueries({ queryKey: ["excludedUserAgents", variables.siteId] });
    },
    onError: error => {
      toast.error(error.message || "Failed to update excluded user agents");
    },
  });
};

// Excluded ASNs
export const useGetExcludedASNs = (siteId: number) => {
  return useQuery({
    queryKey: ["excludedASNs", siteId],
    queryFn: () => fetchExcludedASNs(siteId.toString()),
    enabled: !!siteId,
  });
};

export const useUpdateExcludedASNs = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { siteId: number; excludedASNs: string[] }>({
    mutationFn: ({ siteId, excludedASNs }) => updateExcludedASNs(siteId, excludedASNs),
    onSuccess: (_, variables) => {
      toast.success("Excluded ASNs updated successfully");
      queryClient.invalidateQueries({ queryKey: ["excludedASNs", variables.siteId] });
    },
    onError: error => {
      toast.error(error.message || "Failed to update excluded ASNs");
    },
  });
};

// Excluded query params
export const useGetExcludedQueryParams = (siteId: number) => {
  return useQuery({
    queryKey: ["excludedQueryParams", siteId],
    queryFn: () => fetchExcludedQueryParams(siteId.toString()),
    enabled: !!siteId,
  });
};

export const useUpdateExcludedQueryParams = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { siteId: number; excludedQueryParams: string[] }>({
    mutationFn: ({ siteId, excludedQueryParams }) => updateExcludedQueryParams(siteId, excludedQueryParams),
    onSuccess: (_, variables) => {
      toast.success("Excluded query params updated successfully");
      queryClient.invalidateQueries({ queryKey: ["excludedQueryParams", variables.siteId] });
    },
    onError: error => {
      toast.error(error.message || "Failed to update excluded query params");
    },
  });
};
