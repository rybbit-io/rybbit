"use client";

import { Avatar } from "@/components/Avatar";
import { Browser } from "@/components/Browser";
import { CountryFlag } from "@/components/Country";
import { OperatingSystem } from "@/components/OperatingSystem";
import { Frame } from "@/components/lp-b/primitives";
import { cn } from "@/lib/utils";
import { AlertTriangle, Eye, MousePointerClick, MoveVertical, Pause, Play, RotateCcw } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useExtracted } from "next-intl";
import { useEffect, useRef, useState } from "react";

const LOOP_MS = 16000;
const SESSION_SECONDS = 291; // the recording is 4:51 long

// Cursor waypoints in % of the replay viewport. `scroll` is how far the
// recorded page has been scrolled (% of the viewport height) at that moment.
interface Waypoint {
  t: number;
  x: number;
  y: number;
  scroll: number;
}
const WAYPOINTS: Waypoint[] = [
  { t: 0, x: 24, y: 30, scroll: 0 },
  { t: 0.08, x: 46, y: 26, scroll: 0 },
  { t: 0.16, x: 71, y: 9, scroll: 0 },
  { t: 0.24, x: 58, y: 40, scroll: 0 },
  { t: 0.34, x: 52, y: 58, scroll: 26 },
  { t: 0.44, x: 50, y: 66, scroll: 26 },
  { t: 0.56, x: 66, y: 52, scroll: 58 },
  { t: 0.66, x: 63, y: 74, scroll: 58 },
  { t: 0.8, x: 40, y: 60, scroll: 58 },
  { t: 0.9, x: 30, y: 30, scroll: 20 },
  { t: 1, x: 24, y: 30, scroll: 0 },
];

type EventKind = "pageview" | "click" | "scroll" | "rage" | "error";
interface ReplayEvent {
  t: number;
  kind: EventKind;
  detail: string;
}
const EVENTS: ReplayEvent[] = [
  { t: 0, kind: "pageview", detail: "/" },
  { t: 0.17, kind: "click", detail: "nav · Pricing" },
  { t: 0.19, kind: "pageview", detail: "/pricing" },
  { t: 0.34, kind: "scroll", detail: "26%" },
  { t: 0.45, kind: "click", detail: "button · Choose Pro" },
  { t: 0.56, kind: "scroll", detail: "58%" },
  { t: 0.67, kind: "rage", detail: "button · Pay now ×3" },
  { t: 0.73, kind: "error", detail: "TypeError: cart is undefined" },
  { t: 0.9, kind: "scroll", detail: "20%" },
];
const CLICK_TIMES = [0.17, 0.45, 0.67, 0.695, 0.72];
const RIPPLE_MS = 0.05;

const EVENT_ICON = {
  pageview: Eye,
  click: MousePointerClick,
  scroll: MoveVertical,
  rage: MousePointerClick,
  error: AlertTriangle,
} as const;
const EVENT_COLOR: Record<EventKind, string> = {
  pageview: "text-neutral-500 dark:text-neutral-400",
  click: "text-[var(--dataviz)]",
  scroll: "text-neutral-500 dark:text-neutral-400",
  rage: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
};
const MARKER_COLOR: Record<EventKind, string> = {
  pageview: "bg-neutral-400 dark:bg-neutral-500",
  click: "bg-[var(--dataviz)]",
  scroll: "bg-neutral-400 dark:bg-neutral-500",
  rage: "bg-amber-500",
  error: "bg-red-500",
};

const smooth = (u: number) => u * u * (3 - 2 * u);
function frameAt(p: number) {
  let i = 0;
  while (i < WAYPOINTS.length - 2 && WAYPOINTS[i + 1].t < p) i++;
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[i + 1];
  const u = smooth(Math.min(1, Math.max(0, (p - a.t) / (b.t - a.t))));
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, scroll: a.scroll + (b.scroll - a.scroll) * u };
}
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * A session replay player: the recorded page scrolls and the visitor's cursor
 * moves, clicks, rage-clicks and hits an error, while the timeline and the
 * event list on the right keep pace. Loops; play/pause and restart work.
 */
export function ReplayVisual() {
  const t = useExtracted();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.3 });
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0.45);
  const elapsedRef = useRef(0.45 * LOOP_MS);

  const running = playing && inView && !reducedMotion;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current = (elapsedRef.current + (now - last)) % LOOP_MS;
      last = now;
      setProgress(Math.round((elapsedRef.current / LOOP_MS) * 1000) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const restart = () => {
    elapsedRef.current = 0;
    setProgress(0);
    setPlaying(true);
  };

  const frame = frameAt(progress);
  const onPricing = progress >= 0.19 && progress < 0.98;
  const ripples = CLICK_TIMES.filter(c => progress >= c && progress < c + RIPPLE_MS);
  const errorVisible = progress >= 0.73 && progress < 0.88;
  const currentEvent = EVENTS.reduce((acc, event, index) => (event.t <= progress ? index : acc), 0);

  return (
    <div ref={rootRef}>
      <Frame
        label="replay · session 4f2a91"
        right={
          <>
            <CountryFlag country="DE" />
            <Browser browser="Chrome" />
            <OperatingSystem os="macOS" />
          </>
        }
      >
        <div className="grid md:grid-cols-[1fr_190px]">
          <div className="flex min-w-0 flex-col">
            {/* The recording: a light page regardless of theme, like a video frame */}
            <div className="relative m-2 h-[280px] overflow-hidden rounded border border-neutral-200 bg-[#f5f5f4] dark:border-neutral-800">
              <div
                className="absolute inset-x-0 top-0 will-change-transform"
                style={{ transform: `translateY(-${frame.scroll * 2.8}px)` }}
              >
                <div className="flex h-7 items-center justify-between border-b border-neutral-200 bg-white px-3">
                  <span className="text-[10px] font-semibold text-neutral-900">acme</span>
                  <span className="flex gap-3 text-[9px] text-neutral-500">
                    <span>Product</span>
                    <span className={cn(onPricing && "text-neutral-900 underline decoration-emerald-500 underline-offset-2")}>
                      Pricing
                    </span>
                    <span>Docs</span>
                    <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-white">Sign in</span>
                  </span>
                </div>
                {onPricing ? (
                  <div className="px-4 py-4">
                    <div className="text-[13px] font-semibold text-neutral-900">Plans for every team</div>
                    <div className="mt-0.5 text-[9px] text-neutral-500">Start free, upgrade when you need to.</div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        ["Free", "$0", false],
                        ["Pro", "$24", true],
                        ["Team", "$79", false],
                      ].map(([name, price, featured]) => (
                        <div
                          key={String(name)}
                          className={cn(
                            "rounded border bg-white p-2",
                            featured ? "border-emerald-500" : "border-neutral-200",
                            featured && progress >= 0.45 && progress < 0.56 && "ring-2 ring-emerald-500/40"
                          )}
                        >
                          <div className="text-[9px] font-medium text-neutral-700">{String(name)}</div>
                          <div className="text-[13px] font-semibold text-neutral-900">
                            {String(price)}
                            <span className="text-[8px] font-normal text-neutral-400">/mo</span>
                          </div>
                          <div className="mt-1.5 space-y-1">
                            <div className="h-1 w-3/4 rounded-sm bg-neutral-200" />
                            <div className="h-1 w-2/3 rounded-sm bg-neutral-200" />
                            <div className="h-1 w-1/2 rounded-sm bg-neutral-200" />
                          </div>
                          <div
                            className={cn(
                              "mt-2 rounded px-1 py-0.5 text-center text-[8px]",
                              featured ? "bg-emerald-600 text-white" : "border border-neutral-300 text-neutral-700"
                            )}
                          >
                            Choose {String(name)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded border border-neutral-200 bg-white p-3">
                      <div className="text-[10px] font-semibold text-neutral-900">Checkout · Pro</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="h-5 rounded-sm border border-neutral-200 px-1.5 text-[8px] leading-5 text-neutral-400">
                          Card number
                        </div>
                        <div className="h-5 rounded-sm border border-neutral-200 px-1.5 text-[8px] leading-5 text-neutral-400">
                          MM / YY
                        </div>
                      </div>
                      <div
                        className={cn(
                          "mt-2 w-24 rounded py-1 text-center text-[8px] text-white",
                          progress >= 0.67 && progress < 0.8 ? "bg-neutral-400" : "bg-neutral-900"
                        )}
                      >
                        Pay now
                      </div>
                    </div>
                    <div className="mt-5 space-y-1.5">
                      <div className="h-1.5 w-1/2 rounded-sm bg-neutral-200" />
                      <div className="h-1.5 w-2/3 rounded-sm bg-neutral-200" />
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-5">
                    <div className="max-w-[60%] text-[15px] font-semibold leading-tight text-neutral-900">
                      Ship the thing your customers keep asking for.
                    </div>
                    <div className="mt-1.5 h-1.5 w-2/3 rounded-sm bg-neutral-200" />
                    <div className="mt-1 h-1.5 w-1/2 rounded-sm bg-neutral-200" />
                    <div className="mt-3 flex gap-2">
                      <span className="rounded bg-emerald-600 px-2 py-1 text-[8px] text-white">Start trial</span>
                      <span className="rounded border border-neutral-300 px-2 py-1 text-[8px] text-neutral-700">
                        See pricing
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {[0, 1, 2].map(card => (
                        <div key={card} className="rounded border border-neutral-200 bg-white p-2">
                          <div className="h-10 rounded-sm bg-neutral-100" />
                          <div className="mt-1.5 h-1.5 w-3/4 rounded-sm bg-neutral-200" />
                          <div className="mt-1 h-1.5 w-1/2 rounded-sm bg-neutral-200" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {errorVisible && (
                <div className="console-rise absolute bottom-2 right-2 flex items-center gap-1.5 rounded border border-red-200 bg-white px-2 py-1 text-[9px] text-red-600 shadow-sm">
                  <AlertTriangle className="size-3" aria-hidden="true" />
                  Something went wrong. Try again.
                </div>
              )}

              {ripples.map(c => (
                <span
                  key={c}
                  aria-hidden="true"
                  className="absolute size-6 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-[var(--dataviz)] motion-reduce:animate-none"
                  style={{ left: `${frame.x}%`, top: `${frame.y}%` }}
                />
              ))}

              <div
                aria-hidden="true"
                className="absolute size-4 -rotate-12 will-change-[left,top]"
                style={{ left: `${frame.x}%`, top: `${frame.y}%` }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="size-full drop-shadow-sm">
                  <path d="M5.5 3.5L20.5 12L12 14.5L9.5 22L5.5 3.5Z" fill="white" stroke="black" strokeWidth="1" />
                </svg>
              </div>
            </div>

            {/* Player controls */}
            <div className="flex h-11 shrink-0 items-center gap-2 border-t border-neutral-200 px-3 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setPlaying(p => !p)}
                aria-label={playing ? t("Pause replay") : t("Play replay")}
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
              >
                {playing ? <Pause className="size-3" /> : <Play className="size-3 translate-x-px" />}
              </button>
              <button
                type="button"
                onClick={restart}
                aria-label={t("Restart replay")}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
              >
                <RotateCcw className="size-3" />
              </button>
              <div className="relative mx-1 h-1 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: `${progress * 100}%` }} />
                {EVENTS.filter(e => e.kind !== "pageview" && e.kind !== "scroll").map(event => (
                  <span
                    key={event.t}
                    className={cn(
                      "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-[#0f0f0f]",
                      MARKER_COLOR[event.kind]
                    )}
                    style={{ left: `${event.t * 100}%` }}
                  />
                ))}
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                {formatTime(progress * SESSION_SECONDS)} / {formatTime(SESSION_SECONDS)}
              </span>
              <span className="shrink-0 rounded border border-neutral-200 px-1.5 font-mono text-[10px] leading-4 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                1×
              </span>
            </div>
          </div>

          {/* Event list */}
          <aside className="border-t border-neutral-200 dark:border-neutral-800 md:border-l md:border-t-0">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <Avatar size={18} id="4f2a91" />
              <span className="truncate font-mono text-xs text-neutral-700 dark:text-neutral-300">visitor 4f2a91</span>
            </div>
            <ol className="p-1.5">
              {EVENTS.map((event, index) => {
                const Icon = EVENT_ICON[event.kind];
                const state = index === currentEvent ? "current" : event.t < progress ? "past" : "future";
                return (
                  <li
                    key={event.t}
                    className={cn(
                      "flex items-center gap-2 rounded px-1.5 py-[5px] text-xs transition-colors duration-300",
                      state === "current" && "bg-neutral-100 dark:bg-neutral-800/70",
                      state === "future" && "opacity-40"
                    )}
                  >
                    <Icon size={12} className={cn("shrink-0", EVENT_COLOR[event.kind])} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                      {event.detail}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-neutral-400 dark:text-neutral-500">
                      {formatTime(event.t * SESSION_SECONDS)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      </Frame>
    </div>
  );
}
