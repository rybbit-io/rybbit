---
category: Overlays
---

Touch-first panel built on vaul: slides up from the bottom with a drag handle and swipe-to-dismiss. Use it on mobile layouts for short forms and detail cards (a goal editor, a session summary, a filter list). On desktop prefer `Dialog` or `Sheet`; `ResponsiveDialog` switches between the two for you.

Parts: `Drawer` (root, `open`/`onOpenChange`; `direction="bottom" | "top" | "left" | "right"`, default `bottom`) → `DrawerTrigger` (`asChild` around a Button) → `DrawerContent` (portalled panel with overlay; the drag handle is rendered automatically for `bottom`) → `DrawerHeader` / `DrawerTitle` / `DrawerDescription` → your content → `DrawerFooter` (stacked, full-width actions pushed to the bottom with `mt-auto`). `DrawerClose` wraps any element that should dismiss.

Conventions: header and footer carry their own `p-4`, so pad body content with `px-4` to line up. Footer buttons stack vertically at full width — put the `accent` action first and a `ghost` cancel below it. Bottom drawers center their header text; side drawers (`left`/`right`) behave like a `Sheet` and are capped at `max-w-sm`. Keep bottom drawers under ~60% of the viewport; anything taller belongs in a page.

```tsx
<Drawer>
  <DrawerTrigger asChild><Button variant="accent">New goal</Button></DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>New goal</DrawerTitle>
      <DrawerDescription>Count a conversion whenever a visitor reaches this page.</DrawerDescription>
    </DrawerHeader>
    <div className="grid gap-3 px-4">
      <Label htmlFor="path">Path</Label>
      <Input id="path" defaultValue="/welcome" />
    </div>
    <DrawerFooter>
      <Button variant="accent">Create goal</Button>
      <DrawerClose asChild><Button variant="ghost">Cancel</Button></DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```
