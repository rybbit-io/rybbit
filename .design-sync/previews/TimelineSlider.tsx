import * as React from "react";
import { Button, TimelineSlider } from "@rybbit/ui";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

const DURATION = 180_000; // 3:00

function fmt(ms: number) {
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
}

/** Canonical: the replay transport bar. The slider is the thin 2px rail between the elapsed and total time. */
export function Playback() {
  const position = 42_000;
  return (
    <div className="p-4 w-full max-w-xl">
      <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
        <Button size="smIcon" variant="ghost" aria-label="Back 10s"><SkipBack /></Button>
        <Button size="smIcon" variant="ghost" aria-label="Pause"><Pause /></Button>
        <Button size="smIcon" variant="ghost" aria-label="Forward 10s"><SkipForward /></Button>
        <span className="text-xs tabular-nums text-neutral-400">{fmt(position)}</span>
        <TimelineSlider className="flex-1" max={DURATION} step={100} value={[position]} />
        <span className="text-xs tabular-nums text-neutral-400">{fmt(DURATION)}</span>
        <span className="text-xs text-neutral-400">1×</span>
      </div>
    </div>
  );
}

/** The rail at 0%, 50% and 100%: the emerald range fills up to the thumb. */
export function Positions() {
  const rows = [
    { label: "Not started", value: 0 },
    { label: "Halfway", value: DURATION / 2 },
    { label: "Finished", value: DURATION },
  ];
  return (
    <div className="p-4 w-full max-w-xl flex flex-col gap-4">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-neutral-400">{r.label}</span>
          <TimelineSlider className="flex-1" max={DURATION} step={100} value={[r.value]} />
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-400">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Disabled while the recording is still loading. Hover/drag scale effects can't be shown statically. */
export function Disabled() {
  return (
    <div className="p-4 w-full max-w-xl">
      <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
        <Button size="smIcon" variant="ghost" aria-label="Play" disabled><Play /></Button>
        <span className="text-xs tabular-nums text-neutral-400">0:00</span>
        <TimelineSlider className="flex-1" max={DURATION} step={100} value={[0]} disabled />
        <span className="text-xs tabular-nums text-neutral-400">Loading…</span>
      </div>
    </div>
  );
}
