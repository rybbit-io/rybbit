"use client";

import { Copy, Download, FileArchive, FileText, Loader2, Share } from "lucide-react";
import { useExtracted } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import {
  useGeneratePrivateLinkKey,
  useGetPrivateLinkConfig,
  useRevokePrivateLinkKey,
} from "../../../../api/admin/hooks/usePrivateLink";
import { Button } from "../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { Input } from "../../../../components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { authClient } from "../../../../lib/auth";
import { getTimezone, useStore } from "../../../../lib/store";
import { useStripeSubscription } from "../../../../lib/subscription/useStripeSubscription";
import { exportCsv, exportPdf } from "./Export";

export function ShareExportButton() {
  const t = useExtracted();
  const session = authClient.useSession();
  const params = useParams();
  const siteId = Number(params.site);
  const canShare = !!session.data;

  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { site, time, filters } = useStore();
  const { data: subscription } = useStripeSubscription();

  const { data: privateLink, isLoading: isLoadingPrivateLink } = useGetPrivateLinkConfig(canShare ? siteId : 0);
  const { mutate: generatePrivateLinkKey, isPending: isGeneratingPrivateLink } = useGeneratePrivateLinkKey();
  const { mutate: revokePrivateLinkKey } = useRevokePrivateLinkKey();

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
  const canExportPdf =
    subscription?.planName !== "free" && !["appsumo-1", "appsumo-2"].includes(subscription?.planName ?? "");

  return (
    <div className={canShare ? undefined : "hidden md:block"}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : canShare ? (
                  <Share className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{canShare ? t("Share or export data") : t("Export data")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="max-w-[400px]">
          {canShare && (
            <>
              <div className="flex flex-col p-2">
                <span className="text-sm font-medium pb-2">{t("Share this dashboard")}</span>
                {!isLoadingPrivateLink && !privateLink?.privateLinkKey && (
                  <Button onClick={() => generatePrivateLinkKey(siteId)} disabled={isGeneratingPrivateLink}>
                    {isGeneratingPrivateLink ? t("Generating...") : t("Generate Private Link")}
                  </Button>
                )}
                {privateLink?.privateLinkKey && (
                  <>
                    <div className="flex items-center">
                      <Input
                        value={`${globalThis.location.protocol}//${globalThis.location.host}/${siteId}/${privateLink?.privateLinkKey}`}
                        readOnly
                        className="rounded-r-none bg-white dark:bg-neutral-900"
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          const fullUrl = `${globalThis.location.protocol}//${globalThis.location.host}/${siteId}/${privateLink?.privateLinkKey}`;
                          navigator.clipboard.writeText(fullUrl);
                          toast.success(t("Copied to clipboard"));
                        }}
                        className="w-10 rounded-l-none"
                      >
                        <Copy />
                      </Button>
                    </div>
                    <div
                      className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-400"
                      onClick={() => {
                        revokePrivateLinkKey(siteId);
                        toast.success(t("Private link revoked"));
                      }}
                    >
                      {t("Revoke this link")}
                    </div>
                  </>
                )}
                <span className="text-xs text-neutral-600 dark:text-neutral-300 mt-2">
                  {t("Generate a private link to share a read-only view of this dashboard with your team.")}
                </span>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          {canExportPdf && (
            <DropdownMenuItem onClick={handleExportPdf} disabled={isExportingPdf}>
              <FileText className="h-4 w-4 mr-2" />
              {isExportingPdf ? t("Generating PDF...") : t("Export as PDF Report")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleExportCsv} disabled={isExportingCsv}>
            <FileArchive className="h-4 w-4 mr-2" />
            {isExportingCsv ? t("Exporting...") : t("Export as CSV (ZIP)")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
