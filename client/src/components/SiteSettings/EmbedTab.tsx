"use client";

import { useExtracted } from "next-intl";
import { useCallback, useState } from "react";

import { CodeSnippet } from "@/components/CodeSnippet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { SiteResponse, updateSiteConfig } from "@/api/admin/endpoints";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";

interface EmbedTabProps {
  siteMetadata: SiteResponse;
}

const DEFAULT_ACCENT = "#10b981";

function useTimeWindows() {
  const t = useExtracted();
  return [
    { label: t("Last 30 minutes"), minutes: 30 },
    { label: t("Last 24 hours"), minutes: 1440 },
    { label: t("Last 7 days"), minutes: 10080 },
  ];
}

function useVariants() {
  const t = useExtracted();
  return [
    { value: "card" as const, label: t("Card") },
    { value: "inline" as const, label: t("Inline pill") },
  ];
}

function useThemes() {
  const t = useExtracted();
  return [
    { value: "dark" as const, label: t("Dark") },
    { value: "light" as const, label: t("Light") },
  ];
}

export function EmbedTab({ siteMetadata }: EmbedTabProps) {
  const t = useExtracted();
  const timeWindows = useTimeWindows();
  const variants = useVariants();
  const themes = useThemes();
  const { refetch } = useGetSitesFromOrg(siteMetadata?.organizationId ?? "");

  const [variant, setVariant] = useState<"card" | "inline">("card");
  const [minutes, setMinutes] = useState(30);
  const [showChart, setShowChart] = useState(true);
  const [showCountries, setShowCountries] = useState(true);
  const [width, setWidth] = useState(360);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT);
  const [isPublic, setIsPublic] = useState(!!siteMetadata.public);
  const [togglingPublic, setTogglingPublic] = useState(false);

  const siteId = siteMetadata.siteId;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const widgetUrl = new URL(`${origin}/widget/${siteId}`);
  widgetUrl.searchParams.set("variant", variant);
  widgetUrl.searchParams.set("theme", theme);
  const accentHex = accent.replace(/^#/, "");
  if (accentHex.toLowerCase() !== DEFAULT_ACCENT.slice(1)) {
    widgetUrl.searchParams.set("accent", accentHex);
  }
  if (variant === "card") {
    widgetUrl.searchParams.set("minutes", String(minutes));
    widgetUrl.searchParams.set("chart", String(showChart));
    widgetUrl.searchParams.set("countries", String(showCountries));
  }

  const cardHeight = 130 + (showChart ? 130 : 0) + (showCountries ? 60 + 28 * 5 : 0);
  const inlineHeight = 36;
  const inlineWidth = 220;
  const height = variant === "card" ? cardHeight : inlineHeight;
  const iframeWidth = variant === "card" ? width : inlineWidth;

  const iframeCode =
    variant === "card"
      ? `<iframe
  src="${widgetUrl.toString()}"
  style="border: 0; width: ${iframeWidth}px; height: ${height}px; max-width: 100%;"
  loading="lazy"
  title="Live visitors"
></iframe>`
      : `<iframe
  src="${widgetUrl.toString()}"
  style="border: 0; width: ${iframeWidth}px; height: ${height}px;"
  loading="lazy"
  title="Live visitors"
  scrolling="no"
></iframe>`;

  const handleTogglePublic = useCallback(
    async (checked: boolean) => {
      setTogglingPublic(true);
      try {
        await updateSiteConfig(siteMetadata.siteId, { public: checked });
        setIsPublic(checked);
        toast.success(checked ? t("Site analytics made public") : t("Site analytics made private"));
        refetch();
      } catch (error) {
        console.error("Error toggling public:", error);
        toast.error(t("Failed to update public setting"));
      } finally {
        setTogglingPublic(false);
      }
    },
    [siteMetadata.siteId, refetch, t]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">{t("Embed Widget")}</h4>
        <p className="text-xs text-muted-foreground">
          {t("Show a live visitor count on your site. Data refreshes every minute and is cached server-side.")}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-800 px-4 py-3 bg-neutral-50 dark:bg-neutral-900/40">
        <div>
          <Label htmlFor="embed-public" className="text-sm font-medium text-foreground">
            {t("Public Analytics")}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            {isPublic
              ? t("Your site is public. The widget below can be embedded on any site.")
              : t("Embedding requires public analytics. Enable to share live stats publicly.")}
          </p>
        </div>
        <Switch
          id="embed-public"
          checked={isPublic}
          disabled={togglingPublic}
          onCheckedChange={handleTogglePublic}
        />
      </div>

      <fieldset
        disabled={!isPublic}
        className={`space-y-6 transition-opacity ${!isPublic ? "opacity-50 pointer-events-none select-none" : ""}`}
        aria-disabled={!isPublic}
      >
        <div className="space-y-3">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Variant")}</h5>
          <div className="flex flex-wrap gap-2">
            {variants.map(v => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVariant(v.value)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  variant === v.value
                    ? "bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-foreground"
                    : "bg-transparent border-neutral-200 dark:border-neutral-800 text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {variant === "card" && (
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Time Window")}</h5>
            <div className="flex flex-wrap gap-2">
              {timeWindows.map(w => (
                <button
                  key={w.minutes}
                  type="button"
                  onClick={() => setMinutes(w.minutes)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    minutes === w.minutes
                      ? "bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-foreground"
                      : "bg-transparent border-neutral-200 dark:border-neutral-800 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Appearance")}</h5>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-foreground">{t("Theme")}</Label>
              <p className="text-xs text-muted-foreground mt-1">{t("Match the widget to your site's theme.")}</p>
            </div>
            <div className="flex gap-2">
              {themes.map(th => (
                <button
                  key={th.value}
                  type="button"
                  onClick={() => setTheme(th.value)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    theme === th.value
                      ? "bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-foreground"
                      : "bg-transparent border-neutral-200 dark:border-neutral-800 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {th.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="embed-accent" className="text-sm font-medium text-foreground">
                {t("Accent color")}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">{t("Color used for the pulse dot and bars.")}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="embed-accent"
                type="color"
                value={accent}
                onChange={e => setAccent(e.target.value)}
                className="h-8 w-10 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setAccent(DEFAULT_ACCENT)}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                {t("Reset")}
              </button>
            </div>
          </div>
        </div>

        {variant === "card" && (
          <div className="space-y-4">
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Options")}</h5>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="embed-chart" className="text-sm font-medium text-foreground">
                  {t("Show bar chart")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("Display a bar chart of users over the selected time window.")}
                </p>
              </div>
              <Switch id="embed-chart" checked={showChart} onCheckedChange={setShowChart} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="embed-countries" className="text-sm font-medium text-foreground">
                  {t("Show top countries")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("Display the top 5 countries visiting your site.")}
                </p>
              </div>
              <Switch id="embed-countries" checked={showCountries} onCheckedChange={setShowCountries} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="embed-width" className="text-sm font-medium text-foreground">
                  {t("Width (px)")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("Iframe width. Use max-width: 100% for responsive layouts.")}
                </p>
              </div>
              <input
                id="embed-width"
                type="number"
                min={240}
                max={800}
                value={width}
                onChange={e => setWidth(Math.max(240, Math.min(800, parseInt(e.target.value) || 360)))}
                className="w-20 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm text-foreground"
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Preview")}</h5>
          <div
            className={`rounded-md border border-neutral-200 dark:border-neutral-800 p-4 flex ${
              variant === "card" ? "justify-center" : "items-center justify-center"
            }`}
            style={{ background: theme === "dark" ? "#0a0a0a" : "#f5f5f5" }}
          >
            {isPublic ? (
              <iframe
                key={widgetUrl.toString()}
                src={widgetUrl.toString()}
                style={{
                  border: 0,
                  width: iframeWidth,
                  height,
                  maxWidth: "100%",
                  background: "transparent",
                }}
                title="Widget preview"
              />
            ) : (
              <div
                style={{ width: iframeWidth, height, maxWidth: "100%" }}
                className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-xs text-muted-foreground"
              >
                {t("Enable Public Analytics to preview")}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Embed Code")}</h5>
          <CodeSnippet language="HTML" code={iframeCode} />
        </div>
      </fieldset>
    </div>
  );
}
