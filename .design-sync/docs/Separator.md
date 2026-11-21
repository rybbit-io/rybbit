---
category: Data display
---

A 1px hairline (Radix Separator) in neutral-800, the same tone as table row borders. One export, `Separator`. Props: `orientation` (`"horizontal"` default → `h-[1px] w-full`; `"vertical"` → `h-full w-[1px]`), `decorative` (default `true`, so it is hidden from assistive tech; set `false` only when the division is semantic), and `className` for margins or an explicit height.

Conventions: horizontal separators divide text blocks inside a `Card` or settings page — give them vertical breathing room with `my-4` (or `my-3` in dense lists). Between list rows prefer `border-b border-neutral-800` on the row itself rather than a `Separator` per row. A vertical separator is `h-full`, so its parent must have a height: either make the row a fixed-height flex container (`flex h-4 items-center`) or set the height directly (`className="h-5"`) when dividing toolbar button groups. Do not use separators as decoration between every element; the grayscale ramp and spacing should do most of the dividing.

```tsx
<div className="text-sm font-medium">Tracking script</div>
<Separator className="my-4" />
<div className="text-sm font-medium">Data retention</div>

<div className="flex h-9 items-center gap-2">
  <Button variant="ghost" size="sm">Filter</Button>
  <Separator orientation="vertical" className="h-5" />
  <Button variant="ghost" size="sm">Export</Button>
</div>
```
