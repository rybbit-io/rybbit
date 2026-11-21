---
category: Forms
---

Radix toggle for a single setting that takes effect immediately (session replay on/off, public dashboard, live mode). Track is 36×20px with a 16px white thumb: emerald (`accent-500`) when on, `neutral-800` when off, 50% opacity when disabled. Use `Checkbox` when the choice is submitted with a form or is one of many, and `RadioGroup` for mutually exclusive options.

Parts: `Switch` only (thumb is internal). Props: `checked` / `defaultChecked`, `onCheckedChange`, `disabled`, `id`, `name`, `className`. It carries the `peer` class, so a following `Label` fades automatically when the switch is disabled.

Conventions:
- Inline: `flex items-center gap-2` with the `Switch` first, then `Label htmlFor`.
- Settings list (the common case): rows of `flex items-center justify-between gap-4 px-4 py-3` inside a `divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900` panel; label + `text-xs text-neutral-400` description on the left, switch on the right.
- One switch per row; never stack switches horizontally. Keep the label a noun phrase ("Web vitals"), not a verb.
- Hover/pressed transitions are not shown in previews.

```tsx
<div className="flex items-center justify-between gap-4 px-4 py-3">
  <div className="grid gap-0.5">
    <Label htmlFor="replay">Session replay</Label>
    <p className="text-xs text-neutral-400">Record sessions for the last 7 days.</p>
  </div>
  <Switch id="replay" defaultChecked />
</div>
```
