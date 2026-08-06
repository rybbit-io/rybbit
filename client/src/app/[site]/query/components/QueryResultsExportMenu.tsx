"use client";

import { Braces, Download, FileText } from "lucide-react";
import { useExtracted } from "next-intl";
import type { CustomQueryRow } from "../../../../api/analytics/endpoints";
import { Button } from "../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { downloadCSV, downloadJSON, formatDateForFilename } from "../../../../lib/export";
import { cn } from "../../../../lib/utils";

type QueryResultsExportMenuProps = {
  rows: CustomQueryRow[];
  columns: string[];
  filenameBase: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

function sanitizeFilename(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "query-results"
  );
}

export function QueryResultsExportMenu({
  rows,
  columns,
  filenameBase,
  disabled,
  compact = false,
  className,
}: QueryResultsExportMenuProps) {
  const t = useExtracted();
  const canExport = !disabled && rows.length > 0;
  const filename = `${sanitizeFilename(filenameBase)}-${formatDateForFilename()}`;

  const handleExportCsv = () => {
    if (!canExport) return;
    downloadCSV(`${filename}.csv`, rows, columns);
  };

  const handleExportJson = () => {
    if (!canExport) return;
    downloadJSON(`${filename}.json`, rows);
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="smIcon"
              disabled={!canExport}
              aria-label={t("Download results")}
              className={cn(compact && "h-6 w-6", className)}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("Download results")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={handleExportCsv} disabled={!canExport}>
          <FileText className="h-4 w-4" />
          {t("CSV")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJson} disabled={!canExport}>
          <Braces className="h-4 w-4" />
          {t("JSON")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
