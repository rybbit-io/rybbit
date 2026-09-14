"use client";

import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface ToolCall {
  name: string;
  args: string;
}

interface Scenario {
  question: string;
  tools: ToolCall[];
  answer: string;
}

interface ConsoleView {
  scenario: number;
  /** Characters of the question revealed so far. */
  typed: number;
  /** Tool rows that have finished. */
  done: number;
  /** Index of the tool row currently running, -1 when none. */
  running: number;
  showAnswer: boolean;
  /** True while the replay loop is animating this scenario. */
  replaying: boolean;
}

const TYPE_MS = 24;
const DWELL_MS = 7000;

/**
 * A live transcript of an AI assistant working against the Rybbit MCP
 * endpoint. The first scenario is fully rendered on the server so the card
 * never depends on JS or animation to show its content; once scrolled into
 * view (and only when motion is allowed) it clears, types the first scenario
 * from scratch, and keeps cycling through the rest, tool call by tool call.
 */
export function AgentConsole() {
  const t = useExtracted();

  const scenarios: Scenario[] = [
    {
      question: t("Why did signups drop this week?"),
      tools: [
        { name: "get_overview_timeseries", args: "site: rybbit.io · past 7 days" },
        { name: "get_errors", args: "past 7 days" },
        { name: "analyze_funnel", args: "/signup → /verify" },
      ],
      answer: t(
        "Signups are down 14% since Tuesday's deploy. A new TypeError on /signup fires only in Safari. 312 sessions hit it, and it accounts for nearly all of the drop at the /signup → /verify step."
      ),
    },
    {
      question: t("Track checkout completions as a goal"),
      tools: [
        { name: "create_goal", args: "event: checkout_complete" },
        { name: "get_goals", args: "conversion stats" },
      ],
      answer: t(
        "Done. “Checkout complete” is now tracked as a goal. It would have matched 89 conversions over the past 7 days, a 3.9% conversion rate."
      ),
    },
    {
      question: t("Which blog posts drive trial signups?"),
      tools: [
        { name: "get_breakdown", args: "dimension: page · /blog/*" },
        { name: "run_query", args: "scoped_events" },
      ],
      answer: t(
        "Three posts drive 61% of blog-sourced trials. The ClickHouse deep-dive converts 4.2× better than your median post. Worth writing a follow-up."
      ),
    },
  ];

  const [view, setView] = useState<ConsoleView>(() => ({
    scenario: 0,
    typed: scenarios[0].question.length,
    done: scenarios[0].tools.length,
    running: -1,
    showAnswer: true,
    replaying: false,
  }));

  const scenariosRef = useRef(scenarios);
  scenariosRef.current = scenarios;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    const timers = new Set<number>();
    const wait = (ms: number) =>
      new Promise<void>(resolve => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          resolve();
        }, ms);
        timers.add(id);
      });

    const play = async () => {
      // Start typing scenario 0 from scratch the moment the console scrolls
      // into view, then keep cycling through the rest.
      let index = -1;
      while (!cancelled) {
        index = (index + 1) % scenariosRef.current.length;
        const scenario = scenariosRef.current[index];
        setView({ scenario: index, typed: 0, done: 0, running: -1, showAnswer: false, replaying: true });
        await wait(500);
        for (let c = 1; c <= scenario.question.length; c++) {
          if (cancelled) return;
          setView(v => ({ ...v, typed: c }));
          await wait(TYPE_MS);
        }
        await wait(400);
        for (let i = 0; i < scenario.tools.length; i++) {
          if (cancelled) return;
          setView(v => ({ ...v, running: i }));
          await wait(750);
          setView(v => ({ ...v, done: i + 1, running: -1 }));
          await wait(150);
        }
        await wait(300);
        if (cancelled) return;
        setView(v => ({ ...v, showAnswer: true, replaying: false }));
        await wait(DWELL_MS);
      }
    };

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          void play();
        }
      },
      { threshold: 0.35 }
    );
    if (rootRef.current) observer.observe(rootRef.current);

    return () => {
      cancelled = true;
      observer.disconnect();
      for (const id of timers) window.clearTimeout(id);
    };
    // Scenario text lives in scenariosRef; the loop itself never restarts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scenario = scenarios[view.scenario];
  const question = scenario.question.slice(0, view.typed);
  const typing = view.replaying && view.typed < scenario.question.length;

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col overflow-hidden rounded-lg border border-neutral-300 bg-neutral-950 dark:border-neutral-700"
    >
      <p className="sr-only">
        {t(
          "Example conversation: an AI assistant connected to Rybbit over MCP pulls live analytics, investigates errors and funnels, and creates goals on request."
        )}
      </p>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
      />

      <div aria-hidden="true" className="relative flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5 sm:px-5">
        <span className="size-2 rounded-full bg-[#ff5f57]" />
        <span className="size-2 rounded-full bg-[#febc2e]" />
        <span className="size-2 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-neutral-400">claude code</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-xs text-neutral-500">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          rybbit mcp · connected
        </span>
      </div>

      <div
        aria-hidden="true"
        className="relative min-h-[380px] flex-1 px-4 py-5 font-mono text-sm leading-6 sm:px-5 md:min-h-[330px] lg:px-6 lg:py-6"
      >
        <div className="flex gap-2 text-neutral-100">
          <span className="select-none text-emerald-400">›</span>
          <span className="text-pretty">
            {question}
            {typing && <span className="ml-px inline-block h-3.5 w-[7px] translate-y-[2px] bg-emerald-400/80" />}
          </span>
        </div>

        <div className="mt-6">
          {scenario.tools.map((tool, index) => {
            const state = index < view.done ? "done" : index === view.running ? "running" : "hidden";
            if (state === "hidden") return null;
            return (
              <div
                key={tool.name}
                className={cn("flex min-w-0 items-center gap-2", state === "running" && "console-rise")}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    state === "running" ? "animate-pulse bg-emerald-400" : "bg-emerald-500"
                  )}
                />
                <span className="shrink-0 text-emerald-400">{tool.name}</span>
                <span className="min-w-0 flex-1 truncate text-neutral-500">{tool.args}</span>
              </div>
            );
          })}
        </div>

        {view.showAnswer && (
          <>
            <p key={view.scenario} className="console-rise mt-6 text-pretty text-neutral-300">
              {scenario.answer}
            </p>
            <div className="mt-6 flex gap-2">
              <span className="select-none text-emerald-400">›</span>
              <span className="console-caret inline-block h-3.5 w-[7px] translate-y-[5px] bg-emerald-400/80 motion-reduce:opacity-60" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
