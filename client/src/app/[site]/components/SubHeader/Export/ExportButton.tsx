"use client";

import { Download, FileArchive, FileText, Loader2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Button } from "../../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { getTimezone, useStore } from "../../../../../lib/store";
import { exportCsv } from "./exportCsv";
import { exportPdf } from "./exportPdf";
import { useStripeSubscription } from "../../../../../lib/subscription/useStripeSubscription";

export function ExportButton() {
  const t = useExtracted();
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { site, time, filters } = useStore();
  const { data: subscription } = useStripeSubscription();

  const handleExportPdf = async () => {
    if (!site) {
      toast.error(t("No site selected"));
      return;
    }

    setIsExportingPdf(true);

    try {
      await exportPdf({ site, time, filters, timeZone: getTimezone() });
      toast.success(t("PDF report downloaded"));
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to generate PDF report"));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    if (!site) {
      toast.error(t("No site selected"));
      return;
    }

    setIsExportingCsv(true);

    try {
      const fileCount = await exportCsv({ site, time, filters, timeZone: getTimezone() });
      toast.success(t("Exported {fileCount} files", { fileCount: String(fileCount) }));
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(error instanceof Error ? error.message : t("Export failed. Please try again."));
    } finally {
      setIsExportingCsv(false);
    }
  };

  const isExporting = isExportingCsv || isExportingPdf;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" disabled={isExporting} className="h-8 w-8">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("Export data")}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {subscription?.planName !== "free" && !["appsumo-1", "appsumo-2"].includes(subscription?.planName ?? "") &&
          <DropdownMenuItem onClick={handleExportPdf} disabled={isExportingPdf}>
            <FileText className="h-4 w-4 mr-2" />
            {isExportingPdf ? t("Generating PDF...") : t("Export as PDF Report")}
          </DropdownMenuItem>
        }
        <DropdownMenuItem onClick={handleExportCsv} disabled={isExportingCsv}>
          <FileArchive className="h-4 w-4 mr-2" />
          {isExportingCsv ? t("Exporting...") : t("Export as CSV (ZIP)")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
