---
category: Overlays
---

Modal dialog (Radix). Compose the flat parts: `Dialog` (root, controls `open`) → `DialogTrigger` (wraps the opener, `asChild` for a Button) → `DialogContent` (portalled panel, 512px max, close X built in; `hideClose` removes it) → `DialogHeader` / `DialogTitle` / `DialogDescription` → body → `DialogFooter` (actions, right-aligned on desktop). `DialogClose` wraps any element that should dismiss. `DialogContentFullScreen` is the edge-to-edge editor surface with no overlay or padding.

Rules of thumb: title in sentence case; description explains the consequence; footer holds a `ghost`/`outline` cancel and ONE `accent` (or `destructive`) confirm. For screen-size-adaptive dialogs use `ResponsiveDialog` (dialog on desktop, drawer on mobile). For a plain confirm/cancel prompt with focus trapping use `AlertDialog`.

```tsx
<Dialog>
  <DialogTrigger asChild><Button variant="accent">Add site</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add a website</DialogTitle>
      <DialogDescription>Enter the domain you want to track.</DialogDescription>
    </DialogHeader>
    <Input placeholder="example.com" />
    <DialogFooter>
      <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
      <Button variant="accent">Add site</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```
