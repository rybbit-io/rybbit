import * as React from "react";

export interface MetricCardProps {
  label: string;
  currentValue: string;
  growth: string;
  isPositive: boolean;
}

export const MetricCard = ({ label, currentValue, growth, isPositive }: MetricCardProps) => (
  <div
    style={{
      backgroundColor: "#f9fafb",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "16px",
      height: "100%",
    }}
  >
    <div style={{ color: "#6b7280", fontSize: "12px", marginBottom: "4px" }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
      <span style={{ color: "#111827", fontSize: "24px", fontWeight: "bold" }}>{currentValue}</span>
      <span
        style={{
          color: isPositive ? "#10b981" : "#ef4444",
          fontSize: "12px",
          fontWeight: "500",
        }}
      >
        {growth}
      </span>
    </div>
  </div>
);
