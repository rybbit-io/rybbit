"use client";

import { Download, FileArchive, FileText, Loader2, Share } from "lucide-react";
import { useExtracted } from "next-intl";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { CopyButton } from "@/components/interior/copy-button";
import { toast } from "@/components/ui/sonner";
import {
  useGeneratePrivateLinkKey,
  useGetPrivateLinkConfig,
  useRevokePrivateLinkKey,
} from "../../../../api/admin/hooks/usePrivateLink";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog";
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
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const shareTriggerRef = useRef<HTMLButtonElement>(null);
  const { site, time, filters } = useStore();
  const { data: subscription } = useStripeSubscription();

  const { data: privateLink, isLoading: isLoadingPrivateLink } = useGetPrivateLinkConfig(canShare ? siteId : 0);
  const { mutate: generatePrivateLinkKey, isPending: isGeneratingPrivateLink } = useGeneratePrivateLinkKey();
  const { mutateAsync: revokePrivateLinkKey, isPending: isRevokingPrivateLink } = useRevokePrivateLinkKey();

  const privateLinkUrl = privateLink?.privateLinkKey
    ? `${globalThis.location.protocol}//${globalThis.location.host}/${siteId}/${privateLink.privateLinkKey}`
    : "";

  const handleRevokePrivateLink = async () => {
    try {
      await revokePrivateLinkKey(siteId);
      toast.success(t("Private link revoked"));
      setConfirmRevoke(false);
    } catch (error) {
      console.error("Failed to revoke private link:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to revoke the private link"));
    }
  };

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
              <Button ref={shareTriggerRef} variant="secondary" size="icon" className="h-8 w-8">
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
                {privateLinkUrl && (
                  <>
                    <div className="flex items-center">
                      <Input value={privateLinkUrl} readOnly className="rounded-r-none bg-white dark:bg-neutral-900" />
                      <CopyButton
                        iconOnly
                        variant="default"
                        value={privateLinkUrl}
                        label={t("Copy link")}
                        className="w-10 rounded-l-none"
                        onError={() => toast.error(t("Couldn't copy the link. Select it and copy it manually."))}
                      />
                    </div>
                    {/* Opens the confirmation outside the menu, which closes as focus moves to it. */}
                    <Button
                      variant="link"
                      size="xs"
                      className="mt-1 h-auto self-start px-0 font-normal text-neutral-500 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-400"
                      onClick={() => setConfirmRevoke(true)}
                    >
                      {t("Revoke this link")}
                    </Button>
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

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent
          onCloseAutoFocus={event => {
            // The menu that held "Revoke this link" is gone; return focus to the share button.
            event.preventDefault();
            shareTriggerRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Revoke this private link?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Anyone with the link loses access to this dashboard right away. You can generate a new link afterwards."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevokingPrivateLink}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRevokingPrivateLink}
              onClick={event => {
                event.preventDefault();
                void handleRevokePrivateLink();
              }}
            >
              {isRevokingPrivateLink ? t("Revoking...") : t("Revoke link")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
