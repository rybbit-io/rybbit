import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { buildApiParams } from "../../../utils";
import { fetchBotOverview } from "../../endpoints";
import { BOT_AVAILABLE_FILTERS } from "./constants";

export function useGetBotOverview({ site }: { site?: number | string }) {
  const { time, filters, timezone } = useStore();
  const { selectedLayer } = useBotsStore();
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));
  const params = buildApiParams(time, { filters: botFilters });

  return useQuery({
    queryKey: ["bot-overview", time, site, botFilters, selectedLayer, timezone],
    queryFn: () => fetchBotOverview(site!, { ...params, layer: selectedLayer }).then(data => ({ data })),
    staleTime: 60_000,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const [, , prevSite] = query.queryKey;
      return prevSite === site ? query.state.data : undefined;
    },
    enabled: !!site,
  });
}
