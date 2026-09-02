import { WatchfulFrog } from "@/components/deco/WatchfulFrog";

const PLATE_W = 1280;
const PLATE_H = 620;

/** Catmull-Rom → cubic Bézier area under a series, on a `w`×`h` sheet. */
function areaPath(values: number[], w: number, h: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((v, i) => [
    (i * w) / (values.length - 1),
    h * (1 - (v - min) / (max - min || 1)),
  ]);
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(
      p2[1] - (p3[1] - p1[1]) / 6
    )} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d} L${f(points[points.length - 1][0])},${h} L${f(points[0][0])},${h} Z`;
}

// Three traffic silhouettes, low saturation: two in the data hue, one emerald.
const LAYERS = [
  { values: [8, 12, 9, 15, 22, 18, 26, 31, 27, 35, 30, 38, 33, 28, 36, 40, 34, 29, 26, 22], y: 120, h: 500, className: "fill-[var(--dataviz)] opacity-[0.12] dark:opacity-[0.10]" },
  { values: [10, 8, 14, 11, 18, 24, 20, 27, 22, 30, 26, 33, 29, 36, 31, 26, 30, 24, 20, 17], y: 220, h: 400, className: "fill-[var(--dataviz)] opacity-[0.16] dark:opacity-[0.14]" },
  { values: [6, 9, 7, 12, 10, 16, 13, 19, 15, 22, 18, 24, 21, 17, 20, 15, 12, 10, 8, 6], y: 330, h: 290, className: "fill-emerald-500 opacity-[0.14] dark:opacity-[0.16]" },
];

/**
 * The hero's product window on its "traffic landscape" plate: the live demo
 * embed, framed as a browser, sitting on layered traffic silhouettes. On
 * large screens the window runs just past the plate's bottom edge; below that
 * the plate simply wraps it.
 */
export function HeroPlate() {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-neutral-200 bg-[#f4f5f8] p-3 dark:border-neutral-800 dark:bg-[#111318] sm:p-6 lg:h-[720px] lg:p-0">
      <svg
        viewBox={`0 0 ${PLATE_W} ${PLATE_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      >
        <defs>
          <linearGradient id="lp-b-sky-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f5f8" />
            <stop offset="1" stopColor="#eef3f0" />
          </linearGradient>
          <linearGradient id="lp-b-sky-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#111318" />
            <stop offset="1" stopColor="#0e1211" />
          </linearGradient>
        </defs>
        <rect width={PLATE_W} height={PLATE_H} className="fill-[url(#lp-b-sky-light)] dark:fill-[url(#lp-b-sky-dark)]" />
        {LAYERS.map(layer => (
          <path
            key={layer.y}
            d={areaPath(layer.values, PLATE_W, layer.h)}
            transform={`translate(0,${layer.y})`}
            className={layer.className}
          />
        ))}
      </svg>

      {/* Peeking over the window, as on the control page. */}
      <div className="pointer-events-none absolute right-[8%] top-3 hidden w-24 -rotate-2 text-neutral-950 opacity-[0.12] dark:text-white dark:opacity-[0.09] lg:block">
        <WatchfulFrog />
      </div>

      <div className="relative min-w-0 overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.25)] dark:border-neutral-700 dark:bg-neutral-950 dark:shadow-[0_30px_80px_rgba(0,0,0,0.55)] lg:absolute lg:left-[6.25%] lg:top-16 lg:w-[87.5%]">
        <div className="grid h-8 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800 sm:px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <a
            href="https://demo.rybbit.com/81"
            target="_blank"
            rel="noopener noreferrer"
            className="truncate rounded border border-neutral-200 bg-neutral-50 px-2 py-px font-mono text-[11px] text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            demo.rybbit.com
          </a>
          <div />
        </div>
        {/* md+: render the demo at a 117.6% viewport and scale to 0.85 so it
            shows its full desktop layout at preview size. Keep 1:1 on mobile —
            a scaled viewport would land between the demo's responsive
            breakpoints. The two values must stay reciprocal. */}
        <div className="h-[500px] min-w-0 max-w-full overflow-hidden md:h-[600px] lg:h-[650px]">
          <iframe
            src="https://demo.rybbit.com/81/main"
            className="block h-full w-full border-none md:h-[117.6%] md:w-[117.6%] md:origin-top-left md:scale-[0.85]"
            title="Rybbit Analytics Demo"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
