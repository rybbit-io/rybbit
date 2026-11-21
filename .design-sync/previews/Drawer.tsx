import * as React from "react";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
} from "@rybbit/ui";

/** Canonical bottom drawer (vaul), rendered open with the drag handle. Opener is a Button inside DrawerTrigger. */
export function CreateGoal() {
  return (
    <div className="min-h-screen">
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>New goal</DrawerTitle>
            <DrawerDescription>Count a conversion whenever a visitor reaches this page.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-3 px-4">
            <div className="grid gap-1.5">
              <Label htmlFor="goal-name">Goal name</Label>
              <Input id="goal-name" defaultValue="Signup complete" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-path">Path</Label>
              <Input id="goal-path" defaultValue="/welcome" />
            </div>
          </div>
          <DrawerFooter>
            <Button variant="accent">Create goal</Button>
            <Button variant="ghost">Cancel</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/** Bottom drawer used as a detail card: a visitor's session summary with a single action. */
export function SessionSummary() {
  const rows = [
    ["Country", "Germany"],
    ["Browser", "Firefox 130"],
    ["Entry page", "/pricing"],
    ["Pages", "6"],
    ["Duration", "4m 12s"],
  ];
  return (
    <div className="min-h-screen">
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Session 8f3a21</DrawerTitle>
            <DrawerDescription>tomato.gg · 14 minutes ago</DrawerDescription>
          </DrawerHeader>
          <dl className="grid gap-2 px-4 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <dt className="text-neutral-400">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <DrawerFooter>
            <Button variant="accent">Watch replay</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/** direction="right": the same parts as a side panel (no drag handle is rendered for side drawers). */
export function FiltersRight() {
  const filters = ["Country is Germany", "Browser is Firefox", "Path starts with /pricing"];
  return (
    <div className="min-h-screen">
      <Drawer open direction="right">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerDescription>3 active on rybbit.com</DrawerDescription>
          </DrawerHeader>
          <ul className="grid gap-2 px-4 text-sm">
            {filters.map(f => (
              <li key={f} className="rounded-lg border border-neutral-800 px-3 py-2">
                {f}
              </li>
            ))}
          </ul>
          <DrawerFooter>
            <Button variant="accent">Apply</Button>
            <Button variant="ghost">Clear all</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
