"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useExtracted } from "next-intl";

/**
 * A replayed agent session against the Rybbit MCP server: one question, three
 * tool calls, one grounded answer. Tool names and result lines are real MCP
 * surface and intentionally untranslated (they are machine output); the
 * question and the answer carry the i18n. The full transcript is the initial
 * render, so no-JS and reduced-motion both get the complete, static session.
 */

// Step 0 shows only the question; each later step reveals one more row.
const TOOL_STEPS = [
  {
    tool: "get_goals",
    args: "site: 3 · past 7 days",
    result: (
      <>
        Signup — 412 conversions <Delta value="−22% w/w" negative />
      </>
    ),
  },
  {
    tool: "get_overview_timeseries",
    args: "bucket: day",
    result: (
      <>
        <SessionsSparkline /> sessions <Delta value="+1% w/w" />
      </>
    ),
  },
  {
    tool: "get_breakdown",
    args: "dimension: device_type",
    result: (
      <>
        mobile <Delta value="−41%" negative /> · desktop <Delta value="+2%" />
      </>
    ),
  },
  {
    tool: "run_query",
    args: "scoped_events · read-only SQL",
    result: (
      <>
        checkout_error, mobile — 0 → <Delta value="214/day" negative />
      </>
    ),
  },
];

const ANSWER_STEP = TOOL_STEPS.length + 1;
const REVEAL_MS = 1300;
const HOLD_MS = 5200;

function Delta({ value, negative = false }: { value: string; negative?: boolean }) {
  return (
    <span className={negative ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
      {value}
    </span>
  );
}

/** Flat-with-noise line: the visual proof that traffic held steady. */
function SessionsSparkline() {
  return (
    <svg
      width="104"
      height="16"
      viewBox="0 0 104 16"
      fill="none"
      aria-hidden="true"
      className="inline-block align-middle text-emerald-600 dark:text-emerald-400"
    >
      <path
        d="M1 9.5 L11 8 L21 10 L31 7.5 L41 9 L51 6.5 L61 9.5 L71 8 L81 10 L91 7 L103 8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="dataline-path"
      />
    </svg>
  );
}

function TranscriptRow({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "transition-all duration-500 motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      )}
    >
      {children}
    </div>
  );
}

export function McpTranscript({ className }: { className?: string }) {
  const t = useExtracted();
  // Initial state is the finished session; the loop only starts client-side,
  // once the card scrolls into view, for visitors who haven't asked for
  // reduced motion. Off-screen the loop pauses.
  const [step, setStep] = useState(ANSWER_STEP);
  const [cycle, setCycle] = useState(0);
  const [active, setActive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const holdMs = cycle === 0 ? 1400 : HOLD_MS;
    const timer = setTimeout(
      () => {
        if (step < ANSWER_STEP) {
          setStep(step + 1);
        } else {
          setStep(0);
          setCycle(c => c + 1);
        }
      },
      step === ANSWER_STEP ? holdMs : REVEAL_MS
    );
    return () => clearTimeout(timer);
  }, [step, active, cycle]);

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
        <span className="ml-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {t("agent session — rybbit mcp")}
        </span>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <p className="flex gap-2.5 text-sm font-medium leading-6 text-neutral-900 dark:text-neutral-100">
          <span aria-hidden="true" className="select-none font-mono text-emerald-600 dark:text-emerald-400">
            ❯
          </span>
          <span>
            {t("Why did signups dip last week?")}
            {step < ANSWER_STEP && (
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-4 w-[7px] translate-y-0.5 animate-pulse bg-neutral-400 dark:bg-neutral-500"
              />
            )}
          </span>
        </p>

        <div className="space-y-4">
          {TOOL_STEPS.map((row, index) => (
            <TranscriptRow key={row.tool} visible={step > index}>
              <p className="flex items-center gap-2.5 font-mono text-xs leading-5">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400"
                />
                <span className="text-neutral-800 dark:text-neutral-200">{row.tool}</span>
                <span className="truncate text-neutral-500 dark:text-neutral-400">{row.args}</span>
              </p>
              <p className="mt-1 pl-4 font-mono text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                {/* Re-key on reveal so the sparkline draw animation replays each cycle. */}
                <span key={`${cycle}-${step > index}`}>{row.result}</span>
              </p>
            </TranscriptRow>
          ))}
        </div>

        <TranscriptRow visible={step >= ANSWER_STEP}>
          <div className="flex gap-2.5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <span
              aria-hidden="true"
              className="mt-[7px] size-1.5 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-500"
            />
            <p className="max-w-md text-sm leading-6 text-neutral-700 dark:text-neutral-300">
              {t(
                "Traffic held steady, so it isn't acquisition. Mobile signups fell 41% right after Tuesday's checkout deploy, and mobile checkout has thrown errors since. Desktop is unchanged."
              )}
            </p>
          </div>
        </TranscriptRow>
      </div>
    </div>
  );
}
