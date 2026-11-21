"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";

import { CodeSnippet } from "@/components/CodeSnippet";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SiteResponse } from "@/api/admin/endpoints";
import { cn } from "@/lib/utils";

import { SettingRow, SettingsSection, SettingsSections } from "./SettingsSection";

interface EmbedTabProps {
  siteMetadata: SiteResponse;
  embedEnabled: boolean;
}

const DEFAULT_ACCENT = "#10b981";
type OutputTab = "preview" | "code";

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
  const [widgetOutputTab, setWidgetOutputTab] = useState<OutputTab>("preview");

  const siteId = siteMetadata.id ?? String(siteMetadata.siteId);
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
    <SettingsSections>
      <SettingsSection
        title={t("Live Visitor Widget")}
        description={t("Embed a compact live visitor widget on another site.")}
        action={
          <SegmentedControl<OutputTab>
            aria-label={t("Live Visitor Widget")}
            size="sm"
            options={[
              { value: "preview", label: t("Preview") },
              { value: "code", label: t("Embed Code") },
            ]}
            value={widgetOutputTab}
            onValueChange={setWidgetOutputTab}
          />
        }
      >
        {widgetOutputTab === "preview" ? (
          <div
            className={cn(
              "flex justify-center rounded-lg border p-4",
              variant === "inline" && "items-center",
              embedEnabled
                ? theme === "dark"
                  ? "border-neutral-800 bg-neutral-950"
                  : "border-neutral-200 bg-neutral-100"
                : "border-neutral-200 bg-neutral-50 dark:border-neutral-850 dark:bg-neutral-900/50"
            )}
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
                className="flex items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-muted-foreground dark:border-neutral-700"
              >
                {t("Enable the embed widget to preview")}
              </div>
            )}
          </div>
        ) : (
          <CodeSnippet language="HTML" code={iframeCode} />
        )}
      </SettingsSection>

      <fieldset
        disabled={!embedEnabled}
        className={cn(
          "divide-y divide-neutral-150 pt-5 transition-opacity dark:divide-neutral-850",
          !embedEnabled && "opacity-50 pointer-events-none select-none"
        )}
        aria-disabled={!embedEnabled}
      >
        <SettingsSection title={t("Appearance")}>
          <SettingRow label={t("Variant")}>
            <SegmentedControl
              aria-label={t("Variant")}
              size="sm"
              options={variants}
              value={variant}
              onValueChange={setVariant}
            />
          </SettingRow>

          <SettingRow label={t("Theme")}>
            <SegmentedControl
              aria-label={t("Theme")}
              size="sm"
              options={themes}
              value={theme}
              onValueChange={setTheme}
            />
          </SettingRow>

          <SettingRow
            label={t("Accent color")}
            htmlFor="embed-accent"
            description={t("Color used for the pulse dot and bars.")}
          >
            <input
              id="embed-accent"
              type="color"
              value={accent}
              onChange={e => setAccent(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded-md border border-neutral-150 bg-transparent dark:border-neutral-800"
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
          </SettingRow>
        </SettingsSection>

        {variant === "card" && (
          <SettingsSection title={t("Options")}>
            <SettingRow label={t("Time Window")}>
              <SegmentedControl
                aria-label={t("Time Window")}
                size="sm"
                options={timeWindows.map(w => ({ value: String(w.minutes), label: w.label }))}
                value={String(minutes)}
                onValueChange={value => setMinutes(Number(value))}
              />
            </SettingRow>

            <SettingRow
              label={t("Show bar chart")}
              htmlFor="embed-chart"
              description={t("Display a bar chart of users over the selected time window.")}
            >
              <Switch id="embed-chart" checked={showChart} onCheckedChange={setShowChart} />
            </SettingRow>

            <SettingRow
              label={t("Show top countries")}
              htmlFor="embed-countries"
              description={t("Display the top 5 countries visiting your site.")}
            >
              <Switch id="embed-countries" checked={showCountries} onCheckedChange={setShowCountries} />
            </SettingRow>

            <SettingRow
              label={t("Width (px)")}
              htmlFor="embed-width"
              description={t("Iframe width. Use max-width: 100% for responsive layouts.")}
            >
              <Input
                id="embed-width"
                type="number"
                min={240}
                max={800}
                value={width}
                onChange={e => setWidth(Math.max(240, Math.min(800, parseInt(e.target.value) || 360)))}
                className="w-24"
              />
            </SettingRow>
          </SettingsSection>
        )}
      </fieldset>
    </SettingsSections>
  );
}
