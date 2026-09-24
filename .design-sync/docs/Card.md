---
category: Data display
---

The panel. Every dashboard section, stat tile, and settings block sits in a `Card`: a neutral-900 surface one step off the canvas, 1px neutral-850 border, 4.8px radius, `overflow-hidden`, no shadow. Flat parts, all optional:

- `Card` — the surface (`relative`, so loaders and absolute children anchor to it).
- `CardHeader` — vertical stack with 16px padding; holds `CardTitle` (16px semibold, tight tracking) and `CardDescription` (14px, neutral-400 muted).
- `CardContent` — 16px padding with the top padding removed (`p-4 pt-0`) so it butts against the header. Put your rows, table, or chart here.
- `CardFooter` — horizontal flex row, same padding rule; put `Button`s here (`justify-end gap-2` for an action row, ONE `accent`).
- `CardLoader` — an indeterminate progress bar for "refetching in place". It is `absolute top-0 left-0 w-full` with a -15px top margin, so render it as the first child of a `Card` (or inside any `relative` container) and the card's `overflow-hidden` clips it to a thin line along the top edge. It needs no props; it reads the theme via next-themes and colors itself neutral-400 in dark mode. Use it with `Skeleton` content underneath on first load, or alone over stale data while refetching.

Conventions: stat tiles do not use `CardHeader` — they are a `Card` with `px-3 py-2`, a 12px `text-muted-foreground` label, and a 24px `font-medium` figure (delta in `text-emerald-400` / `text-red-400`). Lists inside `CardContent` use `border-b border-neutral-800` hairlines between rows, not nested cards. Never nest a `Card` in a `Card`.

```tsx
<Card>
  <CardLoader />
  <CardHeader>
    <CardTitle>Top pages</CardTitle>
    <CardDescription>Last 7 days on tomato.gg</CardDescription>
  </CardHeader>
  <CardContent className="flex flex-col gap-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
  </CardContent>
  <CardFooter className="justify-end gap-2">
    <Button variant="ghost" size="sm">Cancel</Button>
    <Button variant="accent" size="sm">Save changes</Button>
  </CardFooter>
</Card>
```
