import { Filter } from "@rybbit/shared";
import { DateTime } from "luxon";
import { exportPdfReport } from "../../../../../api/analytics/endpoints";
import { getStartAndEndDate } from "../../../../../api/utils";
import { Time } from "../../../../../components/DateSelector/types";

interface ExportPdfParams {
  site: string;
  time: Time;
  filters: Filter[];
  timeZone: string;
}

// The PDF report is a whole-day summary and its server contract requires a
// concrete YYYY-MM-DD range. Map every time mode (including past-minutes,
// all-time, and exact datetime ranges) to whole days so the export never sends
// empty dates, which would otherwise produce an all-time report or a 400.
export function getPdfDateRange(time: Time, timeZone: string): { startDate: string; endDate: string } {
  const today = DateTime.now().setZone(timeZone);

  if (time.mode === "past-minutes") {
    return {
      startDate: today.minus({ minutes: time.pastMinutesStart }).toISODate() ?? "",
      endDate: today.toISODate() ?? "",
    };
  }
  if (time.mode === "all-time") {
    // No stored site-creation date on the client; use a wide lower bound.
    return { startDate: "2020-01-01", endDate: today.toISODate() ?? "" };
  }
  if (time.mode === "range" && time.startTime && time.endTime) {
    return { startDate: time.startDate, endDate: time.endDate };
  }

  const { startDate, endDate } = getStartAndEndDate(time);
  return {
    startDate: startDate ?? today.toISODate() ?? "",
    endDate: endDate ?? today.toISODate() ?? "",
  };
}

export async function exportPdf({ site, time, filters, timeZone }: ExportPdfParams): Promise<void> {
  const { startDate, endDate } = getPdfDateRange(time, timeZone);

  await exportPdfReport(site, {
    startDate,
    endDate,
    timeZone,
    filters,
  });
}
