import { useId } from "react";

/**
 * A count over time with no axes: the shape of the period, not its values. A
 * series with nothing in it draws nothing, so an empty cell stays empty.
 */
export function Sparkline({
  values,
  width = 84,
  height = 22,
  color = "hsl(var(--dataviz))",
  fill = true,
  label,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  label: string;
}) {
  const gradientId = useId();
  const peak = Math.max(0, ...values);
  if (values.length < 2 || peak === 0) return null;

  const pad = 1.5;
  const step = (width - pad * 2) / (values.length - 1);
  const points = values.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - (value / peak) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${points.join("L")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${line}L${width - pad},${height}L${pad},${height}Z`} fill={`url(#${gradientId})`} />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth={1.25} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
