"use client";

import { ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { SiteResponse } from "@/api/admin/endpoints";
import { useGeneratePrivateLinkKey, useGetPrivateLinkConfig } from "@/api/admin/hooks/usePrivateLink";
import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { SettingRow, SettingsSection, SettingsSections } from "./SettingsSection";

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
    <SettingsSections className="min-w-0 overflow-x-hidden">
      <SettingsSection description={t("Embed the main analytics dashboard on another site using a private link.")}>
        <fieldset
          disabled={disabled}
          className={cn("space-y-4 transition-opacity", disabled && "opacity-50 pointer-events-none select-none")}
          aria-disabled={disabled}
        >
          <SettingRow
            label={t("Private link")}
            description={t(
              "Dashboard embeds require a private link. Anyone with the iframe URL can view the read-only dashboard."
            )}
          >
            {hasPrivateLink ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-150 bg-neutral-50 px-2 py-1 text-xs text-muted-foreground dark:border-neutral-800 dark:bg-neutral-900">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                {t("Private link enabled")}
              </span>
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
              <span className="inline-flex items-center rounded-md border border-neutral-150 bg-neutral-50 px-2 py-1 text-xs text-muted-foreground dark:border-neutral-800 dark:bg-neutral-900">
                {t("Loading...")}
              </span>
            )}
          </SettingRow>

          <SettingRow label={t("Theme")} description={t("Choose how the embedded dashboard is displayed.")}>
            {themes.map(theme => (
              <Button
                key={theme.value}
                type="button"
                size="sm"
                variant={dashboardTheme === theme.value ? "success" : "outline"}
                onClick={() => setDashboardTheme(theme.value)}
              >
                {theme.label}
              </Button>
            ))}
          </SettingRow>

          <SettingRow
            label={t("Hide sidebar")}
            htmlFor="dashboard-hide-sidebar"
            description={t("Only the main dashboard page can be viewed from this embed.")}
          >
            <Switch
              id="dashboard-hide-sidebar"
              checked={hideDashboardSidebar}
              onCheckedChange={setHideDashboardSidebar}
            />
          </SettingRow>
        </fieldset>
      </SettingsSection>

      <SettingsSection title={t("Try It Out")} description={dashboardTryMessage}>
        <div className={cn("flex min-w-0 items-center gap-2", !dashboardEmbedAvailable && "opacity-50")}>
          <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-neutral-150 bg-neutral-50 px-2 py-1.5 font-mono text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            {dashboardUrlString}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!dashboardEmbedAvailable}
            onClick={() => window.open(dashboardUrlString, "_blank", "noopener,noreferrer")}
            className="shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("Open")}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title={t("Preview")}>
        <div className="rounded-lg border border-neutral-150 bg-neutral-100 p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
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
            <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-muted-foreground dark:border-neutral-700">
              {t("Generate a private link to preview")}
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title={t("Embed Code")}>
        <CodeSnippet language="HTML" code={dashboardIframeCode} />
      </SettingsSection>
    </SettingsSections>
  );
}
