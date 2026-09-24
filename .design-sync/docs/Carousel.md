---
category: Data display
---

Horizontal (or vertical) slide deck driven by Embla, for a row of stat cards, onboarding steps or screenshots that would not fit side by side. In an analytics UI reach for it rarely: a grid or a scrollable row is usually clearer; use a carousel when the slides are peers and only a few need to be visible at once.

Parts: `Carousel` (root, `role="region"`; props `orientation="horizontal" | "vertical"`, `opts` passed straight to Embla, e.g. `{ loop: true, startIndex: 1, align: "start" }`, `plugins`, `setApi` to receive the `CarouselApi` for programmatic scrolling; arrow keys work out of the box) → `CarouselContent` (the overflow-hidden viewport; its inner flex track has a -16px start margin so items are spaced by their own 16px padding) → `CarouselItem` (one slide, `basis-full` by default; set `style={{ flexBasis: "33.3333%" }}` or a `basis-*` class for N-up) → `CarouselPrevious` / `CarouselNext` (32px round `outline` icon buttons, absolutely positioned 48px OUTSIDE the track: `-left-12` / `-right-12`, or above/below and rotated when vertical; they disable themselves at the ends unless `loop` is on). Both buttons accept every `Button` prop, so pass `variant`/`className` to reposition them inside the track if the parent has no gutter.

Conventions: reserve a 64px side gutter in the parent for the arrows; give a vertical `CarouselContent` an explicit height; slides are `Card`s with the stat-tile layout (12px muted label, 24px semibold tabular number, emerald/red delta line). Keep the visible slide count at 1-3.

```tsx
import { Card, CardContent, Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@rybbit/ui";

<div style={{ padding: "16px 64px" }}>
  <Carousel opts={{ align: "start" }}>
    <CarouselContent>
      {stats.map((s) => (
        <CarouselItem key={s.label} style={{ flexBasis: "33.3333%" }}>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs font-medium text-neutral-400">{s.label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</div>
              <div className="mt-1 text-xs text-emerald-400">{s.delta} vs. previous 30 days</div>
            </CardContent>
          </Card>
        </CarouselItem>
      ))}
    </CarouselContent>
    <CarouselPrevious />
    <CarouselNext />
  </Carousel>
</div>
```
