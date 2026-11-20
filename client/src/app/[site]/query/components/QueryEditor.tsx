"use client";

import { AlignLeft, Loader2, Play } from "lucide-react";
import { useExtracted } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import { vs, vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { CopyButton } from "../../../../components/interior/copy-button";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../lib/utils";

SyntaxHighlighter.registerLanguage("sql", sql);

// The platform never changes, so there is nothing to subscribe to. The server snapshot is null:
// the shortcut hint renders after hydration instead of guessing the platform on the server.
const subscribeToNothing = () => () => {};
const getIsApplePlatform = () => /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
const getServerPlatform = () => null;

type QueryEditorProps = {
  value: string;
  disabled: boolean;
  isRunning: boolean;
  /** Keeps the editor focusable but blocks edits, Format and Run (e.g. while a run is in flight). */
  readOnly?: boolean;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  onChange: (value: string) => void;
  onFormat: () => void;
  onRun: () => void;
  /** Optional extra controls rendered at the left of the toolbar action group. */
  headerActions?: React.ReactNode;
};

export function QueryEditor({
  value,
  disabled,
  isRunning,
  readOnly = false,
  textareaRef,
  onChange,
  onFormat,
  onRun,
  headerActions,
}: QueryEditorProps) {
  const t = useExtracted();
  const { resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const isApplePlatform = useSyncExternalStore<boolean | null>(
    subscribeToNothing,
    getIsApplePlatform,
    getServerPlatform
  );
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(1, value.split("\n").length);
  const actionsDisabled = disabled || readOnly || !value.trim();

  useEffect(() => {
    setIsDark(resolvedTheme === "dark" || document.documentElement.classList.contains("dark"));
  }, [resolvedTheme]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!actionsDisabled) onRun();
  };

  const handleScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollLeft, scrollTop } = event.currentTarget;
    if (highlightRef.current) {
      highlightRef.current.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    }
    if (lineNumberRef.current) {
      lineNumberRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }
  };

  return (
    <div className="flex min-h-[280px] flex-col overflow-hidden rounded-lg border border-neutral-150 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <div className="flex h-10 items-center justify-between border-b border-neutral-150 bg-neutral-50 px-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t("Query")}</div>
          <div className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            SQL
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {headerActions}
          <CopyButton value={value} iconOnly size="sm" tooltip label={t("Copy SQL")} disabled={!value.trim()} />
          <Button
            type="button"
            size="smIcon"
            variant="ghost"
            onClick={onFormat}
            disabled={actionsDisabled}
            title={t("Format query")}
            aria-label={t("Format query")}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onRun} disabled={actionsDisabled} aria-keyshortcuts="Meta+Enter Control+Enter">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {t("Run")}
            {isApplePlatform !== null && (
              <kbd
                aria-hidden
                className="hidden h-4 items-center rounded-[2.8px] bg-neutral-100 px-1 font-sans text-[10px] font-medium text-neutral-500 md:inline-flex dark:bg-neutral-800 dark:text-neutral-400"
              >
                {isApplePlatform ? "⌘↵" : `${t("Ctrl")} ↵`}
              </kbd>
            )}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[42px_minmax(0,1fr)] bg-[#fbfcfd] dark:bg-[#090d16]">
        <div className="relative overflow-hidden border-r border-neutral-150 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
          <div
            ref={lineNumberRef}
            className="select-none px-2 py-2.5 text-right font-mono text-[11px] leading-[18px] text-neutral-400 dark:text-neutral-600"
            aria-hidden="true"
          >
            {Array.from({ length: lineCount }, (_, index) => (
              <div key={index} className="h-[18px]">
                {index + 1}
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-[240px] overflow-hidden">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              ref={highlightRef}
              className="min-w-full px-3 py-2.5 font-mono text-[12px] leading-[18px]"
              style={{ width: "max-content" }}
            >
              <SyntaxHighlighter
                key={isDark ? "sql-dark" : "sql-light"}
                language="sql"
                style={isDark ? vs2015 : vs}
                customStyle={{
                  margin: 0,
                  padding: 0,
                  background: "transparent",
                  color: isDark ? "#dcdcdc" : "#111827",
                  fontSize: "12px",
                  lineHeight: "18px",
                  overflow: "visible",
                  whiteSpace: "pre",
                }}
                codeTagProps={{
                  style: {
                    fontFamily: "inherit",
                    fontSize: "12px",
                    lineHeight: "18px",
                    whiteSpace: "pre",
                    color: isDark ? "#dcdcdc" : "#111827",
                  },
                }}
              >
                {value || " "}
              </SyntaxHighlighter>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={event => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            disabled={disabled}
            readOnly={readOnly}
            aria-label={t("SQL query")}
            spellCheck={false}
            wrap="off"
            className={cn(
              "absolute inset-0 min-h-[240px] resize-none overflow-auto border-0 bg-transparent px-3 py-2.5 font-mono text-[12px] leading-[18px] text-transparent outline-none caret-neutral-900",
              "selection:bg-blue-500/20 placeholder:text-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
              "dark:caret-neutral-100 dark:selection:bg-blue-400/25 dark:placeholder:text-neutral-600"
            )}
          />
        </div>
      </div>

      <div className="flex h-7 items-center justify-between border-t border-neutral-150 bg-neutral-50 px-3 text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
        <span>{lineCount} lines</span>
        <span>{value.length.toLocaleString()} chars</span>
      </div>
    </div>
  );
}
