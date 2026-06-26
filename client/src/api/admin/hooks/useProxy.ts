import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disableProxy, enableProxy, fetchProxyStatus, ProxyStatusResponse } from "../endpoints";

export function useProxyStatus(siteId?: number) {
  return useQuery<ProxyStatusResponse>({
    queryKey: ["proxy-status", siteId],
    queryFn: () => fetchProxyStatus(siteId!),
    enabled: !!siteId,
    // Poll while Cloudflare is still validating so the badge flips to "active" on its own.
    refetchInterval: query => (query.state.data?.status === "pending" ? 5000 : false),
  });
}

export function useEnableProxy(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domain: string) => enableProxy(siteId, domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proxy-status", siteId] });
    },
  });
}

export function useDisableProxy(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disableProxy(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proxy-status", siteId] });
    },
  });
}
