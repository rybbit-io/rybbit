import { EventTrendBucket } from "../../../../api/analytics/endpoints";
import { Time } from "../../../../components/DateSelector/types";
import { getAbsoluteBounds } from "../../../../lib/time";

const HOURS_PER_DAY = 24;

/**
 * The bucket a row's trend is drawn in. A sparkline is 84px wide, so it wants
 * a few dozen points whatever the period: hours up to two days, days up to two
 * months, weeks up to about a year, months beyond that and for all time.
 */
export function trendBucketFor(time: Time, zone: string): EventTrendBucket {
  const bounds = getAbsoluteBounds(time, zone);
  if (!bounds) return "month";

  const hours = bounds.end.diff(bounds.start, "hours").hours;
  if (hours <= 2 * HOURS_PER_DAY) return "hour";
  if (hours <= 62 * HOURS_PER_DAY) return "day";
  if (hours <= 400 * HOURS_PER_DAY) return "week";
  return "month";
}
