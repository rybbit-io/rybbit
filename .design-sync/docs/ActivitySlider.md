---
category: Replay
---

The session-replay scrubber: a Radix slider whose track shows where the visitor was active and whose rail above it plots the meaningful events (clicks, navigations, typing, rage clicks, console errors) as colored 8px dots, so you can jump straight to the interesting moment. It is the "activity" view of the replay player; `TimelineSlider` is the plain thin transport rail used when there is no event data.

Single part: `ActivitySlider`. It extends every Radix `Slider.Root` prop (`value`/`defaultValue` as `[ms]`, `max`, `step`, `onValueChange`, `disabled`) plus three of its own:
- `duration` (ms, the recording length; ALSO pass it as `max` so the thumb and the rail agree),
- `activityPeriods` (`{ start, end }[]` in ms; drawn as neutral-600 segments on the neutral-700 idle track),
- `events` (raw rrweb events `{ timestamp, type, data }`; the slider runs them through `getMeaningfulEvents` from the replay module, so feed it what the player already has: type 4 Meta for session start/navigation, type 3 source 2 for clicks, source 5 for input, type 6 console plugin for logs).

Marker hues: navigation/console log blue-400, click/double click violet-500, right click fuchsia-500, rage click red-500, typing amber-500, resize cyan-500, console warning yellow-500, console error red-500. Each dot has a 2px ring in the panel color (`ring-neutral-900` in dark) so overlapping dots stay distinct, and its `title` shows the label and offset on hover (not capturable statically). Over 160 markers the plain clicks/typing are sampled while every navigation, rage click and console event is kept. The played portion of the track is emerald (`accent-500`); the thumb is a 16px white disc with an emerald border.

Conventions: mount it inside the player card (neutral-900) with the session identity on the left and `m:ss / m:ss` on the right in 12px muted tabular figures; drive `value` from the player's current time.

```tsx
import { ActivitySlider } from "@rybbit/ui";

<ActivitySlider
  duration={duration}
  max={duration}
  step={100}
  value={[currentTime]}
  onValueChange={([t]) => player.seek(t)}
  activityPeriods={[{ start: 0, end: 30_000 }, { start: 34_000, end: 78_000 }]}
  events={rrwebEvents}
/>
```
