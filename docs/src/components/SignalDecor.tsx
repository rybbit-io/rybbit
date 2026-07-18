import { useId } from "react";

interface DecorProps {
  className?: string;
}

const HERO_LINE =
  "M0,126 L40,118 L80,128 L120,104 L160,114 L200,92 L240,102 L280,76 L320,90 L360,64 L400,76 L440,50 L480,62 L520,36 L560,46 L600,24";

const HERO_SECONDARY =
  "M0,142 L60,136 L120,144 L180,128 L240,136 L300,118 L360,126 L420,106 L480,114 L540,94 L600,100";

/**
 * Decorative traffic chart anchored to the bottom of the hero headline cell.
 * Pure ornament drawn from the product's own chart vocabulary — emerald
 * primary series, periwinkle secondary (the dashboard's dataviz hue).
 */
export function HeroChartDecor({ className }: DecorProps) {
  const gradientId = useId();
  return (
    <svg
      viewBox="0 0 600 160"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="chart-fill"
        fill={`url(#${gradientId})`}
        stroke="none"
        d={`${HERO_LINE} L600,160 L0,160 Z`}
      />
      <path
        className="chart-draw text-[#7c92ff] dark:text-[#b3bfff]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.55"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        d={HERO_SECONDARY}
      />
      <path
        className="chart-draw"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        d={HERO_LINE}
      />
    </svg>
  );
}

/** Small standalone sparkline with a live end-point dot. */
export function SparklineDecor({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 160 40" aria-hidden="true" className={className}>
      <path
        className="text-[#7c92ff] dark:text-[#b3bfff]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.55"
        vectorEffect="non-scaling-stroke"
        d="M0,34 L20,31 L40,35 L60,28 L80,31 L100,24 L120,27 L140,21 L160,23"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        d="M0,28 L16,24 L32,30 L48,20 L64,24 L80,14 L96,18 L112,10 L128,14 L144,6 L160,10"
      />
      <circle cx="160" cy="10" r="2.5" fill="currentColor" />
    </svg>
  );
}

/** Faint area-chart silhouette for the emerald CTA band. */
export function CtaChartDecor({ className }: DecorProps) {
  return (
    <svg
      viewBox="0 0 600 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="currentColor"
        fillOpacity="0.05"
        stroke="none"
        d="M0,96 L50,88 L100,98 L150,74 L200,84 L250,62 L300,72 L350,50 L400,62 L450,38 L500,50 L550,26 L600,34 L600,120 L0,120 Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        d="M0,96 L50,88 L100,98 L150,74 L200,84 L250,62 L300,72 L350,50 L400,62 L450,38 L500,50 L550,26 L600,34"
      />
    </svg>
  );
}
