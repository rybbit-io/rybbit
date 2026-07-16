import { authedFetch } from "../../utils";

export type GSCDimension = "query" | "page" | "country" | "device";

export type GSCData = {
  name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export interface GSCDataParams {
  dimension: GSCDimension;
  startDate: string;
  endDate: string;
  timeZone: string;
}

/**
 * Fetch Google Search Console data for a specific dimension
 * GET /api/sites/:site/gsc/data
 */
export async function fetchGSCData(
  site: string | number,
  params: GSCDataParams
): Promise<GSCData[]> {
  const response = await authedFetch<{ data: GSCData[] }>(
    `/sites/${site}/gsc/data`,
    {
      dimension: params.dimension,
      start_date: params.startDate,
      end_date: params.endDate,
      time_zone: params.timeZone,
    }
  );
  return response.data;
}
