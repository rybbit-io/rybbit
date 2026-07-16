import { useQuery } from "@tanstack/react-query";
import { useBotsStore } from "../../../../app/[site]/bots/botsStore";
import { useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { type BotDimensionKey, fetchBotDimension } from "../../endpoints";
import { BOT_AVAILABLE_FILTERS } from "./constants";

export function useGetBotDimension({
  site,
  dimension,
  limit = 100,
  page = 1,
}: {
  site?: number | string;
  dimension: BotDimensionKey;
  limit?: number;
  page?: number;
}) {
  const { time, filters, timezone } = useStore();
  const { selectedLayer } = useBotsStore();
  const botFilters = filters.filter(filter => BOT_AVAILABLE_FILTERS.includes(filter.parameter));
  const params = buildApiParams(time, { filters: botFilters });

  return useQuery({
    queryKey: ["bot-dimension", time, site, dimension, limit, page, botFilters, selectedLayer, timezone],
    queryFn: () =>
      fetchBotDimension(site!, { ...params, dimension, limit, page, layer: selectedLayer }).then(data => ({ data })),
    staleTime: 60_000,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const [, , prevSite] = query.queryKey;
      return prevSite === site ? query.state.data : undefined;
    },
    enabled: !!site,
  });
}
