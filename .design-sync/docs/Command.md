---
category: Overlays
---

Searchable command list built on cmdk. Typing in `CommandInput` filters `CommandItem`s by their text (or `value` / `keywords`), arrow keys move the highlight, Enter fires `onSelect`. Use it for the ⌘K palette, site switchers, and any pick-from-many list that needs a search box; for a plain menu of actions use `DropdownMenu`, and for a form value use `Select`.

Parts: `Command` (root; transparent background, so wrap it in your own panel such as `rounded-lg border border-neutral-800 bg-neutral-900`, or use `CommandDialog`) → `CommandInput` (search icon + input, hairline bottom border; `placeholder`, `value` / `onValueChange`) → `CommandList` (scroll container capped at 300px) containing `CommandEmpty` (shown only when nothing matches), `CommandGroup` (`heading` renders a small muted label), `CommandItem` (`value`, `keywords`, `onSelect`, `disabled`; highlighted row is a raised neutral), `CommandShortcut` (right-aligned key hint) and `CommandSeparator`. `CommandDialog` wraps the same children in a `Dialog` (`open` / `onOpenChange`, `title` / `description` for screen readers, `showCloseButton`) with taller 48px rows.

Conventions: put a 16px lucide icon with `mr-2 size-4 text-neutral-400` before item text; group by kind (Sites / Go to / Actions) with a separator between groups; keep the first item selected by default (cmdk does this). Keyboard navigation and the filtered state are live behaviors and are not shown statically.

```tsx
<CommandDialog open={open} onOpenChange={setOpen} title="Command palette">
  <CommandInput placeholder="Search sites, pages, or commands…" />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Sites">
      <CommandItem onSelect={() => go("/tomato.gg")}>
        <Globe className="mr-2 size-4 text-neutral-400" /> tomato.gg
      </CommandItem>
    </CommandGroup>
    <CommandSeparator />
    <CommandGroup heading="Go to">
      <CommandItem>
        <Users className="mr-2 size-4 text-neutral-400" /> Sessions
        <CommandShortcut>⌘2</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```
