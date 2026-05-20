"use client";

import { ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { SiteResponse } from "@/api/admin/endpoints";
import { useGeneratePrivateLinkKey, useGetPrivateLinkConfig } from "@/api/admin/hooks/usePrivateLink";
import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";

interface DashboardEmbedTabProps {
  siteMetadata: SiteResponse;
  disabled?: boolean;
}

const DASHBOARD_PREVIEW_WIDTH = 1000;
const DASHBOARD_PREVIEW_HEIGHT = 1000;
const DASHBOARD_PREVIEW_SCALE = 0.7;

type DashboardEmbedTheme = "light" | "dark" | "system";

function useDashboardEmbedThemes() {
  const t = useExtracted();

  return [
    { value: "light" as const, label: t("Light") },
    { value: "dark" as const, label: t("Dark") },
    { value: "system" as const, label: t("System") },
  ];
}

export function DashboardEmbedTab({ siteMetadata, disabled = false }: DashboardEmbedTabProps) {
  const t = useExtracted();
  const themes = useDashboardEmbedThemes();
  const [hideDashboardSidebar, setHideDashboardSidebar] = useState(true);
  const [dashboardTheme, setDashboardTheme] = useState<DashboardEmbedTheme>("system");

  const siteId = siteMetadata.siteId;
  const { data: privateLink, isLoading: isLoadingPrivateLink } = useGetPrivateLinkConfig(siteId);
  const {
    data: generatedPrivateLink,
    mutate: generatePrivateLinkKey,
    isPending: isGeneratingPrivateLink,
  } = useGeneratePrivateLinkKey();
  const privateLinkKey = privateLink?.privateLinkKey ?? generatedPrivateLink?.privateLinkKey ?? null;
  const hasPrivateLink = !!privateLinkKey;
  const dashboardEmbedAvailable = hasPrivateLink;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.rybbit.io";
  const dashboardPath = `/${siteId}/${privateLinkKey ?? "PRIVATE_LINK_KEY"}/main`;

  const dashboardUrl = new URL(dashboardPath, origin);
  dashboardUrl.searchParams.set("embed", "true");
  dashboardUrl.searchParams.set("theme", dashboardTheme);
  if (hideDashboardSidebar) {
    dashboardUrl.searchParams.set("hideSidebar", "true");
  }
  const dashboardUrlString = dashboardUrl.toString();

  const dashboardPreviewWidth = DASHBOARD_PREVIEW_WIDTH * DASHBOARD_PREVIEW_SCALE;
  const dashboardPreviewHeight = DASHBOARD_PREVIEW_HEIGHT * DASHBOARD_PREVIEW_SCALE;

  const dashboardIframeCode = `<iframe
  src="${dashboardUrlString}"
  style="border: 0; width: 100%; height: 720px;"
  loading="lazy"
  title="Analytics dashboard"
></iframe>`;

  const dashboardTryMessage = dashboardEmbedAvailable
    ? t("Open the private dashboard embed URL in a new tab.")
    : t("Generate a private link to try the dashboard embed.");

  const handleGeneratePrivateLink = () => {
    generatePrivateLinkKey(siteId, {
      onSuccess: () => {
        toast.success(t("Private link generated"));
      },
      onError: error => {
        toast.error(error instanceof Error ? error.message : t("Failed to generate private link"));
      },
    });
  };

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="min-w-0 space-y-4">
        <div>
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Dashboard Embed")}</h5>
          <p className="text-xs text-muted-foreground mt-1">
            {t("Embed the main analytics dashboard on another site using a private link.")}
          </p>
        </div>

        <fieldset
          disabled={disabled}
          className={`space-y-4 transition-opacity ${disabled ? "opacity-50 pointer-events-none select-none" : ""}`}
          aria-disabled={disabled}
        >
          <div className="flex min-w-0 flex-col gap-3">
            <div>
              <Label className="text-sm font-medium text-foreground">{t("Private link")}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t(
                  "Dashboard embeds require a private link. Anyone with the iframe URL can view the read-only dashboard."
                )}
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {hasPrivateLink ? (
                <div className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-muted-foreground dark:border-neutral-800 dark:bg-neutral-950">
                  {t("Private link enabled")}
                </div>
              ) : !isLoadingPrivateLink ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isGeneratingPrivateLink}
                  onClick={handleGeneratePrivateLink}
                >
                  {isGeneratingPrivateLink ? t("Generating...") : t("Generate Private Link")}
                </Button>
              ) : (
                <div className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-muted-foreground dark:border-neutral-800 dark:bg-neutral-950">
                  {t("Loading...")}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="text-sm font-medium text-foreground">{t("Theme")}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("Choose how the embedded dashboard is displayed.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {themes.map(theme => (
                <Button
                  key={theme.value}
                  type="button"
                  size="sm"
                  variant={dashboardTheme === theme.value ? "default" : "outline"}
                  onClick={() => setDashboardTheme(theme.value)}
                >
                  {theme.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="dashboard-hide-sidebar" className="text-sm font-medium text-foreground">
                {t("Hide sidebar")}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("Only the main dashboard page can be viewed from this embed.")}
              </p>
            </div>
            <Switch
              id="dashboard-hide-sidebar"
              checked={hideDashboardSidebar}
              onCheckedChange={setHideDashboardSidebar}
            />
          </div>
        </fieldset>

        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Try It Out")}</h5>
          <div
            className={`rounded-md border border-neutral-200 dark:border-neutral-800 p-3 flex min-w-0 flex-col gap-3 transition-opacity ${
              !dashboardEmbedAvailable ? "opacity-50" : ""
            }`}
          >
            <div className="w-full min-w-0 flex-1 overflow-hidden">
              <p className="text-xs text-muted-foreground">{dashboardTryMessage}</p>
              <div className="mt-2 max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 font-mono text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
                {dashboardUrlString}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!dashboardEmbedAvailable}
              onClick={() => window.open(dashboardUrlString, "_blank", "noopener,noreferrer")}
              className="shrink-0 self-start"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("Open")}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Preview")}</h5>
          <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-2 bg-neutral-100 dark:bg-neutral-950">
            {dashboardEmbedAvailable ? (
              <div
                className="mx-auto overflow-hidden rounded-sm bg-white dark:bg-neutral-950"
                style={{
                  width: dashboardPreviewWidth,
                  maxWidth: "100%",
                  height: dashboardPreviewHeight,
                }}
              >
                <iframe
                  key={dashboardUrlString}
                  src={dashboardUrlString}
                  width={DASHBOARD_PREVIEW_WIDTH}
                  height={DASHBOARD_PREVIEW_HEIGHT}
                  style={{
                    border: 0,
                    width: DASHBOARD_PREVIEW_WIDTH,
                    height: DASHBOARD_PREVIEW_HEIGHT,
                    transform: `scale(${DASHBOARD_PREVIEW_SCALE})`,
                    transformOrigin: "top left",
                  }}
                  title="Dashboard preview"
                />
              </div>
            ) : (
              <div className="h-[220px] rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-xs text-muted-foreground">
                {t("Generate a private link to preview")}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Embed Code")}</h5>
          <CodeSnippet language="HTML" code={dashboardIframeCode} />
        </div>
      </section>
    </div>
  );
}
