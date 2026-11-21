---
category: Replay
---

The minimal playback rail of the session-replay transport bar: a 2px neutral-800 track, an emerald (`accent-500`) played range and a 10px emerald-300 thumb that scales up on hover and shows a grab cursor. Use it for any "position in time" control (replay progress, a funnel-step scrubber); use `Slider` for a value input with a visible track height, and `ActivitySlider` when the rail should also plot events and activity.

Single part: `TimelineSlider`, a thin wrapper over Radix `Slider.Root`, so the whole Radix API applies: `value` / `defaultValue` as a one-element array in the unit you choose (milliseconds for replay), `max` (the duration), `min`, `step`, `onValueChange`, `onValueCommit` (seek on release), `disabled`, `orientation`. Pass `className="flex-1"` so it fills the space between the elapsed and total times.

Conventions: sit it in a `flex items-center gap-3` bar on a neutral-900 panel with ghost `smIcon` transport buttons on the left, `m:ss` elapsed and total in 12px muted tabular figures on either side, and a playback-rate label at the end. Hover/active scaling can't be rendered statically. The thumb hue is the only chromatic element on the bar; everything else stays neutral.

```tsx
import { Button, TimelineSlider } from "@rybbit/ui";
import { Pause } from "lucide-react";

<div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
  <Button size="smIcon" variant="ghost" aria-label="Pause"><Pause /></Button>
  <span className="text-xs tabular-nums text-neutral-400">0:42</span>
  <TimelineSlider
    className="flex-1"
    max={duration}
    step={100}
    value={[currentTime]}
    onValueChange={([t]) => setCurrentTime(t)}
    onValueCommit={([t]) => player.seek(t)}
  />
  <span className="text-xs tabular-nums text-neutral-400">3:00</span>
</div>
```
