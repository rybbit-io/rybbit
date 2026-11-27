"use client";

import { X } from "lucide-react";
import { useExtracted } from "next-intl";
import { ClipboardEvent, KeyboardEvent, ReactNode, useState } from "react";

import { cn } from "@/lib/utils";

interface TokenInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  /** An error message for an entry that can't be added, or null when it is fine. */
  validate?: (value: string) => string | null;
  placeholder?: string;
  "aria-label": string;
  /** How a committed entry is shown, when that differs from what is stored. */
  renderValue?: (value: string) => ReactNode;
  /** Chips only, for lists whose entries are picked elsewhere. */
  hideInput?: boolean;
}

/** A list of entries as removable chips, with a text input that adds to it on Enter. */
export function TokenInput({
  values,
  onChange,
  validate,
  placeholder,
  "aria-label": ariaLabel,
  renderValue,
  hideInput = false,
}: TokenInputProps) {
  const t = useExtracted();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Adds every entry in the text. Stops at the first one that fails validation
  // and leaves the rest in the input to be fixed.
  const commit = (text: string) => {
    const entries = text
      .split(/\r?\n/)
      .map(entry => entry.trim())
      .filter(Boolean);
    const next = [...values];
    for (let i = 0; i < entries.length; i++) {
      const problem = validate?.(entries[i]) ?? null;
      if (problem) {
        onChange(next);
        setDraft(entries.slice(i).join(" "));
        setError(problem);
        return;
      }
      if (!next.includes(entries[i])) next.push(entries[i]);
    }
    onChange(next);
    setDraft("");
    setError(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
    commit(`${draft}${text}`);
  };

  if (hideInput && values.length === 0) return null;

  return (
    <div>
      <div
        aria-label={hideInput ? ariaLabel : undefined}
        role={hideInput ? "group" : undefined}
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
        {!hideInput && (
          <input
            type="text"
            aria-label={ariaLabel}
            aria-invalid={error ? true : undefined}
            value={draft}
            placeholder={placeholder}
            onChange={event => {
              setDraft(event.target.value);
              setError(null);
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            // Typing an entry and moving on without pressing Enter still counts.
            onBlur={() => draft.trim() && commit(draft)}
            className="h-6 min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
          />
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
