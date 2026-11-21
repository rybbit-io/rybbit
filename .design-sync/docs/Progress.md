---
category: Data display
---

Determinate progress / usage meter (Radix Progress). One export, `Progress`: an 8px-tall, fully rounded neutral-800 track with an emerald (`accent-500`) indicator that slides in by `value` percent. Props: `value` (0-100, `undefined` renders empty), `max` (Radix, default 100), `className` on the track. There is no indeterminate mode — for "loading" use `CardLoader` or `Skeleton`.

Conventions: the bar carries no text, so always pair it with a label and a figure. The canonical usage meter is a `flex justify-between text-sm` row (name left, `812K / 1M` in `tabular-nums text-neutral-400` right), the bar, then a 12px muted note. For inline rows (countries, browsers) shrink the track with `h-1.5` and give the bar `flex-1` between a fixed-width name and a right-aligned percentage. Emerald here means "amount used / achieved", not success; do not recolor the indicator per row (chart series use periwinkle in Nivo, not this component). Use `Slider` when the user should change the value.

```tsx
<div className="flex flex-col gap-2">
  <div className="flex items-center justify-between text-sm">
    <span className="font-medium">Events this month</span>
    <span className="tabular-nums text-neutral-400">812K / 1M</span>
  </div>
  <Progress value={81} />
  <div className="text-xs text-muted-foreground">Resets in 9 days · Pro plan</div>
</div>
```
