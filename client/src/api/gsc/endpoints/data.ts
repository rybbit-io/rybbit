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
export async function fetchGSCData<Dimension extends GSCDimension>(
  site: string | number,
  params: GSCDataParams & { dimension: Dimension }
): Promise<GSCData[]> {
  const response = await authedFetch<{ data: (Omit<GSCData, "name"> & Record<Dimension, string>)[] }>(
    `/sites/${site}/gsc/data`,
    {
      dimensions: params.dimension,
      start_date: params.startDate,
      end_date: params.endDate,
      time_zone: params.timeZone,
    }
  );
  return response.data.map(row => ({
    name: row[params.dimension],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}
