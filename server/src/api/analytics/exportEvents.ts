import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { resolveTimeWindow } from "./utils/timeWindow.js";

/**
 * The most events one export request may return. A larger range is refused
 * with 413 before any data is read, so callers split it (by month, say). At
 * ~500 bytes a CSV row this is about 1 GB, which a browser or script streams
 * to disk without trouble but which no single HTTP response should exceed.
 */
export const EXPORT_MAX_ROWS = 2_000_000;

export const EXPORT_FORMATS = {
  csv: { clickhouse: "CSVWithNames", contentType: "text/csv; charset=utf-8", extension: "csv" },
  ndjson: { clickhouse: "JSONEachRow", contentType: "application/x-ndjson; charset=utf-8", extension: "ndjson" },
} as const;

export type ExportFormat = keyof typeof EXPORT_FORMATS;

/**
 * One row per event, in the order stored. Leaves out what is not the
 * customer's analytics data or would identify a visitor beyond what the
 * dashboard shows: the raw IP, ASN fields and the bot-detection visitor key.
 * `timestamp` is ISO-8601 UTC with milliseconds.
 */
const EXPORT_COLUMNS = (format: ExportFormat) => `
  concat(replaceOne(toString(timestamp_ms), ' ', 'T'), 'Z') AS timestamp,
  type,
  event_name,
  ${format === "csv" ? "toString(props)" : "props"} AS props,
  session_id,
  user_id,
  identified_user_id,
  hostname,
  pathname,
  querystring,
  page_title,
  referrer,
  channel,
  browser,
  browser_version,
  operating_system,
  operating_system_version,
  device_type,
  screen_width,
  screen_height,
  language,
  country,
  region,
  city,
  lat,
  lon,
  lcp,
  cls,
  inp,
  fcp,
  ttfb,
  tag
`;

/**
 * Exports read every matching row, so they get fewer threads than a dashboard
 * query and a longer time limit: a slow export must not starve the dashboards.
 * The time limit is far above what EXPORT_MAX_ROWS needs; it only stops a
 * stuck stream.
 */
const EXPORT_CLICKHOUSE_SETTINGS = {
  max_threads: 2,
  max_execution_time: 1800,
} as const;

export type ExportQuerystring = Partial<FilterParams<{ format?: string }>>;

export interface ExportEventsRequest {
  Params: { siteId: string };
  Querystring: ExportQuerystring;
}

const whereClause = (query: ExportQuerystring, siteId: number) => {
  const timeStatement = resolveTimeWindow(query).where();
  const filterStatement = getFilterStatement(query.filters ?? "", siteId, timeStatement);
  return `site_id = {siteId:UInt16} ${timeStatement} ${filterStatement}`;
};

/**
 * Reads in the table's sort order (site_id, timestamp), so ClickHouse streams
 * without sorting. The output columns reuse source names (`timestamp`,
 * `props`), and ClickHouse would otherwise resolve WHERE and ORDER BY to those
 * aliases; prefer_column_name_to_alias keeps them on the stored columns.
 */
export const buildExportQuery = (query: ExportQuerystring, siteId: number, format: ExportFormat) => `
  SELECT ${EXPORT_COLUMNS(format)}
  FROM events
  WHERE ${whereClause(query, siteId)}
  ORDER BY site_id, timestamp
  SETTINGS prefer_column_name_to_alias = 1
  FORMAT ${EXPORT_FORMATS[format].clickhouse}
`;

export const buildExportCountQuery = (query: ExportQuerystring, siteId: number) => `
  SELECT count() AS rows
  FROM events
  WHERE ${whereClause(query, siteId)}
`;

export const parseExportFormat = (value: string | undefined): ExportFormat | null => {
  if (value === undefined || value === "") return "csv";
  return Object.prototype.hasOwnProperty.call(EXPORT_FORMATS, value) ? (value as ExportFormat) : null;
};

export const exportFilename = (siteId: number, query: ExportQuerystring, format: ExportFormat) => {
  const range =
    query.start_date && query.end_date
      ? `${query.start_date}-to-${query.end_date}`
      : query.start_date || query.end_date || query.start_datetime || query.past_minutes_start
        ? "range"
        : "all-time";
  return `rybbit-${siteId}-events-${range}.${EXPORT_FORMATS[format].extension}`;
};

async function countExportRows(query: ExportQuerystring, siteId: number): Promise<number> {
  const result = await clickhouse.query({
    query: buildExportCountQuery(query, siteId),
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ rows: string | number }>();
  return Number(rows[0]?.rows ?? 0);
}

/**
 * GET /sites/:siteId/export/events/count
 * How many events an export with the same parameters would return, and the cap.
 */
export async function getExportEventsCount(request: FastifyRequest<ExportEventsRequest>, reply: FastifyReply) {
  const siteId = Number(request.params.siteId);
  try {
    const rows = await countExportRows(request.query, siteId);
    return reply.send({ data: { rows, maxRows: EXPORT_MAX_ROWS } });
  } catch (error) {
    request.log.error({ err: error }, "Error counting export rows");
    return reply.status(500).send({ error: "Failed to count events" });
  }
}

/**
 * GET /sites/:siteId/export/events
 * Streams the site's raw events as CSV or NDJSON. ClickHouse output is piped
 * straight to the response, so memory stays flat whatever the size; a client
 * that disconnects cancels the ClickHouse query.
 */
export async function exportEvents(request: FastifyRequest<ExportEventsRequest>, reply: FastifyReply) {
  const siteId = Number(request.params.siteId);
  const format = parseExportFormat(request.query.format);
  if (!format) {
    return reply.status(400).send({ error: `format must be one of: ${Object.keys(EXPORT_FORMATS).join(", ")}` });
  }

  let rows: number;
  try {
    rows = await countExportRows(request.query, siteId);
  } catch (error) {
    request.log.error({ err: error }, "Error counting export rows");
    return reply.status(500).send({ error: "Failed to export events" });
  }

  if (rows > EXPORT_MAX_ROWS) {
    return reply.status(413).send({
      error: `This range has ${rows} events; one export returns at most ${EXPORT_MAX_ROWS}. Split it into smaller date ranges.`,
      rows,
      maxRows: EXPORT_MAX_ROWS,
    });
  }

  // The response closing before it finished means the client went away; stop
  // ClickHouse rather than let it read on into a dead socket.
  const abortController = new AbortController();
  reply.raw.on("close", () => {
    if (!reply.raw.writableFinished) abortController.abort();
  });

  try {
    const { stream } = await clickhouse.exec({
      query: buildExportQuery(request.query, siteId, format),
      query_params: { siteId },
      clickhouse_settings: EXPORT_CLICKHOUSE_SETTINGS,
      abort_signal: abortController.signal,
    });

    return reply
      .header("Content-Type", EXPORT_FORMATS[format].contentType)
      .header("Content-Disposition", `attachment; filename="${exportFilename(siteId, request.query, format)}"`)
      .header("Cache-Control", "no-store")
      .header("X-Export-Rows", String(rows))
      .send(stream);
  } catch (error) {
    if (abortController.signal.aborted) return;
    request.log.error({ err: error }, "Error exporting events");
    return reply.status(500).send({ error: "Failed to export events" });
  }
}
