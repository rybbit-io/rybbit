import * as React from "react";
import { ActivitySlider } from "@rybbit/ui";

// Raw rrweb-shaped events (what the replay player feeds the slider):
//   type 4 Meta = session start / navigation · type 3 source 2 = mouse interaction
//   (data.type 2 click · 3 right click · 4 double click) · type 3 source 5 = input
//   type 6 plugin rrweb/console@1 = console log/warn/error.
const T0 = 1715774400000;
const at = (s: number) => T0 + Math.round(s * 1000);
const meta = (s: number, path: string) => ({ timestamp: at(s), type: 4, data: { href: `https://tomato.gg${path}`, width: 1440, height: 900 } });
const click = (s: number, x: number, y: number, kind: 2 | 3 | 4 = 2) => ({ timestamp: at(s), type: 3, data: { source: 2, type: kind, id: 1, x, y } });
const keystroke = (s: number, id: number) => ({ timestamp: at(s), type: 3, data: { source: 5, id, text: "…" } });
const log = (s: number, level: "info" | "warn" | "error", msg: string) => ({
  timestamp: at(s),
  type: 6,
  data: { plugin: "rrweb/console@1", payload: { level, payload: [msg] } },
});

const DURATION = 180_000; // 3:00

const session = [
  meta(0, "/"),
  click(4, 210, 118),
  click(9, 640, 340),
  click(15, 912, 402),
  ...[22, 22.3, 22.6, 22.9, 23.2].map((s) => keystroke(s, 7)),
  click(28, 700, 560),
  meta(31, "/pricing"),
  click(36, 380, 420),
  click(42, 560, 610),
  click(48, 560, 610, 4),
  meta(55, "/pricing/compare"),
  log(61, "warn", "Deprecated API: window.rybbit.track"),
  click(66, 300, 300),
  // Four clicks inside 1s on the same spot → one rage click marker.
  click(71, 640, 420),
  click(71.2, 642, 421),
  click(71.45, 641, 419),
  click(71.7, 640, 420),
  log(74, "error", "POST /api/checkout 500"),
  click(90, 980, 220),
  meta(96, "/signup"),
  ...[101, 101.4, 101.8, 102.2, 102.6, 103].map((s) => keystroke(s, 12)),
  click(110, 500, 500, 3),
  click(118, 500, 640),
  click(126, 760, 640),
  log(131, "info", "signup:submitted"),
  meta(140, "/welcome"),
  click(150, 320, 240),
  click(162, 320, 400),
  click(171, 900, 400),
].sort((a, b) => a.timestamp - b.timestamp);

const activity = [
  { start: 0, end: 30_000 },
  { start: 34_000, end: 78_000 },
  { start: 88_000, end: 135_000 },
  { start: 146_000, end: 178_000 },
];

function fmt(ms: number) {
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
}

/** Replay-player chrome: session line above, elapsed / total below. The marker ring reads bg-neutral-900. */
function Player({ title, position, children }: { title: string; position: number; children: React.ReactNode }) {
  return (
    <div className="p-4 w-full max-w-xl">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-neutral-400">
          <span>{title}</span>
          <span className="tabular-nums">{fmt(position)} / {fmt(DURATION)}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Canonical: playhead at 1:05. Grey = active periods, emerald = played; dots are clicks, navigations, typing, a rage click and console errors. */
export function Playing() {
  return (
    <Player title="tomato.gg · Chrome on macOS · Berlin" position={65_000}>
      <ActivitySlider duration={DURATION} activityPeriods={activity} events={session} max={DURATION} step={100} value={[65_000]} />
    </Player>
  );
}

/** Before playback: value 0, the whole rail still shows where the activity is. */
export function AtStart() {
  return (
    <Player title="rybbit.com · Safari on iOS · Toronto" position={0}>
      <ActivitySlider duration={DURATION} activityPeriods={activity} events={session} max={DURATION} step={100} value={[0]} />
    </Player>
  );
}

/** A busy session: 400+ clicks are sampled down to ~160 markers but every navigation, rage click and console event is kept. */
export function Dense() {
  const dense = React.useMemo(() => {
    const extra: typeof session = [];
    for (let i = 0; i < 420; i++) {
      const s = 2 + i * 0.42;
      // Spread clicks across the page so they never collapse into rage clicks.
      extra.push(click(s, 100 + ((i * 137) % 1200), 80 + ((i * 89) % 700)));
    }
    return [...session, ...extra].sort((a, b) => a.timestamp - b.timestamp);
  }, []);
  return (
    <Player title="tomato.gg · Firefox on Windows · São Paulo" position={158_000}>
      <ActivitySlider duration={DURATION} activityPeriods={activity} events={dense} max={DURATION} step={100} value={[158_000]} />
    </Player>
  );
}
