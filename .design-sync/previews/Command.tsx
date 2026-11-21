import * as React from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@rybbit/ui";
import { Filter, Globe, LayoutDashboard, Target, Users } from "lucide-react";

/** CommandList caps at 300px and scrolls; `compact` keeps the dialog's taller rows inside that cap. */
function PaletteItems({ compact }: { compact?: boolean }) {
  return (
    <>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Sites">
        <CommandItem>
          <Globe className="mr-2 size-4 text-neutral-400" /> tomato.gg
        </CommandItem>
        <CommandItem>
          <Globe className="mr-2 size-4 text-neutral-400" /> rybbit.com
        </CommandItem>
        {compact ? null : (
          <CommandItem>
            <Globe className="mr-2 size-4 text-neutral-400" /> staging.rybbit.dev
          </CommandItem>
        )}
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Go to">
        <CommandItem>
          <LayoutDashboard className="mr-2 size-4 text-neutral-400" /> Overview
          <CommandShortcut>⌘1</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <Users className="mr-2 size-4 text-neutral-400" /> Sessions
          <CommandShortcut>⌘2</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <Target className="mr-2 size-4 text-neutral-400" /> Goals
          <CommandShortcut>⌘3</CommandShortcut>
        </CommandItem>
        {compact ? null : (
          <CommandItem>
            <Filter className="mr-2 size-4 text-neutral-400" /> Funnels
            <CommandShortcut>⌘4</CommandShortcut>
          </CommandItem>
        )}
      </CommandGroup>
    </>
  );
}

/** Inline command palette inside a panel: input, grouped items with icons, separators, shortcuts. */
export function Palette() {
  return (
    <div className="p-4">
      <div className="w-[400px] rounded-lg border border-neutral-800 bg-neutral-900">
        <Command>
          <CommandInput placeholder="Search sites, pages, or commands…" />
          <CommandList>
            <PaletteItems />
          </CommandList>
        </Command>
      </div>
    </div>
  );
}

/** A typed query with no matches shows CommandEmpty. cmdk filters items by the input value. */
export function NoResults() {
  return (
    <div className="p-4">
      <div className="w-[400px] rounded-lg border border-neutral-800 bg-neutral-900">
        <Command>
          <CommandInput placeholder="Search sites, pages, or commands…" value="checkout funnel v2" />
          <CommandList>
            <PaletteItems />
          </CommandList>
        </Command>
      </div>
    </div>
  );
}

/** The ⌘K modal: CommandDialog wraps the same parts in a Dialog with larger rows. */
export function PaletteDialog() {
  return (
    <CommandDialog open title="Command palette" description="Jump to a site, page, or action">
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <PaletteItems compact />
      </CommandList>
    </CommandDialog>
  );
}
