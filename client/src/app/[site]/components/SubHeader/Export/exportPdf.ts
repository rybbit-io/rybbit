import { Filter } from "@rybbit/shared";
import { exportPdfReport } from "../../../../../api/analytics/endpoints";
import { getStartAndEndDate } from "../../../../../api/utils";
import { Time } from "../../../../../components/DateSelector/types";

interface ExportPdfParams {
  site: string;
  time: Time;
  filters: Filter[];
  timeZone: string;
}

export async function exportPdf({ site, time, filters, timeZone }: ExportPdfParams): Promise<void> {
  const { startDate, endDate } = getStartAndEndDate(time);

  await exportPdfReport(site, {
    startDate: startDate ?? "",
    endDate: endDate ?? "",
    timeZone,
    filters,
  });
}
