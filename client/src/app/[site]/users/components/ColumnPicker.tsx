"use client";

import { Columns3, Tags } from "lucide-react";
import { useExtracted } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BUILT_IN_COLUMNS, BuiltInColumn, ColumnSelection, toggleBuiltIn, toggleTrait } from "../columns";

// Toggling a column keeps the menu open, so several can be set in one visit.
const keepOpen = (event: Event) => event.preventDefault();

/** Chooses the table's columns: its own, and any of the site's traits. */
export function ColumnPicker({
  selection,
  onChange,
  traitKeys,
  columnLabels,
}: {
  selection: ColumnSelection;
  onChange: (selection: ColumnSelection) => void;
  /** Every trait key the site has, most common first. */
  traitKeys: string[];
  columnLabels: Record<BuiltInColumn, string>;
}) {
  const t = useExtracted();
  // A chosen trait stays listed even if no profile carries it any more, so it can be turned off.
  const traits = [...traitKeys, ...selection.traits.filter(key => !traitKeys.includes(key))];
  const count = selection.builtIn.length + selection.traits.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" className="gap-1.5">
          <Columns3 />
          {t("Columns")}
          <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{count}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[min(28rem,70vh)] w-56 overflow-y-auto">
        <DropdownMenuLabel>{t("Columns")}</DropdownMenuLabel>
        {BUILT_IN_COLUMNS.map(id => (
          <DropdownMenuCheckboxItem
            key={id}
            checked={selection.builtIn.includes(id)}
            onCheckedChange={() => onChange(toggleBuiltIn(selection, id))}
            onSelect={keepOpen}
          >
            {columnLabels[id]}
          </DropdownMenuCheckboxItem>
        ))}
        {traits.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Tags className="h-3.5 w-3.5" />
              {t("Traits")}
            </DropdownMenuLabel>
            {traits.map(key => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={selection.traits.includes(key)}
                onCheckedChange={() => onChange(toggleTrait(selection, key))}
                onSelect={keepOpen}
              >
                <span className="truncate">{key}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
