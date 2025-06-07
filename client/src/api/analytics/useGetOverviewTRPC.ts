import { GetOverviewInput } from "../../../../server/src/schemas/analytics";
import { trpc } from "../../lib/trpc";

export function useGetOverviewTRPC(input: GetOverviewInput) {
  return trpc.analytics.getOverview.useQuery(input);
}
