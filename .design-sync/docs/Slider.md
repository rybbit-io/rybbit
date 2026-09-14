---
category: Forms
---

Numeric range control (Radix Slider) for settings that are tuned rather than typed: replay sample rate, session-duration filter, retention window. One component, no sub-parts: `Slider`. Props are Radix's: `defaultValue` / `value` as a number array (one entry per thumb, so `[40]` is a single thumb and `[30, 300]` is a two-thumb range), `onValueChange(values)`, `min` / `max` (default 0-100), `step`, `disabled`, `orientation`. It stretches to `w-full`.

Appearance: a 6px neutral-800 track, the filled range in emerald (`accent-500`), 16px near-black thumbs with a neutral-800 border. There is no built-in value label; pair it with a `Label` and put the current value in a muted `text-sm tabular-nums text-neutral-400` span on the same row. `disabled` blocks interaction but draws the same (Radix puts the disabled state on a span, so the thumb's opacity rule never matches); dim the whole row yourself if the state must read visually. Use `Slider` for approximate values where seeing the position matters; use an `Input type="number"` when the exact figure matters.

```tsx
const [rate, setRate] = React.useState([40]);

<div className="flex items-center justify-between mb-3">
  <Label>Session replay sample rate</Label>
  <span className="text-sm tabular-nums text-neutral-400">{rate[0]}%</span>
</div>
<Slider value={rate} onValueChange={setRate} max={100} step={5} />

// two thumbs = range
<Slider defaultValue={[30, 300]} min={0} max={600} step={10} />
```
