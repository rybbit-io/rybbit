import { FilterParameter, TimeBucket } from "@rybbit/shared";
import { CommonApiParams, PaginationParams } from "./types";

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
