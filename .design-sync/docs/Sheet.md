---
category: Overlays
---

Edge-anchored panel that slides in over a dimmed page (Radix Dialog under the hood). Use it for secondary work that keeps the page in context: site settings, a site switcher, a filter editor, a bulk-action strip. For a centered task use `Dialog`; for a touch-first bottom panel with drag-to-dismiss use `Drawer`.

Parts: `Sheet` (root, `open`/`onOpenChange`) → `SheetTrigger` (`asChild` around a Button) → `SheetContent` (portalled panel; `side="right" | "left" | "top" | "bottom"`, default `right`; `showClose={false}` hides the built-in X) → `SheetHeader` / `SheetTitle` / `SheetDescription` → your content → `SheetFooter` (right-aligned actions). `SheetClose` wraps any element that should dismiss.

Conventions: `right` is the default and the one to reach for; `left` reads as navigation; `bottom`/`top` are full-width strips, so keep them short (a title line plus actions). Side panels are `w-3/4` capped at `max-w-sm` (384px), so lay the body out as a single column with `grid gap-4 py-6`. Footer holds one `accent` confirm plus a `ghost`/`outline` cancel. Group settings rows as bordered cards (`rounded-lg border border-neutral-800 p-3`) with a `Switch` on the right.

```tsx
<Sheet>
  <SheetTrigger asChild><Button variant="outline">Settings</Button></SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Site settings</SheetTitle>
      <SheetDescription>tomato.gg</SheetDescription>
    </SheetHeader>
    <div className="grid gap-4 py-6">
      <div className="grid gap-1.5">
        <Label htmlFor="domain">Domain</Label>
        <Input id="domain" defaultValue="tomato.gg" />
      </div>
    </div>
    <SheetFooter>
      <SheetClose asChild><Button variant="ghost">Cancel</Button></SheetClose>
      <Button variant="accent">Save changes</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```
