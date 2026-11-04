import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminApiKeyData, deleteAdminApiKey, getAdminApiKeys, updateAdminApiKey } from "../endpoints";

const ADMIN_API_KEYS_QUERY_KEY = ["admin-api-keys"];

export function useAdminApiKeys() {
  return useQuery<AdminApiKeyData[]>({
    queryKey: ADMIN_API_KEYS_QUERY_KEY,
    queryFn: getAdminApiKeys,
    staleTime: 60_000,
  });
}

// The admin may also own some of these keys, so the settings-page lists are
// refreshed too.
function useInvalidateApiKeys() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_API_KEYS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["userApiKeys"] });
    queryClient.invalidateQueries({ queryKey: ["orgApiKeys"] });
  };
}

export function useUpdateAdminApiKey() {
  const invalidate = useInvalidateApiKeys();
  return useMutation({
    mutationFn: ({ keyId, enabled }: { keyId: string; enabled: boolean }) => updateAdminApiKey(keyId, { enabled }),
    onSuccess: invalidate,
  });
}

export function useDeleteAdminApiKey() {
  const invalidate = useInvalidateApiKeys();
  return useMutation({
    mutationFn: (keyId: string) => deleteAdminApiKey(keyId),
    onSuccess: invalidate,
  });
}
