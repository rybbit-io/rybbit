"use client";

import { Film, Pause, Play } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { Browser } from "../Browser";
import { CountryFlag } from "../Country";
import { OperatingSystem } from "../OperatingSystem";
import { Card } from "./Card";
import { DemoFrame } from "./DemoFrame";

// Cursor waypoints in % of the mock page, so the path survives any card
// width. Steps 2 and 4 fire a click ripple at the cursor position.
const PATH = [
  { x: 20, y: 14 },
  { x: 13, y: 40 },
  { x: 30, y: 52, click: true },
  { x: 55, y: 72 },
  { x: 63, y: 84, click: true },
  { x: 26, y: 92 },
];

const STEP_MS = 1600;
const DURATION_S = 138; // fictional 2:18 recording

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionReplay() {
  const t = useExtracted();
  const [isPlaying, setIsPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep(prev => {
        const next = (prev + 1) % PATH.length;
        const waypoint = PATH[next];
        if (waypoint.click) {
          setRipple({ x: waypoint.x, y: waypoint.y });
          setTimeout(() => setRipple(null), 700);
        }
        return next;
      });
    }, STEP_MS);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const cursor = PATH[step];
  const progress = step / (PATH.length - 1);

  return (
    <Card
      title={t("Session Replay")}
      description={t("Watch real user sessions to understand their behavior and identify pain points.")}
      icon={Film}
    >
      <DemoFrame
        label="replay · visitor 4f2a91"
        right={
          <>
            <CountryFlag country="US" />
            <Browser browser="Chrome" />
            <OperatingSystem os="macOS" />
          </>
        }
      >
        {/* The recording: a light mock site regardless of theme, like a video frame */}
        <div className="relative m-2 overflow-hidden rounded border border-neutral-200 dark:border-neutral-800">
          <div className="flex h-6 items-center gap-1.5 border-b border-neutral-200 bg-neutral-100 px-2">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#ff5f57]" />
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#febc2e]" />
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#28c840]" />
            <span className="ml-1 truncate rounded-sm bg-white px-1.5 font-mono text-xs leading-4 text-neutral-500">
              acme.com/products
            </span>
          </div>

          <div className="bg-white p-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-3.5 w-16 rounded-sm bg-neutral-800" />
              <div className="flex gap-2">
                <div className="h-2.5 w-10 rounded-sm bg-neutral-200" />
                <div className="h-2.5 w-10 rounded-sm bg-neutral-200" />
                <div className="h-2.5 w-10 rounded-sm bg-neutral-200" />
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-1.5 h-5 w-40 rounded-sm bg-neutral-800" />
              <div className="mb-2 h-2.5 w-52 max-w-full rounded-sm bg-neutral-200" />
              <div className="h-6 w-20 rounded bg-neutral-900" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(product => (
                <div
                  key={product}
                  className={`rounded bg-neutral-50 p-1.5 transition-all duration-300 motion-reduce:transition-none ${
                    ripple && product === 1 ? "ring-1 ring-neutral-400" : ""
                  }`}
                >
                  <div className="mb-1.5 h-14 rounded-sm bg-neutral-200" />
                  <div className="mb-1 h-2 rounded-sm bg-neutral-200" />
                  <div className="flex items-center justify-between">
                    <div className="h-2 w-8 rounded-sm bg-neutral-300" />
                    <div className="h-4 w-4 rounded-sm bg-neutral-900" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Replayed cursor */}
          <div
            aria-hidden="true"
            className="absolute size-4 -rotate-12 transition-all duration-[1200ms] ease-in-out motion-reduce:transition-none"
            style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-full drop-shadow-sm">
              <path d="M5.5 3.5L20.5 12L12 14.5L9.5 22L5.5 3.5Z" fill="white" stroke="black" strokeWidth="1" />
            </svg>
          </div>

          {ripple && (
            <div
              aria-hidden="true"
              className="absolute size-7 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-blue-500 motion-reduce:animate-none"
              style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
            />
          )}
        </div>

        {/* Player controls */}
        <div className="mt-auto flex h-10 shrink-0 items-center gap-3 border-t border-neutral-200 px-3 dark:border-neutral-800">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? t("Pause replay") : t("Play replay")}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
          >
            {isPlaying ? <Pause className="size-3" /> : <Play className="size-3 translate-x-px" />}
          </button>

          <div className="relative h-1 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-emerald-500 ${
                step === 0
                  ? "" // loop restart: snap back instantly, no reverse glide
                  : "transition-[width] duration-[1600ms] ease-linear motion-reduce:transition-none"
              }`}
              style={{ width: `${progress * 100}%` }}
            />
            {/* Captured click events on the timeline */}
            <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500" />
            <span className="absolute left-[83%] top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500" />
          </div>

          <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
            {formatTime(progress * DURATION_S)} / {formatTime(DURATION_S)}
          </span>
        </div>
      </DemoFrame>
    </Card>
  );
}
