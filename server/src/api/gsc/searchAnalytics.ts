import countries from "i18n-iso-countries";
import { z } from "zod";
import type { GSCQueryRow } from "./types.js";

export const GSC_DIMENSIONS = ["query", "page", "country", "device", "date"] as const;
export type GSCDimension = (typeof GSC_DIMENSIONS)[number];

// The dashboard's single `dimension` param predates `dimensions` and never offered date.
const LEGACY_DIMENSIONS = ["query", "page", "country", "device"] as const;

export const GSC_FILTER_DIMENSIONS = ["query", "page", "country", "device"] as const;
export const GSC_FILTER_OPERATORS = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "includingRegex",
  "excludingRegex",
] as const;
export const GSC_SEARCH_TYPES = ["web", "image", "video", "news", "discover", "googleNews"] as const;
export const GSC_DATA_STATES = ["final", "all"] as const;

export const GSC_MAX_DIMENSIONS = 3;
export const GSC_MAX_FILTERS = 10;
// Search Console's own per-request maximum.
export const GSC_MAX_ROW_LIMIT = 25_000;
const DEFAULT_ROW_LIMIT = 1000;

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const filterSchema = z.object({
  dimension: z.enum(GSC_FILTER_DIMENSIONS),
  operator: z.enum(GSC_FILTER_OPERATORS).default("equals"),
  expression: z.string().min(1).max(4096),
});

// Unknown params (the dashboard also sends time_zone) are stripped, not rejected.
const querySchema = z.object({
  start_date: z.string({ required_error: "Missing start_date" }).regex(dateRegex, "Use YYYY-MM-DD"),
  end_date: z.string({ required_error: "Missing end_date" }).regex(dateRegex, "Use YYYY-MM-DD"),
  dimension: z.enum(LEGACY_DIMENSIONS).optional(),
  dimensions: z.string().optional(),
  filters: z.string().optional(),
  search_type: z.enum(GSC_SEARCH_TYPES).optional(),
  data_state: z.enum(GSC_DATA_STATES).optional(),
  row_limit: z.coerce.number().int().min(1).max(GSC_MAX_ROW_LIMIT).optional(),
  start_row: z.coerce.number().int().min(0).optional(),
});

/** A query the caller can fix; its message is safe to return as a 400. */
export class GSCQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GSCQueryError";
  }
}

export interface SearchAnalyticsRequest {
  dimensions: GSCDimension[];
  /** Set when the caller used the single `dimension` param; rows then keep the `{ name }` shape the dashboard reads. */
  legacy: boolean;
  /** Body for POST https://www.googleapis.com/webmasters/v3/sites/{property}/searchAnalytics/query */
  body: Record<string, unknown>;
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map(issue => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}

function parseDimensions(raw: string): GSCDimension[] {
  const requested = [
    ...new Set(
      raw
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
    ),
  ];
  const unknown = requested.filter(value => !(GSC_DIMENSIONS as readonly string[]).includes(value));
  if (unknown.length > 0) {
    throw new GSCQueryError(`Unknown dimension(s): ${unknown.join(", ")}. Use ${GSC_DIMENSIONS.join(", ")}.`);
  }
  if (requested.length === 0 || requested.length > GSC_MAX_DIMENSIONS) {
    throw new GSCQueryError(`dimensions must list 1 to ${GSC_MAX_DIMENSIONS} of: ${GSC_DIMENSIONS.join(", ")}`);
  }
  return requested as GSCDimension[];
}

// Search Console stores countries as lowercase ISO 3166-1 alpha-3 and devices
// in upper case, while Rybbit (and this API's output) uses alpha-2 codes.
function normalizeFilterExpression(filter: z.infer<typeof filterSchema>): string {
  const exact = filter.operator === "equals" || filter.operator === "notEquals";
  if (!exact) {
    return filter.expression;
  }
  if (filter.dimension === "device") {
    return filter.expression.toUpperCase();
  }
  if (filter.dimension === "country") {
    const code = filter.expression.trim().toUpperCase();
    const alpha3 = code.length === 2 ? countries.alpha2ToAlpha3(code) : code;
    return (alpha3 || code).toLowerCase();
  }
  return filter.expression;
}

function parseFilters(raw: string | undefined) {
  if (raw === undefined || raw === "") {
    return [];
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new GSCQueryError("filters must be a JSON array of {dimension, operator, expression}");
  }
  const parsed = z.array(filterSchema).max(GSC_MAX_FILTERS).safeParse(json);
  if (!parsed.success) {
    throw new GSCQueryError(`Invalid filters: ${describeIssues(parsed.error)}`);
  }
  return parsed.data.map(filter => ({
    dimension: filter.dimension,
    operator: filter.operator,
    expression: normalizeFilterExpression(filter),
  }));
}

/**
 * Validates the REST query and builds the Search Analytics request body.
 * Throws GSCQueryError for anything the caller can correct.
 */
export function buildSearchAnalyticsRequest(rawQuery: unknown): SearchAnalyticsRequest {
  const parsed = querySchema.safeParse(rawQuery ?? {});
  if (!parsed.success) {
    throw new GSCQueryError(describeIssues(parsed.error));
  }
  const query = parsed.data;

  if (query.start_date > query.end_date) {
    throw new GSCQueryError("start_date must be on or before end_date");
  }

  let dimensions: GSCDimension[];
  let legacy = false;
  if (query.dimensions !== undefined) {
    dimensions = parseDimensions(query.dimensions);
  } else if (query.dimension) {
    dimensions = [query.dimension];
    legacy = true;
  } else {
    throw new GSCQueryError("Missing dimension parameter");
  }

  const filters = parseFilters(query.filters);

  const body: Record<string, unknown> = {
    startDate: query.start_date,
    endDate: query.end_date,
    dimensions,
    rowLimit: query.row_limit ?? DEFAULT_ROW_LIMIT,
  };
  if (query.start_row) {
    body.startRow = query.start_row;
  }
  if (query.search_type) {
    body.type = query.search_type;
  }
  if (query.data_state) {
    body.dataState = query.data_state;
  }
  if (filters.length > 0) {
    body.dimensionFilterGroups = [{ groupType: "and", filters }];
  }

  return { dimensions, legacy, body };
}

function normalizeKey(dimension: GSCDimension, value: string | undefined): string | undefined {
  if (dimension === "country" && value) {
    return countries.alpha3ToAlpha2(value.toUpperCase()) || value;
  }
  return value;
}

/**
 * Flattens Search Console rows. Legacy single-dimension requests keep
 * `{ name, ...metrics }`; `dimensions` requests name each key after its
 * dimension, e.g. `{ query, page, clicks, impressions, ctr, position }`.
 */
export function mapSearchAnalyticsRows(
  rows: GSCQueryRow[] | undefined,
  request: Pick<SearchAnalyticsRequest, "dimensions" | "legacy">
) {
  return (rows ?? []).map(row => {
    const metrics = { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position };
    if (request.legacy) {
      return { name: normalizeKey(request.dimensions[0], row.keys?.[0]), ...metrics };
    }
    const keys = Object.fromEntries(
      request.dimensions.map((dimension, index) => [dimension, normalizeKey(dimension, row.keys?.[index])])
    );
    return { ...keys, ...metrics };
  });
}

/**
 * Maps a failed Search Console response onto this API's status and message.
 * Google's 401/403 describe Rybbit's stored Google grant, not the caller, so
 * they must not surface as the caller's own 401/403.
 */
export function describeUpstreamError(status: number, bodyText: string): { status: number; error: string } {
  let upstreamMessage: string | undefined;
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: unknown } };
    if (typeof parsed.error?.message === "string") {
      upstreamMessage = parsed.error.message;
    }
  } catch {
    // Non-JSON body; fall through to the generic message.
  }

  if (status === 400) {
    return {
      status: 400,
      error: upstreamMessage
        ? `Search Console rejected the query: ${upstreamMessage}`
        : "Search Console rejected the query",
    };
  }
  if (status === 401 || status === 403) {
    return {
      status: 502,
      error:
        "Search Console denied access to this site's property. Reconnect Search Console in the dashboard under Site settings > Integrations.",
    };
  }
  if (status === 429) {
    return { status: 429, error: "Search Console quota exceeded. Try again later." };
  }
  return { status: 502, error: "Failed to fetch GSC data" };
}
