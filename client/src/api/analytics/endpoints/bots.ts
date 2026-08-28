import { FilterParameter, TimeBucket } from "@rybbit/shared";
import { CommonApiParams, PaginationParams } from "./types";

export type BotLayerKey = "ua_pattern" | "header_heuristics" | "client_signals" | "bot_asn" | "rate_anomaly";

export type BotDimensionKey =
  | FilterParameter
  | "asn_org"
  | "asn_provider"
  | "bot_category"
  | "bot_name"
  | "bot_operator"
  | "bot_purpose"
  | "matched_ua_pattern";

/**
 * What the operator does with the fetch. `bot_category` groups by family; this
 * separates the three things that all read as "ai" — a crawler building a
 * training corpus, an answer engine indexing for retrieval, and a fetch a
 * person asked for a moment ago.
 */
export type BotPurpose =
  | "ai_training"
  | "ai_search"
  | "ai_agent"
  | "search"
  | "social_preview"
  | "seo"
  | "monitoring"
  | "security"
  | "scripted"
  | "headless";

export type GetBotOverviewResponse = Record<BotLayerKey, number> & {
  bot_requests: number;
  total_events: number;
  bot_percentage: number;
  ai_requests: number;
  ai_agent_requests: number;
  ai_crawler_requests: number;
};

/** One AI operator: how much of the site it read, and what it sent back. */
export type BotAiSummaryRow = {
  operator: string;
  crawls: number;
  training_crawls: number;
  search_crawls: number;
  agent_requests: number;
  referrals: number;
  crawls_per_referral: number;
};

export type GetBotAiSummaryResponse = BotAiSummaryRow[];

export type BotTimeSeriesPoint = {
  time: string;
  bot_requests: number;
  /** Both returned on every bucket so the AI chart needs no second request. */
  ai_agent_requests: number;
  ai_crawler_requests: number;
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
