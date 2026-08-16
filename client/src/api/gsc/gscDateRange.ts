import { DateTime } from "luxon";
import { Time } from "../../components/DateSelector/types";
import { getStartAndEndDate } from "../utils";

// The GSC API only accepts whole-day date ranges and keeps ~16 months of
// history, so sub-day dashboard ranges are widened to whole days and
// all-time is clamped to Google's maximum lookback.
export function getGSCDateRange(time: Time, timeZone: string): { startDate: string; endDate: string } {
  const today = DateTime.now().setZone(timeZone);
  if (time.mode === "past-minutes") {
    return {
      startDate: today.minus({ minutes: time.pastMinutesStart }).toISODate() ?? "",
      endDate: today.toISODate() ?? "",
    };
  }
  if (time.mode === "all-time") {
    return {
      startDate: today.minus({ months: 16 }).toISODate() ?? "",
      endDate: today.toISODate() ?? "",
    };
  }
  const { startDate, endDate } = getStartAndEndDate(time, timeZone);
  return { startDate: startDate ?? "", endDate: endDate ?? "" };
}
