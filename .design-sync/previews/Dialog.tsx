import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@rybbit/ui";

/** Canonical form dialog, rendered open. In the app the trigger is a Button wrapped in DialogTrigger. */
export function CreateSite() {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a website</DialogTitle>
          <DialogDescription>Enter the domain you want to track. You can add the script afterwards.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" placeholder="example.com" defaultValue="tomato.gg" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost">Cancel</Button>
          <Button variant="accent">Add site</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confirmation with a destructive action and no close button. */
export function ConfirmDelete() {
  return (
    <Dialog open>
      <DialogContent hideClose>
        <DialogHeader>
          <DialogTitle>Delete tomato.gg?</DialogTitle>
          <DialogDescription>
            All 2.4M events and every session replay for this site will be removed. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Keep site</Button>
          <Button variant="destructive">Delete permanently</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
