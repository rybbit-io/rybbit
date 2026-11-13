import { Transform, type Readable } from "node:stream";
import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { resolveTimeWindow } from "./utils/timeWindow.js";

/**
 * The most events one export request may return. A larger range is refused
 * with 413 before any data is sent, so callers split it (by month, say). At
 * ~500 bytes a CSV row this is about 1 GB, which a browser or script streams
 * to disk without trouble but which no single HTTP response should exceed.
 * ClickHouse enforces it too (max_result_rows), so rows inserted between the
 * count and the export cannot push a response past it.
 */
export const EXPORT_MAX_ROWS = 2_000_000;

export const EXPORT_FORMATS = {
  csv: { clickhouse: "CSVWithNames", contentType: "text/csv; charset=utf-8", extension: "csv" },
  ndjson: { clickhouse: "JSONEachRow", contentType: "application/x-ndjson; charset=utf-8", extension: "ndjson" },
} as const;

export type ExportFormat = keyof typeof EXPORT_FORMATS;

/**
 * Spreadsheets run a CSV cell that starts with = + - @ (or a tab / carriage
 * return before one) as a formula, and visitors control most of these strings:
 * page titles, paths, event names and properties. CSV cells get a leading
 * apostrophe, which spreadsheets show as text; NDJSON keeps values as stored.
 */
const csvText = (format: ExportFormat, column: string, expression = column) =>
  format === "csv"
    ? `if(match(${expression}, '^[=+@\\t\\r-]'), concat('\\'', ${expression}), ${expression}) AS ${column}`
    : `${expression} AS ${column}`;

/** Visitor- or SDK-supplied strings, in output order between `props` and `screen_width`. */
const TEXT_COLUMNS = [
  "session_id",
  "user_id",
  "identified_user_id",
  "hostname",
  "pathname",
  "querystring",
  "page_title",
  "referrer",
  "channel",
  "browser",
  "browser_version",
  "operating_system",
  "operating_system_version",
  "device_type",
];

/**
 * One row per event, oldest first. Leaves out what is not the customer's
 * analytics data or would identify a visitor beyond what the dashboard shows:
 * the raw IP, ASN fields and the bot-detection visitor key. `timestamp` is
 * ISO-8601 UTC with milliseconds.
 */
const EXPORT_COLUMNS = (format: ExportFormat) =>
  [
    "concat(replaceOne(toString(timestamp_ms), ' ', 'T'), 'Z') AS timestamp",
    csvText(format, "type"),
    csvText(format, "event_name"),
    format === "csv" ? csvText(format, "props", "toString(props)") : "props",
    ...TEXT_COLUMNS.map(column => csvText(format, column)),
    "screen_width",
    "screen_height",
    csvText(format, "language"),
    "country",
    csvText(format, "region"),
    csvText(format, "city"),
    "lat",
    "lon",
    "lcp",
    "cls",
    "inp",
    "fcp",
    "ttfb",
    csvText(format, "tag"),
  ].join(",\n  ");

/**
 * Exports read every matching row, so they get fewer threads than a dashboard
 * query: a slow export must not starve the dashboards. The export's time limit
 * is far above what EXPORT_MAX_ROWS needs and only stops a stuck stream; the
 * count is one aggregate, and a range it cannot count in a minute is one the
 * export would refuse anyway.
 */
const COUNT_CLICKHOUSE_SETTINGS = {
  max_threads: 2,
  max_execution_time: 60,
} as const;
const EXPORT_CLICKHOUSE_SETTINGS = {
  max_threads: 2,
  max_execution_time: 1800,
  max_result_rows: String(EXPORT_MAX_ROWS),
  result_overflow_mode: "throw",
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
 * Reads in the table's sort order (site_id, timestamp); ClickHouse only has to
 * order the events within each second by their milliseconds. The output
 * columns reuse source names (`timestamp`, `pathname`, …), and ClickHouse
 * would otherwise resolve WHERE, ORDER BY and the CSV guards to those aliases;
 * prefer_column_name_to_alias keeps them on the stored columns.
 */
export const buildExportQuery = (query: ExportQuerystring, siteId: number, format: ExportFormat) => `
  SELECT
  ${EXPORT_COLUMNS(format)}
  FROM events
  WHERE ${whereClause(query, siteId)}
  ORDER BY site_id, timestamp, timestamp_ms
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

async function countExportRows(query: ExportQuerystring, siteId: number, abortSignal?: AbortSignal) {
  const result = await clickhouse.query({
    query: buildExportCountQuery(query, siteId),
    query_params: { siteId },
    format: "JSONEachRow",
    clickhouse_settings: COUNT_CLICKHOUSE_SETTINGS,
    abort_signal: abortSignal,
  });
  const rows = await result.json<{ rows: string | number }>();
  return Number(rows[0]?.rows ?? 0);
}

const EXCEPTION_MARKER = "__exception__";
/** Enough of the stream's end to hold ClickHouse's exception block. */
const EXCEPTION_TAIL_BYTES = 64 * 1024;

/**
 * Passes a ClickHouse response body through, failing the stream if ClickHouse
 * reported an error after the 200 went out (a limit hit mid-export, say).
 * ClickHouse 25.11+ appends such errors to the body, framed by the
 * `X-ClickHouse-Exception-Tag` header value; without this the client would
 * save the error text as the last rows of a "successful" file. The last
 * EXCEPTION_TAIL_BYTES are held back until the end so the block is never
 * forwarded. Failing destroys the response, so the download is reported as
 * failed rather than complete.
 */
export function failOnClickhouseException(stream: Readable, exceptionTag: string | undefined): Readable {
  if (!exceptionTag) return stream;
  const marker = Buffer.from(`${EXCEPTION_MARKER}\r\n${exceptionTag}`);
  let tail: Buffer = Buffer.alloc(0);
  const guard = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      tail = tail.length ? Buffer.concat([tail, chunk]) : chunk;
      if (tail.length > EXCEPTION_TAIL_BYTES * 2) {
        const keep = tail.length - EXCEPTION_TAIL_BYTES;
        if (tail.subarray(0, keep).includes(marker)) {
          return callback(new Error("ClickHouse reported an error mid-export"));
        }
        this.push(tail.subarray(0, keep));
        tail = tail.subarray(keep);
      }
      callback();
    },
    flush(callback) {
      const at = tail.indexOf(marker);
      if (at !== -1) {
        const message = tail
          .subarray(at + marker.length)
          .toString("utf8")
          .trim()
          .slice(0, 500);
        return callback(new Error(`ClickHouse reported an error mid-export: ${message}`));
      }
      callback(null, tail);
    },
  });
  stream.on("error", error => guard.destroy(error));
  return stream.pipe(guard);
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
 * that disconnects cancels the ClickHouse queries.
 */
export async function exportEvents(request: FastifyRequest<ExportEventsRequest>, reply: FastifyReply) {
  const siteId = Number(request.params.siteId);
  const format = parseExportFormat(request.query.format);
  if (!format) {
    return reply.status(400).send({ error: `format must be one of: ${Object.keys(EXPORT_FORMATS).join(", ")}` });
  }

  // The response closing before it finished means the client went away
  // (during the count or the stream); stop ClickHouse rather than let it read
  // on for nobody.
  const abortController = new AbortController();
  reply.raw.on("close", () => {
    if (!reply.raw.writableFinished) abortController.abort();
  });

  let rows: number;
  try {
    rows = await countExportRows(request.query, siteId, abortController.signal);
  } catch (error) {
    if (abortController.signal.aborted) return;
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
  if (abortController.signal.aborted) return;

  try {
    const { stream, response_headers } = await clickhouse.exec({
      query: buildExportQuery(request.query, siteId, format),
      query_params: { siteId },
      clickhouse_settings: EXPORT_CLICKHOUSE_SETTINGS,
      abort_signal: abortController.signal,
    });
    const exceptionTag = response_headers["x-clickhouse-exception-tag"];
    const body = failOnClickhouseException(stream, Array.isArray(exceptionTag) ? exceptionTag[0] : exceptionTag);
    body.on("error", error => {
      if (!abortController.signal.aborted) request.log.error({ err: error }, "Event export failed mid-stream");
    });

    return reply
      .header("Content-Type", EXPORT_FORMATS[format].contentType)
      .header("Content-Disposition", `attachment; filename="${exportFilename(siteId, request.query, format)}"`)
      .header("Cache-Control", "no-store")
      .header("X-Export-Rows", String(rows))
      .send(body);
  } catch (error) {
    if (abortController.signal.aborted) return;
    request.log.error({ err: error }, "Error exporting events");
    return reply.status(500).send({ error: "Failed to export events" });
  }
}
