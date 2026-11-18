import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDpaAgreements, signDpa, type SignDpaInput } from "../endpoints/dpa";

export const DPA_QUERY_KEY = "dpa-agreements";

export function useDpaAgreements(organizationId?: string) {
  return useQuery({
    queryKey: [DPA_QUERY_KEY, organizationId],
    queryFn: () => fetchDpaAgreements(organizationId!),
    enabled: !!organizationId,
  });
}

export function useSignDpa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, data }: { organizationId: string; data: SignDpaInput }) =>
      signDpa(organizationId, data),
    onSuccess: (_data, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: [DPA_QUERY_KEY, organizationId] });
    },
  });
}
