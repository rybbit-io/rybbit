import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../lib/store";
import { authedFetch, getQueryParams } from "../utils";

export type LiveSessionLocation = {
  lat: number;
  lon: number;
  count: number;
  city: string;
  country: string;
};

export function useGetSessionLocations() {
  const { time, site, filters } = useStore();
  return useQuery<LiveSessionLocation[]>({
    queryKey: ["session-locations", site, time, filters],
    queryFn: () => {
      const queryParams = {
        ...getQueryParams(time),
        filters: filters.filter(
          f =>
            f.parameter !== "lat" &&
            f.parameter !== "lon" &&
            f.parameter !== "city" &&
            f.parameter !== "country" &&
            f.parameter !== "region"
        ),
      };

      return authedFetch(`/session-locations/${site}`, queryParams).then((res: any) => res.data);
    },
  });
}
