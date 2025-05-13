import { Time } from "../../components/DateSelector/types";
import { getStartAndEndDate } from "../utils";

/**
 * Generates URL query parameters for time filtering
 * @param time Time object from store
 * @returns URL query string with time parameters
 */
export function getQueryTimeParams(time: Time): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const params = new URLSearchParams();

  // Handle last-24-hours mode differently
  if (time.mode === "last-24-hours") {
    // Use minutes parameter instead of date range
    params.append("minutes", "1440"); // 24 hours * 60 minutes
    params.append("timezone", timezone);
    return params.toString();
  }

  // Regular date-based approach for other modes
  const { startDate, endDate } = getStartAndEndDate(time);

  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  params.append("timezone", timezone);

  return params.toString();
}
