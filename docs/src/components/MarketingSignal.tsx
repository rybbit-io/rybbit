interface MarketingSignalProps {
  className?: string;
}

/**
 * A small data-trace motif for marketing surfaces. It borrows the visual
 * language of Rybbit's charts without pretending to be product data.
 */
export function MarketingSignal({ className }: MarketingSignalProps) {
  return (
    <svg viewBox="0 0 640 220" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M0 176H640" stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
      <path
        d="M0 164C49 164 61 151 97 151C137 151 145 177 184 177C228 177 232 91 279 91C324 91 330 130 370 130C414 130 422 48 468 48C514 48 521 103 560 103C597 103 610 79 640 79"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="marketing-signal-flow"
      />
      <g fill="currentColor">
        <circle cx="97" cy="151" r="4" />
        <circle cx="279" cy="91" r="4" />
        <circle cx="468" cy="48" r="4" />
        <circle cx="640" cy="79" r="4" />
      </g>
    </svg>
  );
}
