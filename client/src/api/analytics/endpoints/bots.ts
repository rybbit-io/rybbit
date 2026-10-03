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
  ai_training_requests: number;
  ai_search_requests: number;
  /** Requests from a bot the curated patterns know by name, and how many such bots. */
  named_requests: number;
  named_bots: number;
  /** Sessions in the site's analytics, and the ones an AI product sent. */
  sessions: number;
  ai_sessions: number;
  /** False when bot blocking is off: the counts are observations still tracked as traffic. */
  blocking: boolean;
};

/** One named bot behind an AI operator. */
export type BotAiBot = {
  name: string;
  purpose: BotPurpose | "";
  reads: number;
  /** Distinct paths the bot requested. */
  pages: number;
  /** Reads per bucket, sparse and in time order. Present when a bucket was requested. */
  trend?: [time: string, reads: number][];
};

/** One AI operator: how much of the site it read, and what it sent back. */
export type BotAiSummaryRow = {
  operator: string;
  crawls: number;
  training_crawls: number;
  search_crawls: number;
  agent_requests: number;
  /** Distinct paths the operator's bots requested. */
  pages: number;
  /** Sessions that arrived from the operator's product. */
  referrals: number;
  crawls_per_referral: number;
  /** The referrer domains that count as the operator's product. */
  referrer_domains: string[];
  bots: BotAiBot[];
};

export type GetBotAiSummaryResponse = BotAiSummaryRow[];

/** One page an AI system read, next to what people did with it. */
export type BotAiPage = {
  pathname: string;
  hostname: string;
  reads: number;
  agent_reads: number;
  /** AI-referred sessions whose first pageview was this page. */
  landed: number;
  human_views: number;
};

export interface PaginatedBotAiPagesResponse {
  data: BotAiPage[];
  totalCount: number;
}

export type BotTimeSeriesPoint = {
  time: string;
  bot_requests: number;
  /** Every split is returned on each bucket so the chart needs no second request. */
  ai_agent_requests: number;
  ai_crawler_requests: number;
  ai_training_requests: number;
  ai_search_requests: number;
  search_requests: number;
  scripted_requests: number;
  unclassified_requests: number;
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
