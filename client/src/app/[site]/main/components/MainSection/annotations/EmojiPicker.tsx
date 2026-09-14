"use client";

import { Search } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { pickIconFromInput } from "./annotationUtils";
import type { EmojiGroup } from "./emojiData";

// One familiar face per group for the jump row.
const GROUP_ICONS: Record<string, string> = {
  "Smileys & Emotion": "🙂",
  "People & Body": "🧑",
  "Animals & Nature": "🌿",
  "Food & Drink": "🍎",
  "Travel & Places": "✈️",
  Activities: "⚽",
  Objects: "💡",
  Symbols: "♻️",
  Flags: "🏳️",
};

function EmojiButton({
  char,
  label,
  selected,
  onSelect,
}: {
  char: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "h-8 w-8 rounded-md text-xl leading-none transition-colors",
        "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        selected && "bg-neutral-100 dark:bg-neutral-800 ring-1 ring-neutral-900 dark:ring-neutral-100"
      )}
    >
      {char}
    </button>
  );
}

/**
 * Every emoji, grouped the way Unicode groups them, with the official names as
 * the search text. Picking the one already set clears it, so the trigger works
 * as a toggle the same way the shortcut row above it does.
 */
export function EmojiPicker({
  value,
  onChange,
  children,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
  children: ReactNode;
}) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<EmojiGroup[] | null>(null);
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1,900 emoji and their names are a chunk of their own, fetched the first
  // time someone opens the picker rather than with the dashboard.
  useEffect(() => {
    if (!open || groups) return;
    let live = true;
    import("./emojiData").then(module => {
      if (live) setGroups(module.getEmojiGroups());
    });
    return () => {
      live = false;
    };
  }, [open, groups]);

  const groupLabels: Record<string, string> = useMemo(
    () => ({
      "Smileys & Emotion": t("Smileys & Emotion"),
      "People & Body": t("People & Body"),
      "Animals & Nature": t("Animals & Nature"),
      "Food & Drink": t("Food & Drink"),
      "Travel & Places": t("Travel & Places"),
      Activities: t("Activities"),
      Objects: t("Objects"),
      Symbols: t("Symbols"),
      Flags: t("Flags"),
    }),
    [t]
  );

  const search = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!groups || !search) return null;
    const words = search.split(/\s+/);
    const matches = [];
    for (const group of groups) {
      for (const emoji of group.emojis) {
        if (words.every(word => emoji.search.includes(word))) matches.push(emoji);
      }
    }
    return matches;
  }, [groups, search]);

  // A typed or pasted emoji is its own answer — including the skin tones the
  // bundled set leaves out. Letters are a search, not a pick.
  const pasted = useMemo(() => {
    const icon = pickIconFromInput(query);
    return icon && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(icon) ? icon : null;
  }, [query]);

  const choose = (icon: string) => {
    onChange(icon === value ? null : icon);
    setOpen(false);
    setQuery("");
  };

  const jumpTo = (name: string) => {
    setQuery("");
    // The heading, not the grid, so the sticky label lands under the search box.
    scrollRef.current?.querySelector(`[data-group="${name}"]`)?.scrollIntoView({ block: "start" });
  };

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      // The dialog's scroll lock otherwise swallows wheel events in the portaled popover.
      modal
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[332px] p-0" align="start">
        <div className="p-2 pb-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              autoFocus
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t("Search emoji")}
              className="h-8 pl-8"
            />
          </div>
        </div>

        {!search && groups && (
          <div className="flex items-center gap-0.5 border-b border-neutral-150 dark:border-neutral-800 px-2 pb-1.5">
            {groups.map(group => (
              <button
                key={group.name}
                type="button"
                title={groupLabels[group.name] ?? group.name}
                aria-label={groupLabels[group.name] ?? group.name}
                onClick={() => jumpTo(group.name)}
                className="h-7 w-7 rounded-md text-base leading-none transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {GROUP_ICONS[group.name] ?? group.emojis[0]?.char}
              </button>
            ))}
          </div>
        )}

        <div ref={scrollRef} className="h-64 overflow-y-auto overscroll-contain p-2 pt-0">
          {!groups && <p className="py-6 text-center text-xs text-muted-foreground">{t("Loading emoji…")}</p>}

          {pasted && (
            <div className="mt-2 mb-1.5 flex items-center gap-2 border-b border-neutral-150 dark:border-neutral-800 pb-1.5">
              <EmojiButton char={pasted} label={pasted} selected={pasted === value} onSelect={() => choose(pasted)} />
              <span className="text-xs text-muted-foreground">{t("Use the emoji you typed")}</span>
            </div>
          )}

          {results && (
            <>
              <div className="grid grid-cols-9 gap-0.5 pt-2">
                {results.map(emoji => (
                  <EmojiButton
                    key={emoji.char}
                    char={emoji.char}
                    label={emoji.name}
                    selected={emoji.char === value}
                    onSelect={() => choose(emoji.char)}
                  />
                ))}
              </div>
              {!results.length && !pasted && (
                <p className="py-6 text-center text-xs text-muted-foreground">{t("No emoji matches that")}</p>
              )}
            </>
          )}

          {!results &&
            groups?.map(group => (
              // Offscreen groups skip layout and paint until they scroll in,
              // which is what keeps opening a 1,900-button grid instant.
              <section
                key={group.name}
                className="[content-visibility:auto] [contain-intrinsic-size:auto_240px]"
              >
                <h4
                  data-group={group.name}
                  className="sticky top-0 z-10 bg-white dark:bg-neutral-900 pt-2 pb-1 text-xs font-medium text-muted-foreground"
                >
                  {groupLabels[group.name] ?? group.name}
                </h4>
                <div className="grid grid-cols-9 gap-0.5">
                  {group.emojis.map(emoji => (
                    <EmojiButton
                      key={emoji.char}
                      char={emoji.char}
                      label={emoji.name}
                      selected={emoji.char === value}
                      onSelect={() => choose(emoji.char)}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
