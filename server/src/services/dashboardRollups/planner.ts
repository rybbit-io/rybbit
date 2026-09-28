import { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import SqlString from "sqlstring";
import { isValidTimeZone, resolveTimeWindow, TimeWindowParams } from "../../api/analytics/utils/timeWindow.js";

export type RollupSlice = {
  resolution: "hour" | "day" | "month";
  timeZone: string;
  start: number | null;
  end: number | null;
};

export function planSessionRollups(
  params: TimeWindowParams,
  timeZones: string[],
  bucket?: TimeBucket,
  now = Date.now()
): RollupSlice[] | null {
  if (params.start_datetime || params.end_datetime || !isValidTimeZone(params.time_zone || "UTC")) return null;
  const window = resolveTimeWindow(params, now);
  // HTTP validation normally rejects these. Never turn a malformed internal
  // request into an unbounded rollup read.
  if (
    window.isAllTime &&
    [params.start_date, params.end_date, params.past_minutes_start, params.past_minutes_end].some(v => v !== undefined)
  )
    return null;
  const requestedZone = params.time_zone || "UTC";
  const timeZone = timeZones.includes(requestedZone) ? requestedZone : "UTC";
  const days =
    timeZones.includes(timeZone) &&
    (!bucket || ["day", "week", "month", "year"].includes(bucket)) &&
    (!bucket || timeZone === requestedZone);
  const months = days && (!bucket || bucket === "month" || bucket === "year");
  const range = window.hourRange();
  if (!range)
    return [
      {
        resolution: months ? "month" : days ? "day" : "hour",
        timeZone: days ? timeZone : "UTC",
        start: null,
        end: null,
      },
    ];
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end < range.start) return null;
  const slices: RollupSlice[] = [];
  const append = (slice: RollupSlice) => {
    const previous = slices[slices.length - 1];
    if (
      previous?.resolution === slice.resolution &&
      previous.timeZone === slice.timeZone &&
      previous.end === slice.start
    )
      previous.end = slice.end;
    else slices.push(slice);
  };
  const ceilHour = (value: number) => Math.ceil(value / 3600) * 3600;
  for (let cursor = range.start; cursor < range.end; ) {
    const local = DateTime.fromSeconds(cursor, { zone: timeZone });
    let selected = false;
    for (const resolution of (months ? ["month", "day"] : days ? ["day"] : []) as ("month" | "day")[]) {
      const start = local.startOf(resolution);
      const end = start.plus(resolution === "month" ? { months: 1 } : { days: 1 });
      if (ceilHour(start.toSeconds()) === cursor && ceilHour(end.toSeconds()) <= range.end) {
        append({ resolution, timeZone, start: start.toSeconds(), end: end.toSeconds() });
        cursor = ceilHour(end.toSeconds());
        selected = true;
        break;
      }
    }
    if (!selected) {
      const end = days ? Math.min(range.end, ceilHour(local.startOf("day").plus({ days: 1 }).toSeconds())) : range.end;
      append({ resolution: "hour", timeZone: "UTC", start: cursor, end });
      cursor = end;
    }
  }
  return slices;
}

export function rollupPredicate(slices: RollupSlice[]): string {
  if (!slices.length) return "0";
  return slices
    .map(
      slice => `(
    resolution = ${SqlString.escape(slice.resolution)} AND time_zone = ${SqlString.escape(slice.timeZone)}
    ${slice.start === null ? "" : `AND bucket_start >= toDateTime(${slice.start}, 'UTC')`}
    ${slice.end === null ? "" : `AND bucket_start < toDateTime(${slice.end}, 'UTC')`}
  )`
    )
    .join(" OR ");
}
