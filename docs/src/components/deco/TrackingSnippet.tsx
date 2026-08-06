"use client";

import { cn } from "@/lib/utils";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// The real one-line install artifact as syntax-colored tokens. Code is
// intentionally untranslated; the surrounding section copy carries the i18n.
const TOKENS = [
  { text: "<script\n  ", className: "" },
  { text: "src", className: "text-neutral-700 dark:text-neutral-300" },
  { text: "=", className: "" },
  { text: '"https://app.rybbit.io/api/script.js"', className: "text-emerald-700 dark:text-emerald-400" },
  { text: "\n  ", className: "" },
  { text: "data-site-id", className: "text-neutral-700 dark:text-neutral-300" },
  { text: "=", className: "" },
  { text: '"YOUR_SITE_ID"', className: "text-emerald-700 dark:text-emerald-400" },
  { text: "\n  ", className: "" },
  { text: "async", className: "text-neutral-700 dark:text-neutral-300" },
  { text: "\n", className: "" },
  { text: "></script>", className: "" },
];

const TOTAL_CHARS = TOKENS.reduce((sum, token) => sum + token.text.length, 0);
const CHAR_INTERVAL_MS = 22;

/**
 * The install snippet, shown as a small editor card. It types itself once
 * when scrolled into view; the resting state (SSR, no JS, reduced motion)
 * is the complete snippet.
 */
export function TrackingSnippet({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(rootRef, { once: true, amount: 0.5 });

  // "idle" renders the full snippet; typing starts only on first view.
  const [phase, setPhase] = useState<"idle" | "typing" | "done">("idle");
  const [typed, setTyped] = useState(TOTAL_CHARS);

  // Trigger once on first view; the ticker below owns the interval. Kept as
  // two effects so the phase change doesn't tear down its own interval.
  useEffect(() => {
    if (!isInView || prefersReducedMotion) return;
    setPhase(prev => (prev === "idle" ? "typing" : prev));
    setTyped(prev => (prev === TOTAL_CHARS ? 0 : prev));
  }, [isInView, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== "typing") return;
    const interval = setInterval(() => {
      setTyped(prev => {
        if (prev + 1 >= TOTAL_CHARS) {
          clearInterval(interval);
          return TOTAL_CHARS;
        }
        return prev + 1;
      });
    }, CHAR_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase]);

  // Let the caret blink briefly on the finished line, then retire it.
  useEffect(() => {
    if (phase !== "typing" || typed < TOTAL_CHARS) return;
    const timer = setTimeout(() => setPhase("done"), 1400);
    return () => clearTimeout(timer);
  }, [phase, typed]);

  const showCaret = phase === "typing";

  let budget = typed;
  const visibleTokens = TOKENS.map(token => {
    const text = token.text.slice(0, Math.max(0, budget));
    budget -= token.text.length;
    return { ...token, text };
  });

  return (
    <div
      ref={rootRef}
      className={cn(
        "overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <span aria-hidden="true" className="size-2 rounded-full bg-[#ff5f57]" />
        <span aria-hidden="true" className="size-2 rounded-full bg-[#febc2e]" />
        <span aria-hidden="true" className="size-2 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">index.html</span>
      </div>
      <pre className="min-h-[9rem] overflow-x-auto p-3 text-xs leading-6">
        <code className="text-neutral-500 dark:text-neutral-400">
          {visibleTokens.map((token, index) =>
            token.text ? (
              <span key={index} className={token.className || undefined}>
                {token.text}
              </span>
            ) : null
          )}
          {showCaret && (
            <span
              aria-hidden="true"
              className="console-caret ml-px inline-block h-3.5 w-[7px] translate-y-0.5 bg-neutral-400 dark:bg-neutral-500"
            />
          )}
        </code>
      </pre>
    </div>
  );
}
