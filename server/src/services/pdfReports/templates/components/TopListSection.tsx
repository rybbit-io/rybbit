import * as React from "react";
import type { MetricData } from "../../pdfReportTypes.js";
import { formatNumber, safeToFixed, truncateString } from "./utils.js";

interface TopListItemProps {
  value: string;
  percentage: number | null;
  count: number;
  barWidth: number;
  iconUrl?: string;
  iconSize?: { width: number; height: number };
}

const TopListItem = ({ value, percentage, count, barWidth, iconUrl, iconSize }: TopListItemProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      padding: "5px 8px",
      marginBottom: "4px",
      borderRadius: "4px",
      position: "relative",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: `${barWidth}%`,
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        borderRadius: "6px",
        zIndex: 0,
      }}
    />
    <div style={{ display: "flex", alignItems: "center", flex: "1", minWidth: "0", position: "relative", zIndex: 1 }}>
      {iconUrl && (
        <img
          src={iconUrl}
          alt=""
          width={iconSize?.width ?? 16}
          height={iconSize?.height ?? 16}
          style={{ marginRight: "8px", borderRadius: "2px" }}
        />
      )}
      <span
        style={{
          color: "#111827",
          fontSize: "13px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {truncateString(value, 27)}
      </span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "12px" }}>
      <span style={{ color: "#6b7280", fontSize: "12px", width: "30px", textAlign: "right" }}>
        {safeToFixed(percentage, 1)}%
      </span>
      <span style={{ color: "#111827", fontSize: "13px", fontWeight: "500", width: "38px", textAlign: "right" }}>
        {formatNumber(count)}
      </span>
    </div>
  </div>
);

export interface TopListSectionProps {
  title: string;
  items: MetricData[];
  renderLabel: (item: MetricData) => string;
  showFavicon?: boolean;
  getIconUrl?: (item: MetricData) => string;
  iconSize?: { width: number; height: number };
}

export const TopListSection = ({
  title,
  items,
  renderLabel,
  showFavicon,
  getIconUrl,
  iconSize,
}: TopListSectionProps) => {
  if (items.length === 0) return null;

  const ratio = items[0]?.percentage ? 100 / items[0].percentage : 1;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        flex: "1",
      }}
    >
      <div style={{ color: "#111827", fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>{title}</div>
      {items.map((item, index) => {
        const barWidth = (item.percentage ?? 0) * ratio;
        let iconUrl: string | undefined;
        if (getIconUrl) {
          iconUrl = getIconUrl(item);
        } else if (showFavicon) {
          iconUrl = `https://www.google.com/s2/favicons?domain=${item.value}&sz=16`;
        }

        return (
          <TopListItem
            key={index}
            value={renderLabel(item)}
            percentage={item.percentage}
            count={item.count}
            barWidth={barWidth}
            iconUrl={iconUrl}
            iconSize={iconSize}
          />
        );
      })}
    </div>
  );
};
