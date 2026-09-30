import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptSiteTransfer,
  cancelSiteTransfer,
  createSiteTransfer,
  declineSiteTransfer,
  fetchIncomingSiteTransfer,
  fetchSiteTransfer,
  USER_ORGANIZATIONS_QUERY_KEY,
} from "../endpoints";

const siteTransferKey = (siteId?: number) => ["site-transfer", siteId];

/** The site's pending outgoing transfer, or null. Needs sites:transfer on the site. */
export function useSiteTransfer(siteId?: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: siteTransferKey(siteId),
    queryFn: () => fetchSiteTransfer(siteId!).then(response => response.transfer),
    enabled: !!siteId && options?.enabled !== false,
  });
}

export function useCreateSiteTransfer(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => createSiteTransfer(siteId, email),
    onSuccess: transfer => queryClient.setQueryData(siteTransferKey(siteId), transfer),
  });
}

export function useCancelSiteTransfer(siteId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelSiteTransfer(siteId),
    onSuccess: () => queryClient.setQueryData(siteTransferKey(siteId), null),
  });
}

/** The transfer behind a /transfer/<id> link, for its signed-in recipient. */
export function useIncomingSiteTransfer(transferId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["incoming-site-transfer", transferId],
    queryFn: () => fetchIncomingSiteTransfer(transferId!),
    enabled: !!transferId && options?.enabled !== false,
    // A wrong account (403) or a dead link (404) won't change on retry.
    retry: false,
  });
}

export function useAcceptSiteTransfer(transferId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (organizationId: string) => acceptSiteTransfer(transferId, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-sites-from-org"] });
      queryClient.invalidateQueries({ queryKey: ["get-site"] });
      queryClient.invalidateQueries({ queryKey: [USER_ORGANIZATIONS_QUERY_KEY] });
    },
  });
}

export function useDeclineSiteTransfer(transferId: string) {
  return useMutation({
    mutationFn: () => declineSiteTransfer(transferId),
  });
}
