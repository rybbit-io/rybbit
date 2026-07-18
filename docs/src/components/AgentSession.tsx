"use client";

import { cn } from "@/lib/utils";
import { Check, LoaderCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useRef, useState } from "react";

/**
 * A recorded agent session against the Rybbit MCP endpoint, shown as a small
 * app window (the hero's browser-window rhyme). The server renders the
 * finished conversation; when the window first scrolls into view the sequence
 * replays once. Every node stays mounted throughout — visibility is
 * opacity-only — so the window never changes height and assistive tech always
 * sees the full transcript. Reduced motion skips the replay entirely.
 *
 * Reveal timeline (step): 1 question · 2/4/6 tool call starts · 3/5/7 tool
 * call resolves · 8 answer.
 */
const STEP_DELAYS_MS = [400, 900, 1700, 2100, 3000, 3400, 4400, 5100];
const TOTAL_STEPS = STEP_DELAYS_MS.length;

const reveal = (visible: boolean) =>
  cn(
    "transition-all duration-500 ease-out motion-reduce:transition-none",
    visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
  );

function ToolCall({
  name,
  args,
  result,
  started,
  done,
}: {
  name: string;
  args: string;
  result: string;
  started: boolean;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900",
        reveal(started)
      )}
    >
      <p className="flex min-w-0 items-center gap-2 font-mono text-xs">
        {done ? (
          <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <LoaderCircle
            className="size-3.5 shrink-0 animate-spin text-neutral-400 motion-reduce:animate-none dark:text-neutral-500"
            aria-hidden="true"
          />
        )}
        <span className="shrink-0 font-medium text-neutral-800 dark:text-neutral-200">{name}</span>
        <span className="hidden truncate text-neutral-500 dark:text-neutral-400 sm:inline">{args}</span>
      </p>
      <p
        className={cn(
          "mt-1 pl-[22px] text-xs leading-5 text-neutral-500 dark:text-neutral-400",
          "transition-opacity duration-500 motion-reduce:transition-none",
          done ? "opacity-100" : "opacity-0"
        )}
      >
        {result}
      </p>
    </div>
  );
}

export function AgentSession() {
  const t = useExtracted();
  const containerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(TOTAL_STEPS);

  useEffect(() => {
    const container = containerRef.current;
    if (
      !container ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let timers: ReturnType<typeof setTimeout>[] = [];
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        setStep(0);
        timers = STEP_DELAYS_MS.map((delay, index) => setTimeout(() => setStep(index + 1), delay));
      },
      { threshold: 0.4 }
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const toolCalls = [
    {
      name: "get_overview_timeseries",
      args: '{ site_id: 3, bucket: "day" }',
      result: t("Sessions are steady week over week (+2%)."),
    },
    {
      name: "get_goals",
      args: "{ site_id: 3 }",
      result: t("Signup conversions are down 27% since Tuesday."),
    },
    {
      name: "get_errors",
      args: "{ site_id: 3, past_minutes: 10080 }",
      result: t("New since Tuesday: ValidationError in SignupForm, 312 occurrences, mobile only."),
    },
  ];

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-lg border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-950"
    >
      <div className="grid h-10 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800 sm:grid-cols-[1fr_auto_1fr] sm:px-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="min-w-0 justify-self-center truncate rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 font-mono text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          app.rybbit.io/api/mcp
        </span>
        <div className="flex items-center gap-1.5 justify-self-end text-xs text-neutral-500 dark:text-neutral-400">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="hidden sm:inline">{t("Connected")}</span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className={reveal(step >= 1)}>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("You")}</p>
          <p className="mt-1.5 inline-block rounded-md bg-neutral-100 px-3.5 py-2.5 text-sm text-neutral-900 dark:bg-neutral-800/60 dark:text-neutral-100">
            {t("Why did signups drop this week?")}
          </p>
        </div>

        <div className="space-y-2">
          {toolCalls.map((toolCall, index) => (
            <ToolCall
              key={toolCall.name}
              {...toolCall}
              started={step >= 2 + index * 2}
              done={step >= 3 + index * 2}
            />
          ))}
        </div>

        <div className={reveal(step >= TOTAL_STEPS)}>
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span aria-hidden="true" className="size-1.5 rounded-[1px] bg-emerald-600 dark:bg-emerald-400" />
            {t("Agent")}
          </p>
          <p className="mt-1.5 max-w-[55ch] text-sm leading-6 text-neutral-700 dark:text-neutral-300">
            {t(
              "Your traffic is fine — conversion broke. Sessions held steady while signups fell 27%, and the drop lines up with a ValidationError on the signup form that first appeared after Tuesday's deploy, almost entirely on mobile. Want me to pull a session replay of an affected visitor?"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
