import * as React from "react";
import { Badge } from "@rybbit/ui";
import { Bot, Globe } from "lucide-react";

/** All eight variants. Colored variants are 20% tints with a matching 400-level text color. */
export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
    </div>
  );
}

/** The statuses Rybbit actually shows: site health, traffic classification, plan. */
export function Statuses() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <Badge variant="success">Tracking</Badge>
      <Badge variant="warning">No data</Badge>
      <Badge variant="destructive">Bot</Badge>
      <Badge variant="info">Beta</Badge>
      <Badge variant="default">Pro</Badge>
      <Badge variant="secondary">Free</Badge>
      <Badge variant="outline">Self-hosted</Badge>
    </div>
  );
}

/** Icons and counts sit inline: a 12px lucide icon before the label, numbers in tabular figures. */
export function WithIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <Badge variant="destructive" className="gap-1"><Bot className="h-3 w-3" /> Bot</Badge>
      <Badge variant="info" className="gap-1"><Globe className="h-3 w-3" /> 42 countries</Badge>
      <Badge variant="secondary" className="tabular-nums">2,140</Badge>
      <Badge variant="outline" className="font-mono">/pricing</Badge>
    </div>
  );
}

/** Badges next to text at their real size (12px text, 2px/6px padding) — a site row. */
export function InRow() {
  return (
    <div className="flex w-full max-w-md flex-col rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm">
      <div className="flex items-center justify-between border-b border-neutral-800 py-2">
        <span className="font-medium">tomato.gg</span>
        <Badge variant="success">Tracking</Badge>
      </div>
      <div className="flex items-center justify-between border-b border-neutral-800 py-2">
        <span className="font-medium">rybbit.com</span>
        <Badge variant="success">Tracking</Badge>
      </div>
      <div className="flex items-center justify-between py-2">
        <span className="font-medium">staging.rybbit.dev</span>
        <Badge variant="warning">No data</Badge>
      </div>
    </div>
  );
}
