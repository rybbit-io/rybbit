// Adapted from interior.dev "Command Palette" (MIT). See ../interior/THIRD_PARTY_LICENSES.md
"use client";

import { Command as CommandPrimitive } from "cmdk";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useExtracted } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { Command, CommandDialog, CommandInput, CommandList } from "@/components/ui/command";
import { FADE_IN, SPRING_CELL } from "@/lib/motion";
import { paletteEntries, type PaletteEntry } from "./entries";
import {
  isApplePlatform,
  isEditableTarget,
  isEmbedView,
  isPaletteShortcut,
  isShortcutSheetKey,
  keepEscapeInOverlay,
  keepKeysInOverlay,
} from "./keys";
import { KeyCaps } from "./KeyCaps";
import { getActiveSiteId } from "./routes";
import { ShortcutSheet } from "./ShortcutSheet";
import { closeOverlay, restoreFocus, showOverlay, usePaletteOverlay } from "./store";
import { useCommandPaletteAvailable } from "./useCommandPaletteAvailable";
import { GROUP_LIMITS, usePaletteCommands, useSiteEntityCommands, type PaletteCommand } from "./usePaletteCommands";

// A search renders at most this many rows; the rest are a few keystrokes away.
const MAX_RESULTS = 50;
const ENTRY_OPTIONS = { groupLimits: GROUP_LIMITS, maxResults: MAX_RESULTS };
const NO_COMMANDS: PaletteCommand[] = [];
const NO_ENTRIES: ReadonlySet<string> = new Set();

const entryKey = (entry: PaletteEntry<PaletteCommand>) =>
  entry.kind === "row" ? entry.item.id : `heading:${entry.group}`;

/** Entries drawn inside the list's visible area, by entry key. */
function entriesOnScreen(list: HTMLElement | null): Set<string> {
  const onScreen = new Set<string>();
  if (!list) return onScreen;

  const { top, bottom } = list.getBoundingClientRect();
  list.querySelectorAll<HTMLElement>("[data-entry]").forEach(element => {
    const rect = element.getBoundingClientRect();
    if (rect.bottom > top && rect.top < bottom && element.dataset.entry) onScreen.add(element.dataset.entry);
  });
  return onScreen;
}

/**
 * ⌘K (Ctrl+K off Apple platforms) toggles the command palette from anywhere,
 * including text fields. "?" opens the keyboard shortcut sheet unless the user
 * is typing. Mounted once for the whole app; renders nothing for visitors.
 */
export function CommandPalette() {
  const available = useCommandPaletteAvailable();
  const overlay = usePaletteOverlay(state => state.overlay);

  useEffect(() => {
    if (!available) {
      closeOverlay();
      return;
    }

    const apple = isApplePlatform();
    const onKeyDown = (event: KeyboardEvent) => {
      // A focused editor that claims the chord (defaultPrevented) keeps it.
      if (event.defaultPrevented || event.repeat || event.isComposing || isEmbedView()) return;
      const current = usePaletteOverlay.getState().overlay;

      if (isPaletteShortcut(event, apple)) {
        event.preventDefault();
        if (current === "palette") closeOverlay();
        else showOverlay("palette");
      } else if (current === null && isShortcutSheetKey(event) && !isEditableTarget(event.target)) {
        event.preventDefault();
        showOverlay("shortcuts");
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [available]);

  if (!available) return null;

  return (
    <>
      <PaletteDialog open={overlay === "palette"} />
      <ShortcutSheet open={overlay === "shortcuts"} />
    </>
  );
}

function PaletteDialog({ open }: { open: boolean }) {
  const t = useExtracted();

  return (
    <CommandDialog
      open={open}
      onOpenChange={next => (next ? showOverlay("palette") : closeOverlay())}
      title={t("Command palette")}
      description={t("Search for a page, site or action, then press Enter to run it.")}
      onCloseAutoFocus={restoreFocus}
      onEscapeKeyDown={keepEscapeInOverlay}
      onKeyDown={keepKeysInOverlay}
    >
      <PaletteContent />
    </CommandDialog>
  );
}

function PaletteContent() {
  const siteId = getActiveSiteId(usePathname());
  return siteId === null ? <PaletteView entityCommands={NO_COMMANDS} /> : <SitePaletteView siteId={siteId} />;
}

function SitePaletteView({ siteId }: { siteId: number }) {
  const entityCommands = useSiteEntityCommands(siteId);
  return <PaletteView entityCommands={entityCommands} />;
}

function PaletteView({ entityCommands }: { entityCommands: PaletteCommand[] }) {
  const t = useExtracted();
  const { commands, groupLabels } = usePaletteCommands(entityCommands);
  const [query, setQuery] = useState("");
  // The selected row. Controlled so a pointer only selects when it really moves.
  const [value, setValue] = useState("");
  // React keys by entry key. An entry keeps its key while it stays on screen,
  // so a re-rank glides it from where it was drawn. One that was off screen
  // (below the fold, or not listed) gets a fresh key and mounts in its final
  // slot rather than flying in from a position nobody could see.
  const [keys, setKeys] = useState<Record<string, string>>({});
  // Entries mounted by the latest query change; they fade in where they land.
  const [arriving, setArriving] = useState<ReadonlySet<string>>(NO_ENTRIES);
  const queryChanges = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const pointer = useRef({ x: -1, y: -1 });

  const searching = query.trim() !== "";
  const { entries, total } = paletteEntries(commands, query, ENTRY_OPTIONS);

  const changeQuery = (next: string) => {
    const onScreen = entriesOnScreen(listRef.current);
    const change = ++queryChanges.current;
    const incoming = new Set(
      paletteEntries(commands, next, ENTRY_OPTIONS)
        .entries.map(entryKey)
        .filter(key => !onScreen.has(key))
    );
    setKeys(current => {
      const updated = { ...current };
      incoming.forEach(key => {
        updated[key] = `${key}~${change}`;
      });
      return updated;
    });
    setArriving(incoming);
    setQuery(next);
  };

  // Back to the top once the rows re-rank. This runs after framer has recorded
  // where each row was drawn and before it measures where the row went, so a
  // glide always starts from what the user saw, scrolled or not.
  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query]);

  const announcement = !searching
    ? ""
    : total === 0
      ? t("No results")
      : t("{count, plural, one {# result} other {# results}}", { count: total });

  // The combobox announces the active row; the result count follows once typing
  // settles. Keyed on the text, so moving through rows does not repeat it.
  useEffect(() => {
    const live = liveRef.current;
    if (!live) return;
    if (!announcement) {
      live.textContent = "";
      return;
    }
    const id = setTimeout(() => {
      live.textContent = announcement;
    }, 400);
    return () => clearTimeout(id);
  }, [announcement]);

  const run = (command: PaletteCommand) => {
    command.run();
    // A command that opened the shortcut sheet has already replaced the palette.
    if (usePaletteOverlay.getState().overlay === "palette") closeOverlay();
  };

  // Rows glide under a resting pointer; only an actual move may take the selection.
  const selectFromPointer = (id: string, event: PointerEvent) => {
    const { x, y } = pointer.current;
    if (event.clientX === x && event.clientY === y) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (id !== value) setValue(id);
  };

  return (
    <Command
      label={t("Search commands")}
      shouldFilter={false}
      disablePointerSelection
      vimBindings={false}
      loop
      value={value}
      onValueChange={setValue}
    >
      <CommandInput
        value={query}
        onValueChange={changeQuery}
        placeholder={t("Search or jump to…")}
        wrapperClassName="h-12 px-4 border-neutral-150 dark:border-neutral-750"
        className="h-12"
      >
        <KeyCaps aria-hidden keys={[t("Esc")]} />
      </CommandInput>
      <CommandList
        ref={listRef}
        label={t("Commands")}
        // Clicking a row or the gutter keeps focus, and typing, in the search field.
        onMouseDown={event => event.preventDefault()}
        className="relative h-[min(22rem,60dvh)] max-h-none scroll-pb-1.5 scroll-pt-9 overscroll-contain p-1.5"
      >
        {entries.map(entry => {
          const key = entryKey(entry);
          const fadeIn = arriving.has(key);

          return entry.kind === "heading" ? (
            <motion.div
              key={keys[key] ?? key}
              data-entry={key}
              aria-hidden
              initial={fadeIn ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={FADE_IN}
              className="truncate px-2.5 pb-1.5 pt-3 text-xs font-medium text-neutral-600 first:pt-1.5 dark:text-neutral-400"
            >
              {groupLabels[entry.group]}
            </motion.div>
          ) : (
            <PaletteRow
              key={keys[key] ?? key}
              command={entry.item}
              groupLabel={groupLabels[entry.item.group]}
              searching={searching}
              query={query}
              fadeIn={fadeIn}
              onRun={run}
              onPointerSelect={selectFromPointer}
            />
          );
        })}
        {entries.length === 0 && (
          <p
            aria-hidden
            className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-neutral-600 dark:text-neutral-400"
          >
            {t("No results")}
          </p>
        )}
      </CommandList>
      <span ref={liveRef} role="status" aria-live="polite" className="sr-only" />
    </Command>
  );
}

function PaletteRow({
  command,
  groupLabel,
  searching,
  query,
  fadeIn,
  onRun,
  onPointerSelect,
}: {
  command: PaletteCommand;
  groupLabel: string;
  searching: boolean;
  query: string;
  /** Mounted by a query change: fade in at the final slot. */
  fadeIn: boolean;
  onRun: (command: PaletteCommand) => void;
  onPointerSelect: (id: string, event: PointerEvent) => void;
}) {
  const t = useExtracted();
  // Headings are visual only, so every option names its group itself.
  const accessibleName = [command.label, command.hint, groupLabel, command.current ? t("Current") : undefined]
    .filter(Boolean)
    .join(", ");

  return (
    <CommandPrimitive.Item asChild value={command.id} onSelect={() => onRun(command)}>
      <motion.div
        aria-label={accessibleName}
        data-entry={command.id}
        // A row that stays on screen travels to its new rank as the query
        // changes. Only a query change moves it: rows that shift because a
        // list finished loading jump, since the user did not cause that.
        layout="position"
        layoutDependency={query}
        initial={fadeIn ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        // New rows wait for the gliding ones to clear their slot, so text never overlaps.
        transition={{ layout: SPRING_CELL, opacity: fadeIn ? { ...FADE_IN, delay: 0.1 } : FADE_IN }}
        onPointerMove={event => onPointerSelect(command.id, event)}
        className="flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-sm text-neutral-800 outline-none data-[selected=true]:bg-neutral-100 dark:text-neutral-100 dark:data-[selected=true]:bg-neutral-750"
      >
        <span
          aria-hidden
          className="flex h-4 w-4 shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-400 [&_svg]:h-4 [&_svg]:w-4"
        >
          {command.icon}
        </span>
        <span className="min-w-0 truncate">{command.label}</span>
        {command.hint && (
          <span className="min-w-0 shrink-[3] truncate text-xs text-neutral-600 dark:text-neutral-400">
            {command.hint}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          {/* Headings name the groups until the list is ranked; then each row shows its own. */}
          {searching && (
            <span className="max-w-40 truncate text-xs text-neutral-600 dark:text-neutral-400">{groupLabel}</span>
          )}
          {command.current && <Check aria-hidden className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          {command.shortcut && <KeyCaps keys={command.shortcut} />}
        </span>
      </motion.div>
    </CommandPrimitive.Item>
  );
}
