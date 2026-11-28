"use client";

import { X } from "lucide-react";
import { useExtracted } from "next-intl";
import { ClipboardEvent, KeyboardEvent, ReactNode, useId, useState } from "react";

import { cn } from "@/lib/utils";

interface TokenInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  /**
   * What is typed but not yet an entry. Held by the parent so it can tell that an
   * entry is still waiting, or was refused, before acting on the list.
   */
  draft: string;
  onDraftChange: (draft: string) => void;
  /** An error message for an entry that can't be added, or null when it is fine. */
  validate?: (value: string) => string | null;
  placeholder?: string;
  "aria-label": string;
  /** How a committed entry is shown, when that differs from what is stored. */
  renderValue?: (value: string) => ReactNode;
}

/** A list of entries as removable chips, with a text input that adds to it on Enter. */
export function TokenInput({
  values,
  onChange,
  draft,
  onDraftChange,
  validate,
  placeholder,
  "aria-label": ariaLabel,
  renderValue,
}: TokenInputProps) {
  const t = useExtracted();
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);

  // Adds every valid entry in the text, one per line. The first entry that fails
  // validation stays in the input to be fixed; an input can't hold the lines apart,
  // so any further ones are counted in the message rather than run together.
  const commit = (text: string) => {
    const next = [...values];
    const refused: string[] = [];
    let problem: string | null = null;
    for (const entry of text.split(/\r?\n/).map(line => line.trim())) {
      if (!entry) continue;
      const entryProblem = validate?.(entry) ?? null;
      if (entryProblem) {
        refused.push(entry);
        problem ??= entryProblem;
      } else if (!next.includes(entry)) {
        next.push(entry);
      }
    }
    onChange(next);
    onDraftChange(refused[0] ?? "");
    const more = refused.length - 1;
    const moreNote = t("{count, plural, one {# more entry wasn't} other {# more entries weren't}} added.", {
      count: more,
    });
    setError(problem && more > 0 ? `${problem}. ${moreNote}` : problem);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter that confirms an IME composition belongs to the composition, not the list.
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  // A pasted column of entries would otherwise collapse into one line.
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!/\r?\n/.test(text)) return;
    event.preventDefault();
    // Paste over whatever is selected, as the input itself would.
    const { selectionStart, selectionEnd } = event.currentTarget;
    const start = selectionStart ?? draft.length;
    commit(`${draft.slice(0, start)}${text}${draft.slice(selectionEnd ?? start)}`);
  };

  return (
    <div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-150 p-1.5 dark:border-neutral-800",
          error && "border-red-500 dark:border-red-400"
        )}
      >
        {values.map(value => (
          <span
            key={value}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-neutral-100 py-0.5 pl-2 pr-1 text-xs font-medium dark:bg-neutral-800"
          >
            <span className="truncate">{renderValue ? renderValue(value) : value}</span>
            <button
              type="button"
              aria-label={t("Remove {value}", { value })}
              onClick={() => onChange(values.filter(v => v !== value))}
              className="rounded-sm p-0.5 text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-50 dark:focus-visible:ring-neutral-300"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          value={draft}
          placeholder={placeholder}
          onChange={event => {
            onDraftChange(event.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          // Typing an entry and moving on without pressing Enter still counts.
          onBlur={() => draft.trim() && commit(draft)}
          className="h-6 min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
