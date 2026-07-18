import { cn } from "@/lib/utils";

interface MarketingSignalProps {
  className?: string;
}

/**
 * A decorative live-data trace used on marketing heroes. The path stays
 * visible without motion; the moving dash is a progressive enhancement that
 * is disabled by the global reduced-motion rule.
 */
export function MarketingSignal({ className }: MarketingSignalProps) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <svg
        viewBox="0 0 760 420"
        preserveAspectRatio="none"
        className="h-full w-full"
        fill="none"
      >
        <path
          d="M-40 318 C 44 318, 66 250, 132 262 S 232 356, 302 278 S 396 142, 462 204 S 548 320, 604 212 S 688 84, 804 122"
          className="stroke-emerald-200/20"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M-40 318 C 44 318, 66 250, 132 262 S 232 356, 302 278 S 396 142, 462 204 S 548 320, 604 212 S 688 84, 804 122"
          className="marketing-signal-trace stroke-[#b3bfff]/75"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        <path
          d="M-20 362 C 82 338, 118 380, 212 348 S 360 288, 448 326 S 620 374, 790 292"
          className="stroke-amber-300/25"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        <g className="fill-[#b3bfff]">
          <circle cx="132" cy="262" r="4" />
          <circle cx="302" cy="278" r="4" />
          <circle cx="462" cy="204" r="4" />
          <circle cx="604" cy="212" r="4" />
        </g>
        <circle cx="688" cy="98" r="5" className="fill-amber-300" />
        <circle cx="688" cy="98" r="12" className="marketing-signal-pulse fill-amber-300/20" />
      </svg>
    </div>
  );
}
