"use client";

import { Avatar } from "@/components/Avatar";
import { Browser } from "@/components/Browser";
import { CountryFlag } from "@/components/Country";
import { OperatingSystem } from "@/components/OperatingSystem";
import { Frame } from "@/components/lp-b/primitives";
import { cn } from "@/lib/utils";
import { ArrowRight, Eye, Monitor, Play, Smartphone, Zap } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { useRef } from "react";

interface SessionTemplate {
  /** Identified users carry a name and email; anonymous visitors only a salted id. */
  name: string | null;
  id: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  device: "desktop" | "mobile";
  entry: string;
  exit: string;
  seconds: number;
  pages: number;
  events: number;
  replay: boolean;
}

const ADA = { name: "Ada Chen", id: "ada@acme.com", country: "DE", city: "Berlin", browser: "Chrome", os: "macOS" } as const;

const SESSIONS: SessionTemplate[] = [
  { ...ADA, device: "desktop", entry: "/pricing", exit: "/signup", seconds: 291, pages: 9, events: 4, replay: true },
  { name: null, id: "8f3a1c", country: "US", city: "San Francisco", browser: "Safari", os: "iOS", device: "mobile", entry: "/blog/clickhouse-deep-dive", exit: "/docs", seconds: 132, pages: 5, events: 1, replay: true },
  { name: "Tomás Ruiz", id: "tomas@northwind.co", country: "BR", city: "São Paulo", browser: "Firefox", os: "Windows", device: "desktop", entry: "/", exit: "/docs/script", seconds: 68, pages: 3, events: 2, replay: false },
  { name: null, id: "c41d9e", country: "IN", city: "Mumbai", browser: "Chrome", os: "Android", device: "mobile", entry: "/features/session-replay", exit: "/pricing", seconds: 44, pages: 2, events: 0, replay: false },
  { name: null, id: "2e77b0", country: "GB", city: "London", browser: "Edge", os: "Windows", device: "desktop", entry: "/compare/google-analytics", exit: "/signup", seconds: 203, pages: 6, events: 3, replay: true },
  { ...ADA, device: "desktop", entry: "/docs", exit: "/docs/api", seconds: 150, pages: 4, events: 1, replay: true },
  { name: null, id: "91ad03", country: "JP", city: "Tokyo", browser: "Safari", os: "macOS", device: "desktop", entry: "/", exit: "/features", seconds: 97, pages: 4, events: 1, replay: false },
  { name: null, id: "5b02fe", country: "FR", city: "Paris", browser: "Chrome", os: "Linux", device: "desktop", entry: "/docs/guides/react/next-js", exit: "/docs/track-events", seconds: 310, pages: 8, events: 5, replay: true },
];

const VISIBLE = 3;
const ARRIVAL_MS = 3400;
const ROW_H = 66;

const TRAITS = [
  ["plan", "pro"],
  ["company", "Acme"],
  ["role", "admin"],
  ["signup_source", "github"],
];

interface Activity {
  key: number;
  when: string;
  kind: "session" | "event";
  detail: string;
  replay?: boolean;
}
const INITIAL_ACTIVITY: Activity[] = [
  { key: 0, when: "14:02", kind: "session", detail: "/pricing → /signup · 4m 51s", replay: true },
  { key: 1, when: "14:05", kind: "event", detail: "signup" },
  { key: 2, when: "Aug 30", kind: "session", detail: "/docs → /docs/script · 2m 30s", replay: true },
  { key: 3, when: "Aug 27", kind: "event", detail: "cta_click · location: hero" },
  { key: 4, when: "Aug 27", kind: "session", detail: "/ → /features/session-replay · 1m 12s" },
];

const formatDuration = (s: number) => `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, "0")}s`;

interface FeedItem {
  key: number;
  template: number;
  /** Timestamp the session arrived; the newest row ticks its duration from it. */
  arrivedAt: number;
}

/**
 * The Sessions list with new sessions arriving live, and the profile of the
 * identified user who keeps showing up in it. When one of her sessions lands,
 * her profile's counters and activity timeline update in step.
 */
export function SessionsVisual() {
  const t = useExtracted();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.25 });
  const reducedMotion = useReducedMotion();

  const [feed, setFeed] = useState<FeedItem[]>(() =>
    Array.from({ length: VISIBLE }, (_, i) => ({ key: VISIBLE - 1 - i, template: VISIBLE - 1 - i, arrivedAt: 0 }))
  );
  const [liveSeconds, setLiveSeconds] = useState(SESSIONS[VISIBLE - 1].seconds);
  const [profile, setProfile] = useState({ sessions: 14, pageviews: 61, events: 9, lastSeen: "14:05" });
  const [activity, setActivity] = useState<Activity[]>(INITIAL_ACTIVITY);
  const [pulse, setPulse] = useState(false);

  // New sessions arrive while the panel is on screen.
  useEffect(() => {
    if (!inView || reducedMotion) return;
    const interval = setInterval(() => {
      setFeed(prev => {
        const template = (prev[0].template + 1) % SESSIONS.length;
        const next: FeedItem = { key: prev[0].key + 1, template, arrivedAt: Date.now() };
        const session = SESSIONS[template];
        if (session.name === ADA.name) {
          setProfile(p => ({
            sessions: p.sessions + 1,
            pageviews: p.pageviews + session.pages,
            events: p.events + session.events,
            lastSeen: t("just now"),
          }));
          setActivity(a =>
            [
              {
                key: next.key + 1000,
                when: t("now"),
                kind: "session" as const,
                detail: `${session.entry} → ${session.exit} · ${formatDuration(session.seconds)}`,
                replay: session.replay,
              },
              ...a,
            ].slice(0, INITIAL_ACTIVITY.length)
          );
          setPulse(true);
          setTimeout(() => setPulse(false), 1200);
        }
        return [next, ...prev.slice(0, VISIBLE)];
      });
      setLiveSeconds(0);
    }, ARRIVAL_MS);
    return () => clearInterval(interval);
  }, [inView, reducedMotion, t]);

  // The newest session is still open: its duration ticks up.
  useEffect(() => {
    if (!inView || reducedMotion) return;
    const interval = setInterval(() => setLiveSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [inView, reducedMotion]);

  const transition = reducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      <Frame
        label="sessions"
        right={
          <>
            <span className="relative inline-flex h-3.5 w-6 items-center rounded-full bg-neutral-300 dark:bg-neutral-700" aria-hidden="true">
              <span className="absolute left-0.5 size-2.5 rounded-full bg-white" />
            </span>
            {t("Identified only")}
            <span className="ml-2 font-mono">{t("Today")}</span>
          </>
        }
      >
        <div className="relative overflow-hidden px-2" style={{ height: ROW_H * VISIBLE + 8 }}>
          <AnimatePresence initial={false}>
            {feed.map((item, index) => {
              const s = SESSIONS[item.template];
              const isLive = index === 0 && item.arrivedAt > 0;
              const Device = s.device === "mobile" ? Smartphone : Monitor;
              return (
                <motion.div
                  key={item.key}
                  initial={{ y: -ROW_H, opacity: 0 }}
                  animate={{ y: index * ROW_H + 8, opacity: index >= VISIBLE ? 0 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition}
                  className="absolute inset-x-2 grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 dark:border-neutral-800 dark:bg-neutral-900/70"
                  style={{ height: ROW_H - 8 }}
                >
                  <Avatar size={28} id={s.id} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                        {s.name ?? t("Anonymous")}
                      </span>
                      <span className="truncate font-mono text-[10px] text-neutral-500 dark:text-neutral-500">
                        {s.name ? s.id : `visitor ${s.id}`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <CountryFlag country={s.country} />
                      <span className="truncate">{s.city}</span>
                      <span aria-hidden="true">·</span>
                      <Browser browser={s.browser} />
                      <OperatingSystem os={s.os} />
                      <Device className="size-3" aria-hidden="true" />
                      <span aria-hidden="true">·</span>
                      <span className="flex min-w-0 items-center gap-1 font-mono">
                        <span className="truncate">{s.entry}</span>
                        <ArrowRight className="size-2.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{s.exit}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                    {isLive ? (
                      <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-neutral-900 dark:text-neutral-100">
                        <span className="relative flex size-1.5" aria-hidden="true">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                        </span>
                        {formatDuration(liveSeconds)}
                      </span>
                    ) : (
                      <span className="font-mono text-xs tabular-nums text-neutral-900 dark:text-neutral-100">
                        {formatDuration(s.seconds)}
                      </span>
                    )}
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="flex items-center gap-0.5">
                        <Eye className="size-2.5" aria-hidden="true" />
                        {s.pages}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Zap className="size-2.5" aria-hidden="true" />
                        {s.events}
                      </span>
                      {s.replay && (
                        <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
                          <Play className="size-2.5" aria-hidden="true" />
                          {t("Replay")}
                        </span>
                      )}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent dark:from-[#0f0f0f]"
          />
        </div>
      </Frame>

      <Frame label="users · ada@acme.com">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <Avatar size={34} id={ADA.id} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {ADA.name}
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                {t("Identified")}
              </span>
            </div>
            <div className="truncate font-mono text-[10px] text-neutral-500">{ADA.id} · user_2b91f0</div>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
            <span>
              {t("First seen")} <span className="text-neutral-800 dark:text-neutral-200">Aug 27</span>
            </span>
            <span>
              {t("Last seen")}{" "}
              <span
                className={cn(
                  "transition-colors duration-500",
                  pulse ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-800 dark:text-neutral-200"
                )}
              >
                {profile.lastSeen}
              </span>
            </span>
          </div>
        </div>
        <div className="grid sm:grid-cols-[1fr_1.5fr]">
          <div className="flex flex-col gap-2 border-b border-neutral-200 p-4 dark:border-neutral-800 sm:border-b-0 sm:border-r">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t("Traits")}</div>
            {TRAITS.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono text-[11px] dark:border-neutral-800 dark:bg-neutral-900/70"
              >
                <span className="text-neutral-500">{k}</span>
                <span className="text-neutral-900 dark:text-neutral-100">{v}</span>
              </div>
            ))}
            <div className="mt-auto flex gap-3 pt-2 text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">
              <span>
                <span className={cn("font-medium transition-colors duration-500", pulse ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-neutral-100")}>
                  {profile.sessions}
                </span>{" "}
                {t("sessions")}
              </span>
              <span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{profile.pageviews}</span> {t("pageviews")}
              </span>
              <span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{profile.events}</span> {t("events")}
              </span>
            </div>
          </div>
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t("Activity")}</div>
            <ol className="mt-2">
              {activity.map((row, index) => (
                <li
                  key={row.key}
                  className={cn(
                    "grid grid-cols-[52px_58px_1fr_14px] items-center gap-2 border-b border-neutral-200/70 py-1.5 text-[11px] last:border-b-0 dark:border-neutral-800/70",
                    index === 0 && row.key >= 1000 && "console-rise"
                  )}
                >
                  <span className="font-mono tabular-nums text-neutral-500">{row.when}</span>
                  <span className={cn("flex items-center gap-1.5", row.kind === "event" ? "text-[var(--dataviz)]" : "text-neutral-500 dark:text-neutral-400")}>
                    <span className={cn("size-1.5 rounded-full", row.kind === "event" ? "bg-[var(--dataviz)]" : "bg-neutral-400 dark:bg-neutral-600")} />
                    {row.kind === "event" ? t("Event") : t("Session")}
                  </span>
                  <span className="truncate font-mono text-neutral-800 dark:text-neutral-200">{row.detail}</span>
                  {row.replay ? <Play className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> : <span />}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Frame>
    </div>
  );
}
