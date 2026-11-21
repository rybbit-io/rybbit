"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const WIDGET_ORIGIN = "https://demo.rybbit.com";
const SITE_ID = "81";
const DEFAULT_ACCENT = "#10b981";

const TIME_WINDOWS = [
  { label: "Last 30 minutes", minutes: 30 },
  { label: "Last 24 hours", minutes: 1440 },
  { label: "Last 7 days", minutes: 10080 },
];
const VARIANTS = [
  { value: "card", label: "Card" },
  { value: "inline", label: "Inline pill" },
] as const;
const THEMES = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
] as const;

type Variant = (typeof VARIANTS)[number]["value"];
type Theme = (typeof THEMES)[number]["value"];

function pillClass(active: boolean) {
  return cn(
    "px-3 py-1.5 rounded-md text-sm border transition-colors",
    active
      ? "bg-fd-accent text-fd-accent-foreground border-fd-accent"
      : "bg-transparent border-fd-border text-fd-muted-foreground hover:text-fd-foreground"
  );
}

export function EmbedWidgetDemo() {
  const [variant, setVariant] = useState<Variant>("card");
  const [minutes, setMinutes] = useState(30);
  const [showChart, setShowChart] = useState(true);
  const [showCountries, setShowCountries] = useState(true);
  const [width, setWidth] = useState(360);
  const [theme, setTheme] = useState<Theme>("dark");
  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT);
  const [outputTab, setOutputTab] = useState<"preview" | "code">("preview");

  const widgetUrl = useMemo(() => {
    const url = new URL(`${WIDGET_ORIGIN}/widget/${SITE_ID}`);
    url.searchParams.set("variant", variant);
    url.searchParams.set("theme", theme);
    const accentHex = accent.replace(/^#/, "");
    if (accentHex.toLowerCase() !== DEFAULT_ACCENT.slice(1)) {
      url.searchParams.set("accent", accentHex);
    }
    if (variant === "card") {
      url.searchParams.set("minutes", String(minutes));
      url.searchParams.set("chart", String(showChart));
      url.searchParams.set("countries", String(showCountries));
    }
    return url.toString();
  }, [variant, theme, accent, minutes, showChart, showCountries]);

  const cardHeight = 134 + (showChart ? 94 : 0) + (showCountries ? 162 : 0);
  const inlineHeight = 36;
  const inlineWidth = 220;
  const height = variant === "card" ? cardHeight : inlineHeight;
  const iframeWidth = variant === "card" ? width : inlineWidth;

  const iframeCode =
    variant === "card"
      ? `<iframe
  src="${widgetUrl}"
  style="border: 0; width: ${iframeWidth}px; height: ${height}px; max-width: 100%;"
  loading="lazy"
  title="Live visitors"
></iframe>`
      : `<iframe
  src="${widgetUrl}"
  style="border: 0; width: ${iframeWidth}px; height: ${height}px;"
  loading="lazy"
  title="Live visitors"
  scrolling="no"
></iframe>`;

  return (
    <div className="not-prose my-6 space-y-6 rounded-lg border border-fd-border bg-fd-card p-5">
      {/* Variant */}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide">Variant</h5>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map(v => (
            <button
              key={v.value}
              type="button"
              onClick={() => setVariant(v.value)}
              className={pillClass(variant === v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time window (card only) */}
      {variant === "card" && (
        <div className="space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-wide">Time window</h5>
          <div className="flex flex-wrap gap-2">
            {TIME_WINDOWS.map(w => (
              <button
                key={w.minutes}
                type="button"
                onClick={() => setMinutes(w.minutes)}
                className={pillClass(minutes === w.minutes)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Appearance */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold uppercase tracking-wide">Appearance</h5>

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">Theme</div>
          <div className="flex gap-2">
            {THEMES.map(th => (
              <button
                key={th.value}
                type="button"
                onClick={() => setTheme(th.value)}
                className={pillClass(theme === th.value)}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">Accent color</div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accent}
              onChange={e => setAccent(e.target.value)}
              className="h-8 w-10 rounded-md border border-fd-border bg-transparent cursor-pointer"
              aria-label="Accent color"
            />
            <button
              type="button"
              onClick={() => setAccent(DEFAULT_ACCENT)}
              disabled={accent.toLowerCase() === DEFAULT_ACCENT}
              className="text-xs text-fd-muted-foreground hover:text-fd-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Card-only options */}
      {variant === "card" && (
        <div className="space-y-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide">Options</h5>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm">Show bar chart</span>
            <input
              type="checkbox"
              checked={showChart}
              onChange={e => setShowChart(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm">Show top countries</span>
            <input
              type="checkbox"
              checked={showCountries}
              onChange={e => setShowCountries(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">Width (px)</span>
            <input
              type="number"
              min={240}
              max={800}
              value={width}
              onChange={e => setWidth(Math.max(240, Math.min(800, parseInt(e.target.value) || 360)))}
              className="w-24 px-2 py-1 rounded-md border border-fd-border bg-transparent text-sm"
            />
          </div>
        </div>
      )}

      {/* Preview / Code tabs */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              { key: "preview", label: "Preview" },
              { key: "code", label: "Embed code" },
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setOutputTab(tab.key)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors",
                outputTab === tab.key
                  ? "bg-fd-accent text-fd-accent-foreground"
                  : "text-fd-muted-foreground hover:bg-fd-accent/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {outputTab === "preview" ? (
          <div
            className={cn(
              "rounded-md border border-fd-border p-4 flex",
              variant === "card" ? "justify-center" : "items-center justify-center"
            )}
            style={{ background: theme === "dark" ? "#0a0a0a" : "#f5f5f5" }}
          >
            <iframe
              key={widgetUrl}
              src={widgetUrl}
              style={{
                border: 0,
                width: iframeWidth,
                height,
                maxWidth: "100%",
                background: "transparent",
              }}
              title="Widget preview"
            />
          </div>
        ) : (
          <pre className="overflow-auto rounded-md border border-fd-border bg-fd-muted/40 p-3 text-xs">
            <code>{iframeCode}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
