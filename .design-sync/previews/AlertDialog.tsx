import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rybbit/ui";

/** Canonical destructive confirm, rendered open. In the app the opener is a Button inside AlertDialogTrigger. */
export function DeleteSite() {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete tomato.gg?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the site, its 2.4M events, goals, funnels and every session replay. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep site</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete site</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Non-destructive confirm: the action takes the accent variant. */
export function ClearFilters() {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply the new bot rules?</AlertDialogTitle>
          <AlertDialogDescription>
            Traffic from the 3 flagged ASNs will be excluded from rybbit.com going forward. Historical data is not
            changed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="accent">Apply rules</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Irreversible account-level action with a short consequence list in the body. */
export function LeaveOrganization() {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Tomato Labs?</AlertDialogTitle>
          <AlertDialogDescription>You will lose access to everything in this organization.</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-400">
          <li>4 sites, including tomato.gg and rybbit.com</li>
          <li>Saved segments, goals and funnels you created</li>
          <li>Your organization API keys</li>
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Leave organization</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
