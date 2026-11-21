"use client";

import type { DashboardVizType } from "@rybbit/shared";
import {
  AreaChart,
  BarChart3,
  BarChartHorizontal,
  CalendarDays,
  Hash,
  LineChart,
  Map as MapIcon,
  PieChart,
  Plus,
  Table2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { DASHBOARD_EXAMPLES, DASHBOARD_EXAMPLE_CATEGORIES, type DashboardExample } from "../examples";

type NewCardDialogProps = {
  open: boolean;
  onClose: () => void;
  /** A preset to seed the card from, or null to start blank. */
  onSelect: (example: DashboardExample | null) => void;
};

const VIZ_ICON: Record<DashboardVizType, typeof LineChart> = {
  line: LineChart,
  area: AreaChart,
  bar: BarChart3,
  hbar: BarChartHorizontal,
  pie: PieChart,
  stat: Hash,
  table: Table2,
  map: MapIcon,
  calendar: CalendarDays,
};

// Terms that should keep the "Blank card" option visible while searching.
const BLANK_TERMS = ["blank", "empty", "scratch", "custom", "new"];

// Flat rows, no per-item borders: a command-palette list, not a card grid. The
// chart-type icon stays neutral (periwinkle is for data, never chrome).
const ROW_CLASS =
  "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:hover:bg-neutral-900 dark:focus-visible:bg-neutral-900";
const ICON_CLASS =
  "h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300";

function PresetRow({ example, onSelect }: { example: DashboardExample; onSelect: () => void }) {
  const Icon = VIZ_ICON[example.vizType];
  return (
    <button type="button" onClick={onSelect} title={example.description} className={ROW_CLASS}>
      <Icon className={ICON_CLASS} />
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 text-sm font-medium text-neutral-900 dark:text-neutral-100">{example.title}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">{example.description}</span>
      </span>
      {example.beyondPrebuilt && (
        <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          Advanced
        </span>
      )}
    </button>
  );
}

export function NewCardDialog({ open, onClose, onSelect }: NewCardDialogProps) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return DASHBOARD_EXAMPLES;
    return DASHBOARD_EXAMPLES.filter(
      example =>
        example.title.toLowerCase().includes(q) ||
        example.description.toLowerCase().includes(q) ||
        example.category.toLowerCase().includes(q)
    );
  }, [q]);

  const showBlank = !q || BLANK_TERMS.some(term => term.includes(q));

  const handleSelect = (example: DashboardExample | null) => {
    setQuery("");
    onSelect(example);
  };

  const blankRow = (
    <button type="button" onClick={() => handleSelect(null)} className={ROW_CLASS}>
      <Plus className={ICON_CLASS} />
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 text-sm font-medium text-neutral-900 dark:text-neutral-100">Blank card</span>
        <span className="truncate text-xs text-neutral-500">Start from scratch</span>
      </span>
    </button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) {
          setQuery("");
          onClose();
        }
      }}
    >
      <DialogContent hideClose className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex shrink-0 flex-col gap-3 border-b border-neutral-150 px-4 pb-3 pt-4 dark:border-neutral-850">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="mb-0 text-base">Add a card</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">Start from a preset, or a blank query.</DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="smIcon" aria-label="Close" className="shrink-0 text-neutral-500">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          <Input
            isSearch
            autoFocus
            placeholder="Search presets…"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          {showBlank && (
            <div className="px-2 pt-2">
              {blankRow}
              <div className="mx-2 mt-1.5 h-px bg-neutral-150 dark:bg-neutral-850" />
            </div>
          )}

          {q ? (
            filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-neutral-500">
                No presets match &ldquo;{query.trim()}&rdquo;.
              </div>
            ) : (
              <div className="px-2 pt-2">
                {filtered.map(example => (
                  <PresetRow key={example.id} example={example} onSelect={() => handleSelect(example)} />
                ))}
              </div>
            )
          ) : (
            DASHBOARD_EXAMPLE_CATEGORIES.map(category => {
              const items = DASHBOARD_EXAMPLES.filter(example => example.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category} className="px-2">
                  <div className="sticky top-0 z-10 bg-white px-2 pb-1.5 pt-3 text-xs font-medium text-neutral-500 dark:bg-neutral-950">
                    {category}
                  </div>
                  {items.map(example => (
                    <PresetRow key={example.id} example={example} onSelect={() => handleSelect(example)} />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
