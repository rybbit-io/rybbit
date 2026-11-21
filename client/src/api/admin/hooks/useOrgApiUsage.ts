import { useQuery } from "@tanstack/react-query";
import { getOrgApiUsage, GetOrgApiUsageResponse } from "../endpoints";

// Today's API request count against the organization's daily quota. Kept
// briefly fresh rather than cached indefinitely: the number moves whenever an
// integration runs, and a stale reading is the one thing that would make the
// card useless.
export const useOrgApiUsage = (organizationId?: string) => {
  return useQuery<GetOrgApiUsageResponse>({
    queryKey: ["org-api-usage", organizationId],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      return getOrgApiUsage(organizationId);
    },
    staleTime: 60_000,
    enabled: !!organizationId,
  });
};
