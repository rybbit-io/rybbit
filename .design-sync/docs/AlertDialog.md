---
category: Overlays
---

Focus-trapped confirmation prompt (Radix AlertDialog). Unlike `Dialog`, it has no close X, cannot be dismissed by clicking the overlay, and always ends in a choice. Use it before an irreversible or costly action (delete a site, leave an organization, regenerate a key); use `Dialog` for forms and everything else.

Parts: `AlertDialog` (root, `open`/`onOpenChange`) → `AlertDialogTrigger` (`asChild` around a Button) → `AlertDialogContent` (centered 512px panel) → `AlertDialogHeader` / `AlertDialogTitle` / `AlertDialogDescription` → optional body → `AlertDialogFooter` with `AlertDialogCancel` (already styled as an `outline` Button, closes on click) and `AlertDialogAction` (accepts Button `variant` and `size`; closes on click, so attach the real work to `onClick`).

Conventions: title is a question naming the object ("Delete tomato.gg?"); description states the consequence and whether it can be undone; the cancel label is a verb ("Keep site"), not "No". The action is `variant="destructive"` for deletes and `variant="accent"` for non-destructive confirms. Never put more than two buttons in the footer.

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete site</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete tomato.gg?</AlertDialogTitle>
      <AlertDialogDescription>
        This removes the site and its 2.4M events. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Keep site</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onClick={deleteSite}>Delete site</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```
