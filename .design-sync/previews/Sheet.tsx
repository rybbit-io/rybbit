import * as React from "react";
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
} from "@rybbit/ui";

/** Canonical side panel (side="right" is the default), rendered open. Opener is a Button inside SheetTrigger. */
export function SiteSettings() {
  return (
    <Sheet open>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Site settings</SheetTitle>
          <SheetDescription>tomato.gg · created 14 Mar 2025</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-6">
          <div className="grid gap-1.5">
            <Label htmlFor="sheet-domain">Domain</Label>
            <Input id="sheet-domain" defaultValue="tomato.gg" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sheet-name">Display name</Label>
            <Input id="sheet-name" defaultValue="Tomato" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-neutral-800 p-3">
            <div className="grid gap-0.5">
              <span className="text-sm font-medium">Public dashboard</span>
              <span className="text-xs text-neutral-400">Anyone with the link can view stats</span>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-neutral-800 p-3">
            <div className="grid gap-0.5">
              <span className="text-sm font-medium">Session replay</span>
              <span className="text-xs text-neutral-400">Record 10% of sessions</span>
            </div>
            <Switch />
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost">Cancel</Button>
          <Button variant="accent">Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** side="left": a navigation-style panel listing the organization's sites. */
export function SiteSwitcherLeft() {
  const sites = [
    { name: "tomato.gg", visitors: "12.4k", active: true },
    { name: "rybbit.com", visitors: "8.1k", active: false },
    { name: "docs.rybbit.com", visitors: "2.3k", active: false },
    { name: "blog.tomato.gg", visitors: "640", active: false },
  ];
  return (
    <Sheet open>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Tomato Labs</SheetTitle>
          <SheetDescription>4 sites · Pro plan</SheetDescription>
        </SheetHeader>
        <ul className="mt-6 grid gap-1">
          {sites.map(site => (
            <li
              key={site.name}
              className={
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm " +
                (site.active ? "bg-neutral-800 text-neutral-50" : "text-neutral-300")
              }
            >
              <span>{site.name}</span>
              <span className="text-xs text-neutral-400">{site.visitors} / 24h</span>
            </li>
          ))}
        </ul>
        <SheetFooter className="mt-6">
          <Button variant="outline" className="w-full">
            Add a website
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** side="bottom" without the close X: a short action strip for the selected rows. */
export function BulkActionsBottom() {
  return (
    <Sheet open>
      <SheetContent side="bottom" showClose={false}>
        <SheetHeader>
          <SheetTitle>3 sessions selected</SheetTitle>
          <SheetDescription>Export the replays or exclude these visitors from future reports.</SheetDescription>
        </SheetHeader>
        <SheetFooter className="mt-4">
          <Button variant="ghost">Clear selection</Button>
          <Button variant="outline">Exclude visitors</Button>
          <Button variant="accent">Export replays</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
