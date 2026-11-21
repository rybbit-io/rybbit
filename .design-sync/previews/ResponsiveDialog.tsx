import * as React from "react";
import {
  Button,
  Input,
  Label,
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@rybbit/ui";

/** Canonical: at ≥640px this renders as a centered Dialog; below it becomes a bottom Drawer. Rendered open. */
export function InviteMember() {
  return (
    <ResponsiveDialog open>
      <ResponsiveDialogContent className="max-w-md p-6">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Invite a teammate</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>They will get access to every site in Tomato Labs.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" placeholder="name@company.com" defaultValue="mira@tomato.gg" />
          </div>
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </ResponsiveDialogClose>
          <Button variant="accent">Send invite</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/** onlyDrawer forces the mobile presentation (bottom sheet with drag handle) regardless of width. */
export function MobileDrawerVariant() {
  return (
    <ResponsiveDialog open onlyDrawer>
      <ResponsiveDialogContent className="gap-4 px-4 pb-4">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Invite a teammate</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>They will get access to every site in Tomato Labs.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="invite-email-m">Email</Label>
          <Input id="invite-email-m" placeholder="name@company.com" />
        </div>
        <ResponsiveDialogFooter>
          <Button variant="accent">Send invite</Button>
          <ResponsiveDialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </ResponsiveDialogClose>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/** alert mode: no close X, not dismissible by overlay/Escape; the user must pick an action. */
export function AlertMode() {
  return (
    <ResponsiveDialog open alert>
      <ResponsiveDialogContent className="max-w-md p-6">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Regenerate API key?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            The current key for tomato.gg stops working immediately. Update any scripts that use it.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </ResponsiveDialogClose>
          <Button variant="destructive">Regenerate</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
