import { FastifyReply, FastifyRequest } from "fastify";
import { enrichWithTraits } from "../utils/utils.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, QuerySpec, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export type GetEventsResponse = {
  timestamp: string;
  event_name: string;
  properties: string;
  session_id: string;
  user_id: string;
  identified_user_id: string;
  pathname: string;
  querystring: string;
  hostname: string;
  referrer: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  language: string;
  country: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  screen_width: number;
  screen_height: number;
  device_type: string;
  type: string;
  page_title: string;
  /** The row's place in the log, as a cursor; also tells rows apart. */
  event_cursor: string;
}[];

interface GetEventsRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    page_size?: string;
    /** Exact cursors: a cursor from an earlier response, or a row's `event_cursor`. */
    before_cursor?: string;
    since_cursor?: string;
    /** Whole-second bounds, kept for API callers; events sharing the boundary second are skipped. */
    since_timestamp?: string;
    before_timestamp?: string;
  }>;
}

/**
 * Events are ordered by `timestamp`, then `timestamp_ms`, then a hash of the
 * fields that tell two events apart. `timestamp` alone is whole seconds, so a
 * cursor on it skipped every other event in the boundary second; leading with
 * it (rather than `timestamp_ms`) keeps the read in the table's sort order.
 * `timestamp` is `timestamp_ms` truncated to the second, so the three keys sort
 * the same way as the last two.
 *
 * The hash covers every per-event column: imported events carry whole-second
 * times, so two rows can differ only in their properties. Session-level columns
 * (browser, location, …) follow from `session_id`. Rows equal in all of these
 * still share a cursor; without a row id nothing can tell them apart.
 */
const EVENT_TIEBREAK_COLUMNS = [
  "session_id",
  "user_id",
  "identified_user_id",
  "type",
  "event_name",
  "hostname",
  "pathname",
  "querystring",
  "page_title",
  "referrer",
  "toString(props)",
  "ifNull(toString(import_id), '')",
];
const EVENT_TIEBREAK = `leftPad(hex(cityHash64(${EVENT_TIEBREAK_COLUMNS.join(", ")})), 16, '0')`;
const EVENT_ORDER = `timestamp DESC, timestamp_ms DESC, ${EVENT_TIEBREAK} DESC`;
const EVENT_ORDER_ASC = `timestamp, timestamp_ms, ${EVENT_TIEBREAK}`;

/** `<epoch milliseconds>_<16 hex digits>`: fixed width, so cursors also compare as strings. */
const EVENT_CURSOR = `concat(toString(toUnixTimestamp64Milli(timestamp_ms)), '_', ${EVENT_TIEBREAK}) AS event_cursor`;
const EVENT_CURSOR_PATTERN = /^(\d{1,15})_([0-9A-F]{16})$/;

export interface EventCursor {
  ms: number;
  tiebreak: string;
}

export const parseEventCursor = (value: string): EventCursor | null => {
  const match = EVENT_CURSOR_PATTERN.exec(value);
  return match ? { ms: Number(match[1]), tiebreak: match[2] } : null;
};

const formatEventCursor = (cursor: EventCursor) => `${cursor.ms}_${cursor.tiebreak}`;

const compareEventCursors = (a: EventCursor, b: EventCursor) =>
  a.ms - b.ms || (a.tiebreak < b.tiebreak ? -1 : a.tiebreak > b.tiebreak ? 1 : 0);

/** Events per poll; a larger backlog is read oldest first over several polls. */
export const POLL_LIMIT = 500;

/**
 * How far back a poll reads again. Events are stamped on receipt but written by
 * queues that flush every second per worker, so one received earlier can be
 * inserted after one received later, behind a cursor that has already passed it.
 */
export const POLL_OVERLAP_MS = 5000;

/** Sorts after every event received before `now - POLL_OVERLAP_MS`, and before every one received since. */
const pollWatermark = (now: number): EventCursor => ({ ms: now - POLL_OVERLAP_MS - 1, tiebreak: "F".repeat(16) });

/**
 * Where the next poll resumes, given the cursors of this poll's rows (oldest
 * first) and the time it started. A full page that ends before the watermark
 * has more to read straight away. Otherwise every event before the watermark
 * has been read, and the next poll starts there, re-reading the overlap; the
 * client drops the rows it already has by their cursors.
 */
export const nextPollCursor = (rowCursors: string[], now: number): { nextCursor: string; hasMore: boolean } => {
  const watermark = pollWatermark(now);
  const last = rowCursors.length >= POLL_LIMIT ? parseEventCursor(rowCursors[rowCursors.length - 1]) : null;
  if (last && compareEventCursors(last, watermark) < 0) {
    return { nextCursor: formatEventCursor(last), hasMore: true };
  }
  return { nextCursor: formatEventCursor(watermark), hasMore: false };
};

/** Rows strictly older (`<`) or newer (`>`) than the cursor, in {@link EVENT_ORDER}. */
const cursorCondition = (direction: "<" | ">", name: string) => {
  // The whole-second bound is implied by the tuple comparison; it is there so
  // the primary key can skip granules.
  const secondBound = `toDateTime(intDiv({${name}Ms:Int64}, 1000), 'UTC')`;
  return `AND timestamp ${direction}= ${secondBound}
          AND (timestamp_ms, ${EVENT_TIEBREAK}) ${direction} (fromUnixTimestamp64Milli({${name}Ms:Int64}, 'UTC'), {${name}Tiebreak:String})`;
};

const EVENT_COLUMNS = `
  timestamp,
  event_name,
  toString(props) as properties,
  session_id,
  user_id,
  identified_user_id,
  pathname,
  querystring,
  hostname,
  page_title,
  referrer,
  browser,
  browser_version,
  operating_system,
  operating_system_version,
  language,
  country,
  region,
  city,
  lat,
  lon,
  screen_width,
  screen_height,
  device_type,
  type
`;

// Everything a visitor does, which leaves out only the web-vitals rows. Errors
// belong here: the log has always offered an Error type to filter by.
const EVENT_TYPE_FILTER = `AND type IN ('custom_event', 'pageview', 'outbound', 'button_click', 'copy', 'form_submit', 'input_change', 'error')`;

/** Why a request's cursor params can't be used, or null. */
export const eventsCursorError = (query: GetEventsRequest["Querystring"]): string | null => {
  for (const name of ["since_cursor", "before_cursor"] as const) {
    const value = query[name];
    if (value !== undefined && value !== "" && !parseEventCursor(value)) {
      return `Invalid ${name}: pass a cursor from an earlier response`;
    }
  }
  return null;
};

/** `now` is when the request started; a cursor poll re-reads from {@link POLL_OVERLAP_MS} before it. */
export const buildEventsQuery = (
  query: GetEventsRequest["Querystring"],
  siteId: number,
  now = Date.now()
): QuerySpec => {
  const { since_timestamp, before_timestamp, page_size: pageSize = "50", filters } = query;
  const since = query.since_cursor ? parseEventCursor(query.since_cursor) : null;
  const before = query.before_cursor ? parseEventCursor(query.before_cursor) : null;

  const limit = parseInt(pageSize, 10);
  // Every mode honours the request's window, whichever way it is expressed
  // (dates, datetimes or past minutes); realtime requests send none.
  const timeStatement = getTimeStatement(query);
  // The event log filters individual rows; only channel remains session-attributed.
  const filterStatement = filters
    ? getFilterStatement(filters, siteId, timeStatement, { sessionLevelParams: ["channel"] })
    : "";

  const params: Record<string, string | number> = { siteId };
  let cursorStatement = "";

  if (since) {
    // Never start later than the watermark: events received before the cursor
    // may still be on their way in.
    const watermark = pollWatermark(now);
    const from = compareEventCursors(since, watermark) < 0 ? since : watermark;
    cursorStatement = cursorCondition(">", "since");
    params.sinceMs = from.ms;
    params.sinceTiebreak = from.tiebreak;
  } else if (since_timestamp) {
    cursorStatement = `AND timestamp > toDateTime64({sinceTimestamp:String}, 3, 'UTC')`;
    params.sinceTimestamp = since_timestamp;
  } else if (before) {
    cursorStatement = cursorCondition("<", "before");
    params.beforeMs = before.ms;
    params.beforeTiebreak = before.tiebreak;
  } else if (before_timestamp) {
    // The API renders timestamps in UTC and the client echoes them back;
    // parse in UTC too, not in the server timezone.
    cursorStatement = `AND timestamp < toDateTime64({beforeTimestamp:String}, 3, 'UTC')`;
    params.beforeTimestamp = before_timestamp;
  }

  // Mode A, polling for events newer than a cursor (realtime), reads the
  // oldest POLL_LIMIT after it, so a larger backlog is read over several polls
  // rather than skipped. Polling by timestamp, kept for API callers, still
  // returns the newest 500. Mode B, the initial load or scrolling back, returns
  // one page, newest first.
  let order = EVENT_ORDER;
  if (since) {
    order = EVENT_ORDER_ASC;
    params.limit = POLL_LIMIT;
  } else if (since_timestamp) {
    params.limit = 500;
  } else {
    params.limit = Number(limit);
  }

  return {
    query: `
      SELECT ${EVENT_COLUMNS}, ${EVENT_CURSOR}
      FROM events
      WHERE
        site_id = {siteId:Int32}
        ${EVENT_TYPE_FILTER}
        ${timeStatement}
        ${cursorStatement}
        ${filterStatement}
      ORDER BY ${order}
      LIMIT {limit:Int32}
    `,
    params,
  };
};

export const getEvents = analyticsRoute<GetEventsRequest>(
  "events",
  async (req: FastifyRequest<GetEventsRequest>, res: FastifyReply) => {
    const { siteId } = req.params;
    const { since_cursor, since_timestamp, page_size: pageSize = "50" } = req.query;

    const cursorError = eventsCursorError(req.query);
    if (cursorError) {
      return res.status(400).send({ error: cursorError });
    }

    // Taken before the query runs: whatever was received before the watermark
    // is in ClickHouse by the time the query reads it.
    const now = Date.now();
    const rows = await runAnalyticsQuery<GetEventsResponse[number]>(buildEventsQuery(req.query, Number(siteId), now));

    // Mode A: Poll for new events since a cursor (Realtime polling)
    if (since_cursor) {
      const { nextCursor, hasMore } = nextPollCursor(
        rows.map(row => row.event_cursor),
        now
      );
      // Read oldest first; sent newest first, like every other mode.
      const data = await enrichWithTraits(rows.reverse(), Number(siteId));
      return res.send({ data, cursor: { nextCursor, hasMore } });
    }

    const eventsWithTraits = await enrichWithTraits(rows, Number(siteId));
    if (since_timestamp) {
      return res.send({ data: eventsWithTraits });
    }

    // Mode B: Cursor-based pagination (initial load or scrolling back)
    const limit = parseInt(pageSize, 10);
    return res.send({
      data: eventsWithTraits,
      cursor: {
        hasMore: rows.length === limit,
        oldestTimestamp: rows.length > 0 ? rows[rows.length - 1].timestamp : null,
        oldestCursor: rows[rows.length - 1]?.event_cursor ?? null,
        newestCursor: rows[0]?.event_cursor ?? null,
      },
    });
  }
);
