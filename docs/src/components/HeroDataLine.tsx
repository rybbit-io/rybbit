import { cn } from "@/lib/utils";

// Jagged polyline echoing the product's own sparklines. Sampled from a
// seeded momentum random walk (not hand-placed), then endpoint-pinned:
// a flat intro, a breakout rally, consolidation, a mid-course dip, and a
// grind to new highs — the shape of a real traffic chart.
const LINE_PATH =
  "M-8 214 L18 214 L31 214 L59 209 L77 211 L109 211 L128 213 L150 200 L168 185 L192 151 L219 148 L237 147 L258 135 L289 125 L308 128 L336 122 L359 110 L374 72 L402 37 L419 54 L447 51 L468 49 L494 42 L513 34 L528 53 L563 45 L578 33 L609 27 L629 27 L647 28 L674 42 L689 41 L714 39 L742 28 L754 28 L784 22";

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
