---
category: Overlays
---

Non-modal floating panel anchored to a trigger (Radix Popover). Use it for small, focused controls that belong next to the thing they change: date-range presets, a filter's value picker, the site selector, a one-paragraph explanation. Use `DropdownMenu` for a list of commands, `Tooltip` for a label that needs no interaction, and `Dialog` for anything that needs a title and footer.

Parts: `Popover` (root, `open`/`onOpenChange`) → `PopoverTrigger` (`asChild` around a Button) → `PopoverContent` (portalled panel: `w-72 p-4 rounded-md`, raised neutral surface; props `align="start" | "center" | "end"` (default `center`), `side`, `sideOffset` (default 4), `onOpenAutoFocus`). `PopoverAnchor` positions the panel against an element other than the trigger.

Conventions: prefer `align="start"` so the panel lines up with the trigger's left edge. Override width per use (`w-64`, `w-80`, or `w-[var(--radix-popover-trigger-width)]` to match the trigger); pass `p-0` when the content is a `Command` list or a `Calendar`. Inside, use `text-sm`, muted labels in `text-xs text-neutral-400`, and a right-aligned `size="sm"` action row. Inputs inside inherit a slightly lighter border automatically.

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm"><CalendarIcon /> Last 7 days</Button>
  </PopoverTrigger>
  <PopoverContent align="start" className="w-64">
    <div className="grid gap-1">
      {["Today", "Last 7 days", "Last 30 days"].map(p => (
        <button key={p} className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-700/60">{p}</button>
      ))}
    </div>
    <Separator className="my-3 dark:bg-neutral-700" />
    <div className="grid grid-cols-2 gap-2">
      <Input defaultValue="2026-09-06" className="h-8 text-xs" />
      <Input defaultValue="2026-09-13" className="h-8 text-xs" />
    </div>
  </PopoverContent>
</Popover>
```
