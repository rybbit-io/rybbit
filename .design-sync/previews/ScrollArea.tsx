import * as React from "react";
import { Badge, ScrollArea, ScrollBar } from "@rybbit/ui";

const countries = [
  ["United States", 8412],
  ["Germany", 3120],
  ["United Kingdom", 2874],
  ["Japan", 1990],
  ["France", 1732],
  ["Canada", 1518],
  ["Brazil", 1204],
  ["India", 1188],
  ["Netherlands", 962],
  ["Australia", 901],
  ["Spain", 844],
  ["Sweden", 610],
  ["Poland", 577],
  ["South Korea", 542],
  ["Italy", 498],
] as const;

/** A fixed-height list that overflows. `type="always"` keeps the bar visible here; the app default reveals it on hover. */
export function CountryList() {
  return (
    <div className="w-full max-w-md p-4">
      <ScrollArea type="always" className="h-64 rounded-lg border border-neutral-800 bg-neutral-900">
        <div className="flex flex-col p-2 text-sm">
          {countries.map(([name, n]) => (
            <div key={name} className="flex items-center justify-between rounded-md px-2 py-1.5">
              <span>{name}</span>
              <span className="tabular-nums text-neutral-400">{n.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/** Edge fade: the built-in mask (30px, panel-colored) marks the overflow edges. `maskHeight={0}` disables it. */
export function WithoutMask() {
  return (
    <div className="w-full max-w-md p-4">
      <ScrollArea type="always" maskHeight={0} className="h-48 rounded-lg border border-neutral-800 bg-neutral-900">
        <div className="flex flex-col p-2 text-sm">
          {countries.slice(0, 10).map(([name, n]) => (
            <div key={name} className="flex items-center justify-between px-2 py-1.5">
              <span>{name}</span>
              <span className="tabular-nums text-neutral-400">{n.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/** Horizontal overflow: a row of session-event chips wider than the panel, with an explicit horizontal ScrollBar. */
export function HorizontalChips() {
  const events = [
    "pageview /",
    "pageview /pricing",
    "click #signup-cta",
    "pageview /signup",
    "form_submit signup",
    "pageview /onboarding",
    "custom add_site",
    "pageview /tomato.gg",
    "click #install-docs",
    "pageview /docs/script",
  ];
  return (
    <div className="w-full max-w-md p-4">
      <ScrollArea type="always" className="rounded-lg border border-neutral-800 bg-neutral-900">
        <div className="flex w-max items-center gap-2 p-3 pb-4">
          {events.map((e) => (
            <Badge key={e} variant="secondary" className="whitespace-nowrap font-mono">
              {e}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
