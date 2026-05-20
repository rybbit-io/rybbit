import { FilterParameter, TimeBucket } from "@rybbit/shared";
import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, toQueryParams } from "./types";

export type BotLayerKey = "ua_pattern" | "header_heuristics" | "client_signals" | "bot_asn" | "rate_anomaly";

export type BotDimensionKey = FilterParameter | "asn_org" | "bot_category" | "matched_ua_pattern";

export type GetBotOverviewResponse = Record<BotLayerKey, number> & {
  bot_requests: number;
  total_events: number;
  bot_percentage: number;
};

export type BotTimeSeriesPoint = {
  time: string;
  bot_requests: number;
};

export type GetBotTimeSeriesResponse = BotTimeSeriesPoint[];

export type BotDimensionItem = {
  value: string;
  hostname?: string;
  count: number;
  percentage: number;
};

export interface BotOverviewParams extends CommonApiParams {
  layer?: BotLayerKey | null;
}

export interface BotTimeSeriesParams extends CommonApiParams {
  bucket: TimeBucket;
  layer?: BotLayerKey | null;
}

export interface BotDimensionParams extends CommonApiParams, PaginationParams {
  dimension: BotDimensionKey;
  layer?: BotLayerKey | null;
}

export interface PaginatedBotDimensionResponse {
  data: BotDimensionItem[];
  totalCount: number;
}

export async function fetchBotOverview(
  site: string | number,
  params: BotOverviewParams
): Promise<GetBotOverviewResponse> {
  const response = await authedFetch<{ data: GetBotOverviewResponse }>(`/sites/${site}/bots/overview`, {
    ...toQueryParams(params),
    layer: params.layer || undefined,
  });
  return response.data;
}

export async function fetchBotTimeSeries(
  site: string | number,
  params: BotTimeSeriesParams
): Promise<GetBotTimeSeriesResponse> {
  const response = await authedFetch<{ data: GetBotTimeSeriesResponse }>(`/sites/${site}/bots/time-series`, {
    ...toQueryParams(params),
    bucket: params.bucket,
    layer: params.layer || undefined,
  });
  return response.data;
}

export async function fetchBotDimension(
  site: string | number,
  params: BotDimensionParams
): Promise<PaginatedBotDimensionResponse> {
  const response = await authedFetch<{ data: PaginatedBotDimensionResponse }>(`/sites/${site}/bots/by-dimension`, {
    ...toQueryParams(params),
    dimension: params.dimension,
    limit: params.limit,
    page: params.page,
    layer: params.layer || undefined,
  });
  return response.data;
}
