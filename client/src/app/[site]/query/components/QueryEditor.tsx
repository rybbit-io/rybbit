"use client";

import { AlignLeft, Loader2, Play } from "lucide-react";
import { useExtracted } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import { vs, vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../lib/utils";

SyntaxHighlighter.registerLanguage("sql", sql);

type QueryEditorProps = {
  value: string;
  disabled: boolean;
  isRunning: boolean;
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
  onChange,
  onFormat,
  onRun,
  headerActions,
}: QueryEditorProps) {
  const t = useExtracted();
  const { resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(1, value.split("\n").length);

  useEffect(() => {
    setIsDark(resolvedTheme === "dark" || document.documentElement.classList.contains("dark"));
  }, [resolvedTheme]);

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
    <div className="flex min-h-[280px] flex-col overflow-hidden rounded-lg border border-neutral-150 bg-white shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
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
          <Button
            type="button"
            size="smIcon"
            variant="ghost"
            onClick={onFormat}
            disabled={disabled || !value.trim()}
            title="Format query"
            aria-label="Format query"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onRun} disabled={disabled || !value.trim()}>
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {t("Run")}
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
            value={value}
            onChange={event => onChange(event.target.value)}
            onScroll={handleScroll}
            disabled={disabled}
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
