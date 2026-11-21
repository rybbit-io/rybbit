---
category: Overlays
---

One overlay, two presentations: at viewports ≥640px it renders a centered Radix `Dialog`; below that it renders a vaul `Drawer` (bottom sheet with drag handle). Use it for any dialog that also has to work on phones — invite a member, edit a goal, expand a dashboard card. If you only ever need one presentation, use `Dialog`, `Sheet` or `Drawer` directly.

Parts: `ResponsiveDialog` (root; `open`/`onOpenChange`, plus `direction` for the drawer side, `onlyDialog` / `onlyDrawer` to pin a presentation, `dismissible={false}` to block overlay/Escape, `alert` to make it an un-dismissable confirm with no X) → `ResponsiveDialogTrigger` → `ResponsiveDialogContent` (`showCloseButton`, `closeButtonClassName`, `dragHandleClassName`) → `ResponsiveDialogHeader` / `ResponsiveDialogTitle` / `ResponsiveDialogDescription` → body → `ResponsiveDialogFooter` (row on desktop, reversed column on mobile). `ResponsiveDialogClose` wraps a dismissing element. `useResponsiveDialog()` (call inside the root) returns `{ modal, dismissible, direction, onlyDrawer, onlyDialog, alert }` for custom parts.

Conventions: `ResponsiveDialogContent` sets no width or padding, so always pass them — `className="max-w-md p-6"` for a form, `max-w-[1000px] w-[calc(100vw-2rem)] p-4` for a wide card expansion. In drawer mode add `px-4 pb-4` instead. Same footer rule as Dialog: one `accent`/`destructive` confirm, one `ghost`/`outline` cancel.

```tsx
<ResponsiveDialog>
  <ResponsiveDialogTrigger asChild><Button variant="accent">Invite</Button></ResponsiveDialogTrigger>
  <ResponsiveDialogContent className="max-w-md p-6">
    <ResponsiveDialogHeader>
      <ResponsiveDialogTitle>Invite a teammate</ResponsiveDialogTitle>
      <ResponsiveDialogDescription>They get access to every site in Tomato Labs.</ResponsiveDialogDescription>
    </ResponsiveDialogHeader>
    <Input placeholder="name@company.com" />
    <ResponsiveDialogFooter>
      <ResponsiveDialogClose asChild><Button variant="ghost">Cancel</Button></ResponsiveDialogClose>
      <Button variant="accent">Send invite</Button>
    </ResponsiveDialogFooter>
  </ResponsiveDialogContent>
</ResponsiveDialog>
```
