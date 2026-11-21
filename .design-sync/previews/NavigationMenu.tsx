import * as React from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@rybbit/ui";

const reports = [
  { title: "Overview", desc: "Visitors, pageviews, bounce rate and top pages at a glance." },
  { title: "Sessions", desc: "Every visit as a timeline, with replay when it is enabled." },
  { title: "Goals", desc: "Conversions on a path or a custom event." },
  { title: "Funnels", desc: "Drop-off between the steps you define." },
];

function ReportLink({ title, desc }: { title: string; desc: string }) {
  return (
    <NavigationMenuLink asChild>
      <a href="#" className="block rounded-md p-3 hover:bg-neutral-800">
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-1 text-xs text-neutral-400">{desc}</p>
      </a>
    </NavigationMenuLink>
  );
}

/** Top nav with one trigger forced open via `value`; the content panel drops from the bar. */
export function TopNavOpen() {
  return (
    <div className="p-4" style={{ minHeight: 360 }}>
      <NavigationMenu value="reports">
        <NavigationMenuList>
          <NavigationMenuItem value="reports">
            <NavigationMenuTrigger>Reports</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid w-[400px] gap-1 p-2">
                {reports.map((r) => (
                  <ReportLink key={r.title} {...r} />
                ))}
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem value="settings">
            <NavigationMenuTrigger>Settings</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="w-[300px] p-2">
                <ReportLink title="Site settings" desc="Domain, tracking, exclusions." />
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>
              Docs
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

/** The resting bar: two triggers closed and a plain link styled with navigationMenuTriggerStyle(). */
export function TopNavClosed() {
  return (
    <div className="p-4">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Reports</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="w-[300px] p-2">
                <ReportLink title="Overview" desc="Visitors and pageviews at a glance." />
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Settings</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="w-[300px] p-2">
                <ReportLink title="Site settings" desc="Domain, tracking, exclusions." />
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>
              Docs
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>
              Changelog
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
