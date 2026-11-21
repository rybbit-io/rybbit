---
category: Actions
---

The primary control. Nine visual variants on one shared shape (36px tall, 4.8px radius, 14px medium text, 4px icon gap).

- `accent` — the ONE emerald primary action on a surface ("Add site", "Save", "Publish"). At most one per view.
- `default` — the raised gray chrome button (neutral-850 fill, neutral-750 border in dark). The everyday secondary action.
- `secondary` — one notch quieter than `default` (panel-colored fill).
- `outline` — bordered, transparent; toolbar and filter chrome.
- `ghost` — no border or fill until hover; icon buttons, "Cancel", inline actions.
- `link` — text only with underline on hover; navigation-like actions.
- `success` / `warning` / `destructive` — state-colored actions (emerald, yellow, red). Use for confirmations, never as decoration.

Sizes: `lg` (40px) · `default` (36px) · `sm` (32px) · `xs` (24px) · `icon` (36px square) · `smIcon` (28px square). Put a lucide icon as the first child; the button sizes it to 16px automatically.

`asChild` renders the styles onto the child element (e.g. an `<a>`), keeping one DOM node.

```tsx
<Button variant="accent"><Plus /> New goal</Button>
<Button variant="outline" size="sm">Export CSV</Button>
<Button size="icon" variant="ghost" aria-label="Settings"><Settings /></Button>
```
