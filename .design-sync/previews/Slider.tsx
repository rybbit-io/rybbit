import * as React from "react";
import { Label, Slider } from "@rybbit/ui";

/** Canonical single-thumb slider with a label and the current value read out beside it. */
export function SampleRate() {
  return (
    <div className="p-4 w-96">
      <div className="flex items-center justify-between mb-3">
        <Label>Session replay sample rate</Label>
        <span className="text-sm tabular-nums text-neutral-400">40%</span>
      </div>
      <Slider defaultValue={[40]} max={100} step={5} />
    </div>
  );
}

/** Two thumbs make a range; the emerald fill spans between them. */
export function DurationRange() {
  return (
    <div className="p-4 w-96">
      <div className="flex items-center justify-between mb-3">
        <Label>Session duration</Label>
        <span className="text-sm tabular-nums text-neutral-400">30s – 5m</span>
      </div>
      <Slider defaultValue={[30, 300]} min={0} max={600} step={10} />
    </div>
  );
}

/** Edge values and disabled. */
export function States() {
  return (
    <div className="p-4 w-96 flex flex-col gap-6">
      <div>
        <Label className="mb-3 block">Empty (0)</Label>
        <Slider defaultValue={[0]} max={100} />
      </div>
      <div>
        <Label className="mb-3 block">Full (100)</Label>
        <Slider defaultValue={[100]} max={100} />
      </div>
      <div>
        <Label className="mb-3 block">Disabled</Label>
        <Slider defaultValue={[65]} max={100} disabled />
      </div>
    </div>
  );
}
