import { authedFetch } from "../../utils";
import { CommonApiParams, toQueryParams } from "./types";

export type AdClicksBreakdownItem = {
  value: string;
  count: number;
  percentage: number;
};

export interface AdClicksBreakdownParams extends CommonApiParams {
  parameter: string;
  limit?: number;
}

export async function fetchAdClicksBreakdown(
  site: string | number,
  params: AdClicksBreakdownParams
): Promise<AdClicksBreakdownItem[]> {
  const queryParams = {
    ...toQueryParams(params),
    parameter: params.parameter,
    limit: params.limit,
  };

  const response = await authedFetch<{ data: AdClicksBreakdownItem[] }>(
    `/sites/${site}/ad-clicks/breakdown`,
    queryParams
  );
  return response.data;
}
