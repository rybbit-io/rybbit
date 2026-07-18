import { cn } from "@/lib/utils";

const LINE_PATH =
  "M-8 216 C40 210 70 214 104 198 C138 182 158 188 190 178 C224 167 244 172 272 150 C300 128 330 138 362 130 C394 122 414 128 444 106 C474 84 506 94 536 86 C566 78 590 82 620 60 C650 38 682 48 712 40 C736 34 758 30 784 22";

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
