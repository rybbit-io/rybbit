---
category: Overlays
---

Hover/focus label (Radix Tooltip). Use it to name icon-only buttons and to explain a metric or setting in one or two short lines. It is not interactive: if the content needs a link, a button or more than a couple of sentences, use `Popover` instead. `RybbitTheme` already mounts the required `TooltipProvider`, so never add another.

Parts: `Tooltip` (root; `open` for a controlled state, `delayDuration` default 300ms) → `TooltipTrigger` (`asChild` around the Button or icon) → `TooltipContent` (portalled: `text-xs`, raised neutral surface with a hairline border; props `side="top" | "right" | "bottom" | "left"` (default `top`), `align`, `sideOffset` default 4). `TooltipProvider` is exported but only for apps that opt out of `RybbitTheme`.

Conventions: keep the default `top` unless the trigger sits at a viewport edge. Content is sentence case, no trailing period for a single label. For a two-line explainer, put a `font-medium` heading first and the body in `text-neutral-400`, and cap width with `max-w-56`. Always give icon-only triggers an `aria-label` that matches the tooltip text. The hover-in state cannot be rendered statically; the previews use `open`.

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="icon" aria-label="Site settings">
      <Settings />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Site settings</TooltipContent>
</Tooltip>

<Tooltip>
  <TooltipTrigger asChild>
    <button type="button" aria-label="What is bounce rate?"><Info className="h-3.5 w-3.5" /></button>
  </TooltipTrigger>
  <TooltipContent side="right" align="start" className="max-w-56">
    <p className="font-medium">Bounce rate</p>
    <p className="mt-1 text-neutral-400">Sessions with one pageview and no events.</p>
  </TooltipContent>
</Tooltip>
```
