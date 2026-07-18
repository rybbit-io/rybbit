import { cn } from "@/lib/utils";

const LINE =
  "M0 52 L20 48 L40 50 L60 42 L80 45 L100 36 L120 40 L140 30 L160 33 L180 24 L200 28 L220 18 L240 22 L260 12 L280 14";
const AREA = `${LINE} L280 68 L0 68 Z`;

/**
 * Decorative traffic sparkline in the product's periwinkle data hue with an
 * emerald signal endpoint. The line is always fully drawn — the only motion
 * is the live pulse on the endpoint, which reduced-motion hides.
 * Pure decoration — hidden from assistive tech.
 */
export function SignalSparkline({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative select-none", className)}>
      <svg viewBox="0 0 280 72" fill="none" className="block w-full max-w-[300px]">
        {/* baseline rules */}
        <g className="text-neutral-200 dark:text-neutral-800" stroke="currentColor" strokeWidth="1">
          <line x1="0" y1="68.5" x2="280" y2="68.5" />
          <line x1="0" y1="40.5" x2="280" y2="40.5" strokeDasharray="2 4" />
          <line x1="0" y1="12.5" x2="280" y2="12.5" strokeDasharray="2 4" />
        </g>
        <g className="text-[#6b7fe8] dark:text-[#b3bfff]">
          <path d={AREA} fill="currentColor" fillOpacity="0.12" />
          <path d={LINE} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>
        <circle cx="280" cy="14" r="6" className="fill-emerald-500/20" />
        <circle cx="280" cy="14" r="2.5" className="fill-emerald-500" />
      </svg>
      {/* live pulse on the endpoint; mirrors the hero's Live dot */}
      <span className="absolute right-0 top-[19.4%] size-3 -translate-y-1/2 translate-x-1/2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40 motion-reduce:hidden" />
      </span>
      <span className="absolute -top-1 right-0 rounded-sm bg-emerald-600/10 px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
        +18%
      </span>
    </div>
  );
}
