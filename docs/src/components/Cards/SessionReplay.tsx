"use client";

import { Card } from "./Card";
import { Film, Pause, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { useExtracted } from "next-intl";

export function SessionReplay() {
  const t = useExtracted();
  const [isPlaying, setIsPlaying] = useState(true);
  const [cursorPosition, setCursorPosition] = useState({ x: 48, y: 32 });
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Animate cursor movement
      setCursorPosition(prev => {
        const paths = [
          { x: 48, y: 32 },
          { x: 120, y: 80 },
          { x: 40, y: 120 },
          { x: 120, y: 120 },
          { x: 200, y: 120 },
          { x: 120, y: 180 },
        ];
        const currentIndex = paths.findIndex(p => p.x === prev.x && p.y === prev.y);
        const nextIndex = (currentIndex + 1) % paths.length;

        // Trigger click effect on product
        if (nextIndex === 3) {
          setClickPosition({ x: 120, y: 120 });
          setHoveredProduct(1);
          setTimeout(() => {
            setClickPosition(null);
            setHoveredProduct(null);
          }, 600);
        }

        return paths[nextIndex];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <Card
      title={t("Session Replay")}
      description={t("Watch real user sessions to understand their behavior and identify pain points.")}
      icon={Film}
    >
      <div className="ml-4 mt-6 -mb-8 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Video player container */}
        <div className="relative">
          {/* Mock website content */}
          <div className="relative overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-neutral-200 dark:bg-neutral-800 h-7 flex items-center px-2 gap-2 rounded-t-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 mx-3">
                <div className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-900 dark:bg-neutral-700 dark:text-neutral-300">
                  https://example.com/products
                </div>
              </div>
            </div>

            {/* Mock website content */}
            <div className="p-3 bg-white">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-20 h-4 bg-neutral-300 rounded"></div>
                <div className="flex gap-3">
                  <div className="w-12 h-3 bg-neutral-200 rounded"></div>
                  <div className="w-12 h-3 bg-neutral-200 rounded"></div>
                  <div className="w-12 h-3 bg-neutral-200 rounded"></div>
                </div>
              </div>

              {/* Hero section */}
              <div className="mb-4">
                <div className="w-40 h-6 bg-neutral-800 rounded mb-1.5"></div>
                <div className="w-52 h-3 bg-neutral-200 rounded"></div>
              </div>

              {/* Product grid */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`rounded bg-neutral-100 p-1.5 transition-all duration-300 motion-reduce:transition-none ${
                    hoveredProduct === 0 ? "scale-[1.02] ring-1 ring-neutral-400" : ""
                  }`}
                >
                  <div className="w-full h-16 bg-neutral-300 rounded mb-1.5"></div>
                  <div className="w-full h-2 bg-neutral-200 rounded mb-1"></div>
                  <div className="w-12 h-2 bg-emerald-500 rounded"></div>
                </div>
                <div
                  className={`rounded bg-neutral-100 p-1.5 transition-all duration-300 motion-reduce:transition-none ${
                    hoveredProduct === 1 ? "scale-[1.02] ring-1 ring-neutral-400" : ""
                  }`}
                >
                  <div className="w-full h-16 bg-neutral-300 rounded mb-1.5 relative">
                    <div className="absolute top-0.5 left-0.5 w-6 h-2 bg-red-500 rounded"></div>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 rounded mb-1"></div>
                  <div className="w-12 h-2 bg-emerald-500 rounded"></div>
                </div>
                <div
                  className={`rounded bg-neutral-100 p-1.5 transition-all duration-300 motion-reduce:transition-none ${
                    hoveredProduct === 2 ? "scale-[1.02] ring-1 ring-neutral-400" : ""
                  }`}
                >
                  <div className="w-full h-16 bg-neutral-300 rounded mb-1.5"></div>
                  <div className="w-full h-2 bg-neutral-200 rounded mb-1"></div>
                  <div className="w-12 h-2 bg-emerald-500 rounded"></div>
                </div>
              </div>
            </div>

            {/* Mouse cursor */}
            <div
              className="absolute size-4 -rotate-12 transform transition-all duration-1000 ease-in-out motion-reduce:transition-none"
              style={{
                left: `${cursorPosition.x}px`,
                top: `${cursorPosition.y}px`,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                <path d="M5.5 3.5L20.5 12L12 14.5L9.5 22L5.5 3.5Z" fill="white" stroke="black" strokeWidth="1" />
              </svg>
            </div>

            {/* Click ripple effect */}
            {clickPosition && (
              <div
                className="absolute size-8 animate-ping rounded-full border-2 border-blue-500 motion-reduce:animate-none"
                style={{
                  left: `${clickPosition.x - 16}px`,
                  top: `${clickPosition.y - 16}px`,
                }}
              ></div>
            )}

            {/* Scroll indicator */}
            {isPlaying && cursorPosition.y > 160 && (
              <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                {t("Scrolling...")}
              </div>
            )}
          </div>
        </div>

        {/* Video controls */}
        <div className="bg-neutral-100 p-2 pb-10 dark:bg-neutral-800">
          <div className="flex items-center gap-3">
            {/* Play/Pause button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-1.5 transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Progress bar */}
            <div className="flex-1">
              <div className="relative h-1 bg-neutral-400 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-1/2 bg-emerald-500 rounded-full"></div>
              </div>
            </div>

            {/* Time display */}
            <div className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">2:34 / 5:12</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
