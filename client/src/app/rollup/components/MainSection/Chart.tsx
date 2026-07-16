"use client";
import { TimeBucket } from "@rybbit/shared";
import { ResponsiveBar } from "@nivo/bar";
import { useWindowSize } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { useState } from "react";
import { createPortal } from "react-dom";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Time } from "@/components/DateSelector/types";
import { formatChartDateTime, hour12, userLocale } from "@/lib/dateTimeUtils";
import { useNivoTheme } from "@/lib/nivo";
import { getTimezone, StatType } from "@/lib/store";
import { formatSecondsAsMinutesAndSeconds, formatter } from "@/lib/utils";
import { RollupSeries } from "../../hooks/useRollupBucketed";

const SITE_COLORS = [
  "hsla(217, 75%, 60%, 0.85)",
  "hsla(142, 65%, 48%, 0.85)",
  "hsla(24, 80%, 60%, 0.85)",
  "hsla(280, 62%, 62%, 0.85)",
  "hsla(190, 78%, 52%, 0.85)",
  "hsla(340, 70%, 62%, 0.85)",
  "hsla(48, 80%, 55%, 0.85)",
  "hsla(160, 58%, 48%, 0.85)",
  "hsla(0, 70%, 65%, 0.85)",
  "hsla(258, 72%, 70%, 0.85)",
  "hsla(80, 58%, 52%, 0.85)",
  "hsla(210, 58%, 58%, 0.85)",
  "hsla(12, 75%, 58%, 0.85)",
  "hsla(170, 62%, 44%, 0.85)",
  "hsla(300, 60%, 65%, 0.85)",
  "hsla(60, 70%, 52%, 0.85)",
  "hsla(230, 70%, 70%, 0.85)",
  "hsla(110, 52%, 52%, 0.85)",
  "hsla(35, 75%, 52%, 0.85)",
  "hsla(320, 58%, 58%, 0.85)",
  "hsla(180, 70%, 48%, 0.85)",
  "hsla(265, 58%, 58%, 0.85)",
  "hsla(95, 62%, 44%, 0.85)",
  "hsla(15, 62%, 68%, 0.85)",
  "hsla(200, 75%, 65%, 0.85)",
  "hsla(135, 52%, 60%, 0.85)",
  "hsla(355, 62%, 55%, 0.85)",
  "hsla(245, 70%, 62%, 0.85)",
  "hsla(70, 70%, 60%, 0.85)",
  "hsla(290, 70%, 55%, 0.85)",
];

// Assign colors by position in the canonical site list so that no two sites
// in view ever collide as long as there are at most SITE_COLORS.length sites.
export function buildSiteColorMap(siteIds: number[]): Map<number, string> {
  const map = new Map<number, string>();
  siteIds.forEach((id, i) => {
    map.set(id, SITE_COLORS[i % SITE_COLORS.length]);
  });
  return map;
}

const FALLBACK_COLOR = SITE_COLORS[0];

// Stats that are sums across sites get stacked bars; weighted-average stats
// get grouped (side-by-side) bars since stacking averages is misleading.
const ADDITIVE_STATS: StatType[] = ["pageviews", "sessions", "users"];

const formatTooltipValue = (value: number, selectedStat: StatType): string => {
  if (selectedStat === "bounce_rate") return `${value.toFixed(1)}%`;
  if (selectedStat === "session_duration")
    return formatSecondsAsMinutesAndSeconds(value);
  return value.toLocaleString();
};

type SiteMeta = {
  siteId: number;
  name: string;
  domain: string;
};

export function Chart({
  series,
  siteMetaById,
  siteColorMap,
  selectedStat,
  bucket,
  time,
}: {
  series: RollupSeries[];
  siteMetaById: Map<number, SiteMeta>;
  siteColorMap: Map<number, string>;
  selectedStat: StatType;
  bucket: TimeBucket;
  time: Time;
}) {
  const { width } = useWindowSize();
  const nivoTheme = useNivoTheme();
  const timezone = getTimezone();
  const maxTicks = Math.max(1, Math.round((width ?? Infinity) / 75));

  // Each site becomes a stacked/grouped key in every time-bucket row.
  const labelForSeries = (s: RollupSeries) => {
    const meta = siteMetaById.get(s.siteId);
    return meta?.name || meta?.domain || `Site ${s.siteId}`;
  };

  const keys = series.map(labelForSeries);
  const colors = series.map(
    (s) => siteColorMap.get(s.siteId) ?? FALLBACK_COLOR
  );

  // Pivot series → one row per time bucket with a value per site key.
  const buckets = new Map<string, Record<string, string | number>>();
  series.forEach((s) => {
    const key = labelForSeries(s);
    s.data.forEach((point) => {
      const ts = DateTime.fromSQL(point.time, { zone: timezone }).toUTC();
      if (ts > DateTime.now()) return;
      const timeStr = ts.toFormat("yyyy-MM-dd HH:mm:ss");
      let row = buckets.get(timeStr);
      if (!row) {
        row = { time: timeStr };
        keys.forEach((k) => {
          row![k] = 0;
        });
        buckets.set(timeStr, row);
      }
      row[key] = point[selectedStat];
    });
  });

  const chartData = Array.from(buckets.values()).sort((a, b) =>
    String(a.time).localeCompare(String(b.time))
  );

  const groupMode: "grouped" | "stacked" = ADDITIVE_STATS.includes(selectedStat)
    ? "stacked"
    : "grouped";

  const tickStep = Math.max(1, Math.ceil(chartData.length / maxTicks));

  // Tooltip state — we render our own via a portal so it isn't clipped by the
  // surrounding Card's overflow-hidden, and so it can show every site for the
  // hovered time bucket rather than just the bar under the cursor.
  const colorByKey = new Map(keys.map((k, i) => [k, colors[i]]));
  const [hover, setHover] = useState<{
    indexValue: string;
    x: number;
    y: number;
  } | null>(null);

  const hoverRow = hover
    ? chartData.find((d) => d.time === hover.indexValue)
    : undefined;

  const hoverEntries = hoverRow
    ? keys
        .map((k) => ({
          key: k,
          value: Number(hoverRow[k] ?? 0),
          color: colorByKey.get(k) ?? FALLBACK_COLOR,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const tooltipWidth = 240;
  const tooltipOffset = 14;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
  const tooltipLeft = hover
    ? Math.min(hover.x + tooltipOffset, viewportW - tooltipWidth - 8)
    : 0;

  return (
    <>
      <div
        className="w-full h-full"
        onMouseMove={(e) =>
          setHover((prev) =>
            prev
              ? { ...prev, x: e.clientX, y: e.clientY }
              : prev
          )
        }
        onMouseLeave={() => setHover(null)}
      >
        <ResponsiveBar
          data={chartData}
          keys={keys}
          indexBy="time"
          groupMode={groupMode}
          theme={nivoTheme}
          margin={{ top: 10, right: 15, bottom: 30, left: 40 }}
          padding={0.2}
          innerPadding={groupMode === "grouped" ? 1 : 0}
          valueScale={{ type: "linear" }}
          indexScale={{ type: "band", round: true }}
          colors={colors}
          enableGridX={false}
          enableGridY={true}
          enableLabel={false}
          borderRadius={1}
          animate={false}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 10,
            tickRotation: 0,
            format: (value: string) => {
              const idx = chartData.findIndex((d) => d.time === value);
              if (idx === -1 || idx % tickStep !== 0) return "";
              const dt = DateTime.fromFormat(value, "yyyy-MM-dd HH:mm:ss", {
                zone: "utc",
              })
                .setZone(getTimezone())
                .setLocale(userLocale);
              if (time.mode === "past-minutes") {
                if (time.pastMinutesStart < 1440)
                  return dt.toFormat(hour12 ? "h:mm" : "HH:mm");
                return dt.toFormat(hour12 ? "ha" : "HH:mm");
              }
              if (time.mode === "day")
                return dt.toFormat(hour12 ? "ha" : "HH:mm");
              return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
            },
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 10,
            tickRotation: 0,
            format: formatter,
          }}
          onMouseEnter={(datum, event) =>
            setHover({
              indexValue: String(datum.indexValue),
              x: event.clientX,
              y: event.clientY,
            })
          }
          onMouseLeave={() => setHover(null)}
          tooltip={() => <></>}
        />
      </div>
      {hover && hoverRow && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tooltipLeft,
              top: hover.y + tooltipOffset,
              width: tooltipWidth,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <ChartTooltip>
              <div className="text-xs font-medium px-2 pt-1.5 pb-1 text-neutral-400">
                {formatChartDateTime(
                  DateTime.fromFormat(
                    hover.indexValue,
                    "yyyy-MM-dd HH:mm:ss",
                    { zone: "utc" }
                  ).setZone(getTimezone()),
                  bucket
                )}
              </div>
              <div className="w-full h-px bg-neutral-100 dark:bg-neutral-750" />
              <div className="m-2 flex flex-col gap-1">
                {hoverEntries.map((e) => (
                  <div
                    key={e.key}
                    className="flex justify-between text-sm gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-1 h-3 rounded-[3px] shrink-0"
                        style={{ backgroundColor: e.color }}
                      />
                      <span className="truncate">{e.key}</span>
                    </div>
                    <div className="shrink-0">
                      {formatTooltipValue(e.value, selectedStat)}
                    </div>
                  </div>
                ))}
              </div>
            </ChartTooltip>
          </div>,
          document.body
        )}
    </>
  );
}
