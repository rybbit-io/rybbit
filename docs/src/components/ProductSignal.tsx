import { cn } from "@/lib/utils";

interface ProductSignalProps {
  className?: string;
}

export function ProductSignal({ className }: ProductSignalProps) {
  return (
    <div className={cn("pointer-events-none", className)} aria-hidden="true">
      <svg
        viewBox="0 0 480 140"
        preserveAspectRatio="none"
        className="h-full w-full"
        fill="none"
      >
        <path d="M0 28H480M0 70H480M0 112H480" stroke="var(--marketing-signal-grid)" strokeWidth="1" />
        <path
          pathLength="1"
          d="M0 108C32 102 47 106 73 94C101 81 119 88 144 70C170 52 191 63 215 58C242 52 252 31 281 37C309 43 324 65 349 49C374 34 390 16 416 25C443 34 457 20 480 12"
          stroke="var(--marketing-data)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="signal-trace-primary"
        />
        <path
          pathLength="1"
          d="M0 119C38 113 53 121 82 108C111 94 127 102 158 86C190 69 214 82 243 73C270 65 289 76 314 65C342 53 361 62 390 48C418 35 447 43 480 30"
          stroke="var(--marketing-data-soft)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="signal-trace-secondary"
        />
        <g fill="var(--marketing-data)" className="signal-trace-points">
          <circle cx="144" cy="70" r="3" />
          <circle cx="281" cy="37" r="3" />
          <circle cx="416" cy="25" r="3" />
          <circle cx="480" cy="12" r="4" />
        </g>
      </svg>
    </div>
  );
}
