import { authedFetch } from "../../utils";
import { CommonApiParams, toQueryParams } from "./types";

export type AdsBreakdownItem = {
  value: string;
  count: number;
  percentage: number;
};

export interface AdsBreakdownParams extends CommonApiParams {
  parameter: string;
  type?: "ad_click" | "ad_impression";
  limit?: number;
}

export async function fetchAdsBreakdown(
  site: string | number,
  params: AdsBreakdownParams
): Promise<AdsBreakdownItem[]> {
  const queryParams = {
    ...toQueryParams(params),
    parameter: params.parameter,
    type: params.type,
    limit: params.limit,
  };

  const response = await authedFetch<{ data: AdsBreakdownItem[] }>(
    `/sites/${site}/ads/breakdown`,
    queryParams
  );
  return response.data;
}
