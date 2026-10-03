import { DateTime } from "luxon";
import type {
  BotAiBot,
  BotAiSummaryRow,
  BotTimeSeriesPoint,
  GetBotOverviewResponse,
  Goal,
} from "../../../api/analytics/endpoints";
import { percentChange } from "../../../lib/delta";

/**
 * The page's arithmetic, kept apart from its components: what a stacked bucket
 * is made of, how an operator row is put together from two periods, and when
 * the insight row has something to say.
 */

/** Series colours. They differ in lightness as well as hue, and periwinkle leads. */
export const SERIES_COLORS = {
  periwinkle: "hsl(var(--dataviz))",
  orange: "hsl(var(--orange-400))",
  teal: "hsl(var(--teal-500))",
  pink: "hsl(var(--pink-400))",
  neutral: "hsl(var(--neutral-500))",
} as const;

export const AI_PURPOSE_KEYS = ["training", "search", "agent"] as const;
export type AiPurposeKey = (typeof AI_PURPOSE_KEYS)[number];

export const AI_PURPOSE_COLORS: Record<AiPurposeKey, string> = {
  training: SERIES_COLORS.periwinkle,
  search: SERIES_COLORS.orange,
  agent: SERIES_COLORS.teal,
};

/** `bot_purpose` values for the three AI series. */
export const AI_PURPOSE_BY_KEY: Record<AiPurposeKey, string> = {
  training: "ai_training",
  search: "ai_search",
  agent: "ai_agent",
};

export const BOT_FAMILY_KEYS = ["ai", "search", "tools", "scripted", "unclassified"] as const;
export type BotFamilyKey = (typeof BOT_FAMILY_KEYS)[number];

export const BOT_FAMILY_COLORS: Record<BotFamilyKey, string> = {
  ai: SERIES_COLORS.periwinkle,
  search: SERIES_COLORS.orange,
  tools: SERIES_COLORS.teal,
  scripted: SERIES_COLORS.pink,
  unclassified: SERIES_COLORS.neutral,
};

const count = (value: number | null | undefined) => Number(value ?? 0);

export function aiPurposeCounts(point: BotTimeSeriesPoint): Record<AiPurposeKey, number> {
  return {
    training: count(point.ai_training_requests),
    search: count(point.ai_search_requests),
    agent: count(point.ai_agent_requests),
  };
}

/**
 * A bucket's requests split into the five families the all-bots chart stacks.
 * "tools" is what is left once the others are taken out: SEO crawlers, link
 * previews, monitoring and security scanners.
 */
export function botFamilyCounts(point: BotTimeSeriesPoint): Record<BotFamilyKey, number> {
  const ai = count(point.ai_agent_requests) + count(point.ai_crawler_requests);
  const search = count(point.search_requests);
  const scripted = count(point.scripted_requests);
  const unclassified = count(point.unclassified_requests);
  return {
    ai,
    search,
    scripted,
    unclassified,
    tools: Math.max(0, count(point.bot_requests) - ai - search - scripted - unclassified),
  };
}

/** A server bucket label ("2026-09-01 00:00:00", in the site's timezone) as an instant. */
export const bucketInstant = (time: string, timezone: string) => DateTime.fromSQL(time, { zone: timezone });

/** Buckets that have started. A filled series runs to the end of the period, past now. */
export function startedBuckets<T extends { time: string }>(
  points: T[] | undefined,
  timezone: string,
  now: DateTime
): T[] {
  return (points ?? []).filter(point => bucketInstant(point.time, timezone) <= now);
}

/** A sparse `[time, reads]` trend laid onto the chart's buckets, zero where the bot was quiet. */
export function alignTrend(trend: BotAiBot["trend"], times: string[]): number[] {
  const byTime = new Map(trend ?? []);
  return times.map(time => count(byTime.get(time)));
}

export interface OperatorBot {
  name: string;
  purpose: string;
  reads: number;
  /** Null when there is no comparison period. */
  previousReads: number | null;
  pages: number;
  trend: number[];
}

export interface OperatorRow {
  operator: string;
  reads: number;
  previousReads: number | null;
  training: number;
  search: number;
  agent: number;
  pages: number;
  visits: number;
  previousVisits: number | null;
  /** Reads for each visit sent back. Null when either side is zero: there is no rate. */
  readsPerVisit: number | null;
  referrerDomains: string[];
  bots: OperatorBot[];
  trend: number[];
}

/**
 * A rate needs both halves. An operator that sent nobody back has no rate, and
 * one that read nothing has none either: "0 : 1" would read as a spectacular
 * exchange rate rather than as an absence.
 */
export function readsPerVisit(reads: number, visits: number): number | null {
  return reads > 0 && visits > 0 ? reads / visits : null;
}

/** "11.4", "337": one decimal until the number is big enough not to need it. */
export function formatRatio(ratio: number, locale?: string): string {
  const digits = ratio >= 100 ? 0 : 1;
  return ratio.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * One row per operator, joining this period to the comparison period. With no
 * comparison (`previous` undefined) the previous figures are null, so the
 * change columns draw nothing instead of a change against zero.
 */
export function buildOperatorRows(
  current: BotAiSummaryRow[] | undefined,
  previous: BotAiSummaryRow[] | undefined,
  times: string[]
): OperatorRow[] {
  const previousByOperator = new Map((previous ?? []).map(row => [row.operator, row]));

  return (current ?? []).map(row => {
    const before = previousByOperator.get(row.operator);
    const previousBots = new Map((before?.bots ?? []).map(bot => [bot.name, bot]));
    const reads = count(row.crawls);
    const visits = count(row.referrals);

    const bots = (row.bots ?? []).map(bot => ({
      name: bot.name,
      purpose: bot.purpose,
      reads: count(bot.reads),
      previousReads: previous ? count(previousBots.get(bot.name)?.reads) : null,
      pages: count(bot.pages),
      trend: alignTrend(bot.trend, times),
    }));

    return {
      operator: row.operator,
      reads,
      previousReads: previous ? count(before?.crawls) : null,
      training: count(row.training_crawls),
      search: count(row.search_crawls),
      agent: count(row.agent_requests),
      pages: count(row.pages),
      visits,
      previousVisits: previous ? count(before?.referrals) : null,
      readsPerVisit: readsPerVisit(reads, visits),
      referrerDomains: row.referrer_domains ?? [],
      bots,
      trend: times.map((_, index) => bots.reduce((total, bot) => total + bot.trend[index], 0)),
    };
  });
}

export type OperatorSortKey = "operator" | "reads" | "change" | "pages" | "visits" | "readsPerVisit";

const sortValue = (row: OperatorRow, key: Exclude<OperatorSortKey, "operator">): number | null => {
  switch (key) {
    case "reads":
      return row.reads;
    case "pages":
      return row.pages;
    case "visits":
      return row.visits;
    case "readsPerVisit":
      return row.readsPerVisit;
    case "change":
      return row.previousReads === null ? null : percentChange(row.reads, row.previousReads);
  }
};

/** Sorted copy. Rows with no value for the column (no rate, no baseline) always sink to the bottom. */
export function sortOperatorRows(rows: OperatorRow[], key: OperatorSortKey, descending: boolean): OperatorRow[] {
  const direction = descending ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (key === "operator") return direction * a.operator.localeCompare(b.operator);
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left === null || right === null) {
      if (left === right) return b.reads - a.reads;
      return left === null ? 1 : -1;
    }
    return left === right ? b.reads - a.reads : direction * (left - right);
  });
}

/** Operators whose name or bots match the search text. */
export function filterOperatorRows(rows: OperatorRow[], search: string): OperatorRow[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    row => row.operator.toLowerCase().includes(needle) || row.bots.some(bot => bot.name.toLowerCase().includes(needle))
  );
}

// Below this many requests in the comparison period a percentage is noise.
const INSIGHT_MIN_BASELINE = 100;
// Growth smaller than this is not worth a sentence.
const INSIGHT_MIN_GROWTH = 10;

export interface UnnamedGrowth {
  current: number;
  previous: number;
  /** Percent change of unnamed requests. */
  change: number;
  /** Percent change of named requests, when they have a baseline. */
  namedChange: number | null;
}

/**
 * The one sentence the insight row may say: automation no pattern names grew,
 * and grew faster than the bots that are named. Returns null (no row) unless
 * both periods are loaded, the comparison period had enough unnamed requests
 * to make a percentage meaningful, and the growth clears a fixed floor. Fixed
 * thresholds, no model and no anomaly detection.
 */
export function unnamedGrowth(
  current: Pick<GetBotOverviewResponse, "bot_requests" | "named_requests"> | undefined,
  previous: Pick<GetBotOverviewResponse, "bot_requests" | "named_requests"> | undefined
): UnnamedGrowth | null {
  if (!current || !previous) return null;

  const now = count(current.bot_requests) - count(current.named_requests);
  const before = count(previous.bot_requests) - count(previous.named_requests);
  if (before < INSIGHT_MIN_BASELINE) return null;

  const change = percentChange(now, before);
  if (change === null || change < INSIGHT_MIN_GROWTH) return null;

  const namedChange = percentChange(count(current.named_requests), count(previous.named_requests));
  if (namedChange !== null && namedChange >= change) return null;

  return { current: now, previous: before, change, namedChange };
}

const SIGNUP_PATTERN = /\bsign(?:ed)?[\s_-]?ups?\b/i;

/**
 * The site's signup goal, if it has one: a goal whose name says signup, or
 * failing that an event goal on a signup event. The oldest match wins, so the
 * choice does not move when a second signup-like goal is added later. Null
 * means the page shows visits without signups.
 */
export function resolveSignupGoal(goals: Goal[] | undefined): Goal | null {
  const byAge = [...(goals ?? [])].sort((a, b) => a.goalId - b.goalId);
  return (
    byAge.find(goal => SIGNUP_PATTERN.test(goal.name ?? "")) ??
    byAge.find(goal => goal.goalType === "event" && SIGNUP_PATTERN.test(goal.config?.eventName ?? "")) ??
    null
  );
}

/** "27.1K", "1.3M": one decimal, so two series of similar size stay distinguishable. */
export function formatCompact(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/**
 * A headline count: every digit while it still fits a stat cell, compact once
 * it would not. 8,680 stays 8,680; 132,000 becomes 132K.
 */
export function formatCount(value: number, locale?: string): string {
  return Math.abs(value) < 100_000 ? value.toLocaleString(locale) : formatCompact(value, locale);
}

/** A count as a share of a total, in percent. Null when the total is zero. */
export function share(part: number, total: number): number | null {
  return total > 0 ? (part / total) * 100 : null;
}
