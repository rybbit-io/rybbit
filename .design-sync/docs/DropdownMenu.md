---
category: Overlays
---

Contextual action menu (Radix) that opens from a trigger and closes on select or outside click. Use it for per-row/per-site actions, column toggles, and quick single-choice settings; use `Select` when the value is a form field, and `Popover` when the content is not a list of commands.

Parts: `DropdownMenu` (root, `open` / `onOpenChange`) → `DropdownMenuTrigger` (renders as a Button and accepts Button `variant` / `size`; pass `asChild` to supply your own element, or `unstyled` to opt out of button styling) → `DropdownMenuContent` (portalled panel, `align="start" | "end"`, `sideOffset` 4 by default; give it a width like `className="w-56"`). Inside: `DropdownMenuLabel` (section heading), `DropdownMenuGroup`, `DropdownMenuItem` (a leading lucide icon is auto-sized to 16px; `inset` indents to align with checkbox rows; `disabled` dims it), `DropdownMenuShortcut` (right-aligned key hint), `DropdownMenuSeparator`, `DropdownMenuCheckboxItem` (`checked` / `onCheckedChange`, emerald check indicator), `DropdownMenuRadioGroup` + `DropdownMenuRadioItem` (`value`, emerald dot), and `DropdownMenuSub` + `DropdownMenuSubTrigger` (chevron built in) + `DropdownMenuSubContent` for a nested level. `DropdownMenuPortal` is only needed when you portal sub-content yourself.

Conventions: one label per section, separators between sections, the destructive action last and colored with `text-red-400`. Keep menus to ~8 rows; put value pickers with many options in `Select`. Hover/focus highlight is a raised neutral, never emerald: emerald appears only on the check/radio indicator.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger variant="outline" size="sm">
    tomato.gg <ChevronDown className="size-4" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="w-56">
    <DropdownMenuLabel>tomato.gg</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Settings /> Site settings
      <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuCheckboxItem checked>Show bounce rate</DropdownMenuCheckboxItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-red-400 focus:text-red-400">
      <Trash2 /> Delete site
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```
