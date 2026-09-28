import { Time } from "../components/DateSelector/types";
import { getAbsoluteBounds } from "./time";

export function defaultToRouteGroups(time: Time, zone: string): boolean {
  if (time.mode === "all-time" || time.mode === "month" || time.mode === "year") return true;
  if (time.mode === "past-minutes") return time.pastMinutesStart - time.pastMinutesEnd >= 30 * 24 * 60;
  const bounds = getAbsoluteBounds(time, zone);
  // Calendar days, not 24-hour durations: crossing DST must not change the tab.
  return bounds !== null && bounds.end.diff(bounds.start, "days").days >= 30;
}
