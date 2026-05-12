"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";

import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SiteResponse } from "@/api/admin/endpoints";
import { cn } from "@/lib/utils";

interface EmbedTabProps {
  siteMetadata: SiteResponse;
  embedEnabled: boolean;
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

export function EmbedTab({ siteMetadata, embedEnabled }: EmbedTabProps) {
  const t = useExtracted();
  const timeWindows = useTimeWindows();
  const variants = useVariants();
  const themes = useThemes();

  const [variant, setVariant] = useState<"card" | "inline">("card");
  const [minutes, setMinutes] = useState(30);
  const [showChart, setShowChart] = useState(true);
  const [showCountries, setShowCountries] = useState(true);
  const [width, setWidth] = useState(360);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT);
  const [outputTab, setOutputTab] = useState<"preview" | "code">("preview");

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

  const cardHeight = 134 + (showChart ? 94 : 0) + (showCountries ? 162 : 0);
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

  return (
    <div className="space-y-6">

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              { key: "preview", label: t("Preview") },
              { key: "code", label: t("Embed Code") },
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setOutputTab(tab.key)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors",
                outputTab === tab.key
                  ? "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {outputTab === "preview" ? (
          <div
            className={`rounded-md border border-neutral-200 dark:border-neutral-800 p-4 flex ${variant === "card" ? "justify-center" : "items-center justify-center"
              }`}
            style={{ background: "#f5f5f5" }}
          >
            {embedEnabled ? (
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
                {t("Enable the embed widget to preview")}
              </div>
            )}
          </div>
        ) : (
          <CodeSnippet language="HTML" code={iframeCode} />
        )}
      </div>

      <fieldset
        disabled={!embedEnabled}
        className={`space-y-6 transition-opacity ${!embedEnabled ? "opacity-50 pointer-events-none select-none" : ""}`}
        aria-disabled={!embedEnabled}
      >
        <div className="space-y-3">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Variant")}</h5>
          <div className="flex flex-wrap gap-2">
            {variants.map(v => (
              <Button
                key={v.value}
                type="button"
                size="sm"
                variant={variant === v.value ? "default" : "outline"}
                onClick={() => setVariant(v.value)}
              >
                {v.label}
              </Button>
            ))}
          </div>
        </div>

        {variant === "card" && (
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("Time Window")}</h5>
            <div className="flex flex-wrap gap-2">
              {timeWindows.map(w => (
                <Button
                  key={w.minutes}
                  type="button"
                  size="sm"
                  variant={minutes === w.minutes ? "default" : "outline"}
                  onClick={() => setMinutes(w.minutes)}
                >
                  {w.label}
                </Button>
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
                <Button
                  key={th.value}
                  type="button"
                  size="sm"
                  variant={theme === th.value ? "default" : "outline"}
                  onClick={() => setTheme(th.value)}
                >
                  {th.label}
                </Button>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAccent(DEFAULT_ACCENT)}
                disabled={accent.toLowerCase() === DEFAULT_ACCENT}
              >
                {t("Reset")}
              </Button>
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
              <Input
                id="embed-width"
                type="number"
                min={240}
                max={800}
                value={width}
                onChange={e => setWidth(Math.max(240, Math.min(800, parseInt(e.target.value) || 360)))}
                className="w-24"
              />
            </div>
          </div>
        )}


      </fieldset>
    </div>
  );
}
