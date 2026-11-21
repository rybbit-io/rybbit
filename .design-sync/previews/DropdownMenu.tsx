import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@rybbit/ui";
import { ChevronDown, Code, Copy, Download, Settings, Trash2 } from "lucide-react";

/** Canonical site actions menu, rendered open. The trigger is a Button-styled DropdownMenuTrigger. */
export function SiteActions() {
  return (
    <div className="p-4">
      <DropdownMenu open>
        <DropdownMenuTrigger variant="outline" size="sm">
          tomato.gg <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>tomato.gg</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Code /> Tracking script
              <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy /> Copy site ID
              <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings /> Site settings
              <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Download /> Export events
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-400 focus:text-red-400">
            <Trash2 /> Delete site
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Checkbox items toggle table columns; a radio group picks one value. Emerald indicators mark selection. */
export function ColumnsAndRange() {
  return (
    <div className="p-4">
      <DropdownMenu open>
        <DropdownMenuTrigger variant="outline" size="sm">
          Columns <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Show columns</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked>Visitors</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked>Pageviews</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Bounce rate</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked>Avg. time</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem disabled>Revenue</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Time range</DropdownMenuLabel>
          <DropdownMenuRadioGroup value="7d">
            <DropdownMenuRadioItem value="24h">Last 24 hours</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="7d">Last 7 days</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="30d">Last 30 days</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** A nested sub-menu (DropdownMenuSub) rendered open to the right of its trigger row. */
export function WithSubmenu() {
  return (
    <div className="p-4">
      <DropdownMenu open>
        <DropdownMenuTrigger variant="outline" size="sm">
          Export <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem>
            <Copy /> Copy link to report
          </DropdownMenuItem>
          <DropdownMenuSub open>
            <DropdownMenuSubTrigger>
              <Download /> Download as
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>CSV</DropdownMenuItem>
              <DropdownMenuItem>JSON</DropdownMenuItem>
              <DropdownMenuItem>Parquet</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Schedule weekly email</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
