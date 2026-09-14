---
category: Data display
---

Custom-scrollbar container for any fixed-height list or wide row (Radix ScrollArea, with a touch-device fallback to native scrolling). Parts: `ScrollArea` (root + viewport; already includes a vertical `ScrollBar`, a corner, and an edge-fade mask) and `ScrollBar` (add one with `orientation="horizontal"` as a child when the content is wider than the panel).

`ScrollArea` props beyond Radix's: `viewportClassName` (classes on the scrolling viewport, e.g. `pr-3`), `maskHeight` (px, default 30; `0` disables the fade), `maskClassName`. Radix props pass through — `type="always"` keeps the bar visible, the default (`hover`, `scrollHideDelay={0}`) reveals it only while the pointer is over the area. The mask is a panel-colored (`neutral-900`) gradient that appears only on edges with more content, so it tells the user "there is more" without a visible scrollbar.

Conventions: the root needs a height (`h-64`, `h-[314px]`, or `h-full min-h-0` inside a flex column) or nothing scrolls; put padding on the inner content, not the root, so the mask and bar sit at the true edge. Use it for dashboard lists (countries, pages, bot rows), dialog bodies, and chip rows; use plain `Table` for short lists that fit. Rows inside are ordinary `flex justify-between` lines with `tabular-nums` figures. The mask assumes the panel is `neutral-900`; on the raw canvas set `maskClassName` or `maskHeight={0}`.

```tsx
<ScrollArea className="h-64 rounded-lg border border-neutral-800 bg-neutral-900">
  <div className="flex flex-col p-2 text-sm">
    {countries.map(([name, n]) => (
      <div key={name} className="flex items-center justify-between px-2 py-1.5">
        <span>{name}</span>
        <span className="tabular-nums text-neutral-400">{n.toLocaleString()}</span>
      </div>
    ))}
  </div>
</ScrollArea>

<ScrollArea className="rounded-lg border border-neutral-800">
  <div className="flex w-max gap-2 p-3">{chips}</div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```
