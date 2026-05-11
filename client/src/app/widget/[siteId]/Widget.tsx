"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import * as CountryFlags from "country-flag-icons/react/3x2";
import { BACKEND_URL } from "@/lib/const";
import { getCountryName } from "@/lib/utils";

interface EmbedStats {
  count: number;
  series: { time: string; users: number }[];
  topCountries: { country: string; users: number }[];
}

export type WidgetVariant = "card" | "inline";

interface WidgetProps {
  siteId: string;
  minutes: number;
  chart: boolean;
  countries: boolean;
  theme: "dark" | "light";
  accent: string;
  variant: WidgetVariant;
}

const MINUTES_LABEL: Record<number, string> = {
  30: "LAST 30 MINUTES",
  1440: "LAST 24 HOURS",
  10080: "LAST 7 DAYS",
};

function formatBarLabel(time: string, minutes: number) {
  const dt = DateTime.fromSQL(time, { zone: "utc" }).toLocal();
  if (minutes === 30 || minutes === 1440) return dt.toFormat("HH:mm");
  return dt.toFormat("MMM d");
}

function useEmbedStats(siteId: string, minutes: number, chart: boolean, countries: boolean) {
  const [data, setData] = useState<EmbedStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          minutes: String(minutes),
          chart: String(chart),
          countries: String(countries),
        });
        const res = await fetch(`${BACKEND_URL}/sites/${siteId}/embed-stats?${params}`);
        if (!res.ok) {
          throw new Error(res.status === 403 ? "Site is not public" : "Failed to load");
        }
        const json = (await res.json()) as EmbedStats;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    };
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [siteId, minutes, chart, countries]);

  return { data, error };
}

function themeColors(theme: "dark" | "light") {
  return theme === "dark"
    ? {
      bg: "#171717",
      fg: "#fafafa",
      muted: "#737373",
      border: "rgba(255,255,255,0.08)",
    }
    : {
      bg: "#ffffff",
      fg: "#171717",
      muted: "#737373",
      border: "rgba(0,0,0,0.08)",
    };
}

export function Widget(props: WidgetProps) {
  if (props.variant === "inline") return <InlineWidget {...props} />;
  return <CardWidget {...props} />;
}

function InlineWidget({ siteId, theme, accent }: WidgetProps) {
  const { data, error } = useEmbedStats(siteId, 30, false, false);
  const c = themeColors(theme);

  return (
    <div
      style={{
        background: c.bg,
        color: c.fg,
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "6px 12px",
        borderRadius: 9999,
        border: `1px solid ${c.border}`,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 14,
        lineHeight: 1,
        boxSizing: "border-box",
        width: "fit-content",
      }}
    >
      <PulseDot color={accent} size={8} />
      <span style={{ fontWeight: 600 }}>
        {error ? "—" : data ? data.count.toLocaleString() : "—"}
      </span>
      <span style={{ color: c.muted }}>users online</span>
      <span style={{ color: c.muted, opacity: 0.6 }}>·</span>
      <a
        href="https://rybbit.io"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: c.muted, fontSize: 12, textDecoration: "none" }}
      >
        Rybbit
      </a>
    </div>
  );
}

function CardWidget({ siteId, minutes, chart, countries, theme, accent }: WidgetProps) {
  const { data, error } = useEmbedStats(siteId, minutes, chart, countries);
  const c = themeColors(theme);

  if (error) {
    return (
      <div
        style={{
          background: c.bg,
          color: c.muted,
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "20px",
          borderRadius: 12,
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }

  const maxBar = data?.series.length ? Math.max(...data.series.map(s => s.users), 1) : 1;

  return (
    <div
      style={{
        background: c.bg,
        color: c.fg,
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "24px",
        borderRadius: 12,
        boxSizing: "border-box",
        width: "100%",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: "0.08em", color: c.muted, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.03em" }}>
          <PulseDot color={accent} /> VISITORS
        </div>

        <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: c.fg }}>
          {data ? data.count.toLocaleString() : "—"}
        </span>
      </div>
      {chart && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 3,
            height: 90,
            borderBottom: `1px solid ${c.border}`,
            paddingBottom: 4,
          }}
        >
          {data?.series.length ? (
            data.series.map(s => {
              const h = Math.max(2, (s.users / maxBar) * 86);
              return (
                <div
                  key={s.time}
                  title={`${s.users} users · ${formatBarLabel(s.time, minutes)}`}
                  style={{
                    flex: 1,
                    height: h,
                    background: accent,
                    borderRadius: 2,
                    minWidth: 4,
                  }}
                />
              );
            })
          ) : (
            <div style={{ flex: 1, color: c.muted, fontSize: 12 }}>No data</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
        <span style={{ color: c.muted, fontSize: 12 }}>  {MINUTES_LABEL[minutes]}</span>
      </div>

      {countries && (
        <div style={{ marginTop: 10 }}>
          {data?.topCountries.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.topCountries.map(country => {
                const Flag = CountryFlags[country.country as keyof typeof CountryFlags];
                return (
                  <div key={country.country} style={{ display: "flex", alignItems: "center", fontSize: 14 }}>
                    <div style={{ width: 24, display: "flex", alignItems: "center" }}>
                      {Flag ? <Flag title={getCountryName(country.country)} style={{ width: 18 }} /> : null}
                    </div>
                    <span style={{ marginLeft: 10, flex: 1 }}>{getCountryName(country.country)}</span>
                    <span style={{ color: c.muted }}>{country.users}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: c.muted, fontSize: 12 }}>No data</div>
          )}
        </div>
      )}

      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        <a
          href="https://rybbit.io"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: c.muted, fontSize: 11, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
        >
          Powered by
          <img src={theme === "dark" ? "/rybbit/horizontal_white.svg" : "/rybbit/horizontal_black.svg"} alt="Rybbit" width={60} height={12} />
        </a>
      </div>
    </div>
  );
}

function PulseDot({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: color,
          borderRadius: "50%",
          opacity: 0.4,
          animation: "rybbit-pulse 1.6s ease-out infinite",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: Math.max(1, Math.round(size * 0.2)),
          background: color,
          borderRadius: "50%",
        }}
      />
      <style>{`@keyframes rybbit-pulse { 0% { transform: scale(1); opacity: 0.5 } 100% { transform: scale(2.2); opacity: 0 } }`}</style>
    </span>
  );
}
