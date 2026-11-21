---
category: Data display
---

Small inline status label: 12px medium text, 2px/6px padding, 2.8px radius (`rounded-md`), inline-flex. One export, `Badge`, with a `variant` prop; it renders a `div`, so it is not clickable — wrap it or use a `Button size="xs"` when it must act.

Variants:
- `default` — neutral-800 fill, neutral-100 text. Plan names, generic labels ("Pro").
- `secondary` — one notch quieter (panel fill, neutral-300 text). Counts and low-emphasis tags.
- `success` — emerald 20% tint, emerald-400 text. "Tracking", "Enabled", "Verified".
- `warning` — yellow tint. "No data", "Paused", thresholds.
- `destructive` — red tint. "Bot", "Blocked", "Failed".
- `info` — blue tint. "Beta", "New", informational only (never for data-series color).
- `outline` — neutral-700 border, transparent fill. Environment / category tags.
- `ghost` — no border or fill. Inline keywords.

Conventions: colored variants are semantic, so use them only when the state has that meaning — a status column is the canonical place. Put a 12px lucide icon (`className="h-3 w-3"`) as the first child and add `gap-1`; add `tabular-nums` for counts and `font-mono` for paths. Badges do not change size; if you need a larger pill, it is a `Button`.

```tsx
<Badge variant="success">Tracking</Badge>
<Badge variant="warning">No data</Badge>
<Badge variant="destructive" className="gap-1"><Bot className="h-3 w-3" /> Bot</Badge>
<Badge variant="secondary" className="tabular-nums">2,140</Badge>
```
