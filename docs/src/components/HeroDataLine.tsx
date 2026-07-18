import { cn } from "@/lib/utils";

// Jagged polyline echoing the product's own sparklines: an overall upward
// trend with retraces and one deeper drawdown, not a smooth straight climb.
const LINE_PATH =
  "M-8 214 L16 208 L40 211 L64 199 L88 203 L112 190 L136 171 L160 178 L184 158 L208 166 L232 143 L256 150 L280 128 L304 138 L328 146 L352 118 L376 126 L400 98 L424 110 L448 84 L472 94 L496 68 L520 88 L544 60 L568 72 L592 44 L616 56 L640 34 L664 48 L688 26 L712 38 L736 24 L760 34 L784 22";

interface HeroDataLineProps {
  /** Unique per instance — namespaces the SVG gradient id. */
  id: string;
  className?: string;
}

/**
 * Decorative plotted traffic line in the periwinkle data hue (--dataviz).
 * Draws itself on load; static under prefers-reduced-motion. Purely
 * ornamental — the final state is fully visible without any animation.
 */
export function HeroDataLine({ id, className }: HeroDataLineProps) {
  const gradientId = `dataline-fill-${id}`;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 [mask-image:linear-gradient(to_right,transparent,black_22%)]",
        className
      )}
    >
      {/* Faint graph paper under the plotted line, fading upward so the
          grid reads as the chart's base without touching the headline. */}
      <div
        className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_top,black_25%,transparent_92%)] dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)]"
      />
      <svg
        className="size-full"
        viewBox="0 0 800 240"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--dataviz)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--dataviz)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="dataline-area"
          d={`${LINE_PATH} L784 240 L-8 240 Z`}
          fill={`url(#${gradientId})`}
        />
        <path
          className="dataline-path"
          d={LINE_PATH}
          pathLength={1}
          stroke="var(--dataviz)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Endpoint marker at (784, 22) in the 800x240 viewBox */}
      <span className="dataline-dot absolute left-[98%] top-[9.2%] flex size-2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--dataviz)] opacity-50 [animation-duration:2.4s] motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-[var(--dataviz)]" />
      </span>
    </div>
  );
}
