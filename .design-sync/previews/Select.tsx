import * as React from "react";
import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@rybbit/ui";

/** Canonical single-value select, rendered OPEN so the list shows. A value is chosen (emerald check). */
export function TimeRangeOpen() {
  return (
    <div className="p-4 w-72">
      <Label className="mb-1.5 block">Time range</Label>
      <Select open defaultValue="7d">
        <SelectTrigger>
          <SelectValue placeholder="Pick a range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="24h">Last 24 hours</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectSeparator />
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Grouped items with SelectLabel headings, small size, rendered open. */
export function GroupedSmallOpen() {
  return (
    <div className="p-4 w-72">
      <Select open defaultValue="tomato.gg">
        <SelectTrigger size="sm">
          <SelectValue placeholder="Choose a site" />
        </SelectTrigger>
        <SelectContent size="sm">
          <SelectGroup>
            <SelectLabel size="sm">Acme</SelectLabel>
            <SelectItem size="sm" value="tomato.gg">tomato.gg</SelectItem>
            <SelectItem size="sm" value="rybbit.com">rybbit.com</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel size="sm">Personal</SelectLabel>
            <SelectItem size="sm" value="blog.example.dev">blog.example.dev</SelectItem>
            <SelectItem size="sm" value="staging" disabled>staging.rybbit.dev (no data)</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Closed triggers: placeholder, filled, small, and disabled. */
export function TriggerStates() {
  return (
    <div className="p-4 w-72 flex flex-col gap-3">
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a goal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="signup">Signup completed</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="chrome">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="chrome">Chrome</SelectItem>
          <SelectItem value="safari">Safari</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="visitors">
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent size="sm">
          <SelectItem size="sm" value="visitors">Visitors</SelectItem>
          <SelectItem size="sm" value="pageviews">Pageviews</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="utc" disabled>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="utc">UTC</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
