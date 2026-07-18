"use client";

import { Card, CardViewport } from "./Card";
import { Play, Pause, Film } from "lucide-react";
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
      <CardViewport>
        {/* Browser chrome */}
        <div className="flex h-8 items-center gap-3 border-b border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <span className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <span className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          </div>
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            https://example.com/products
          </span>
        </div>

        {/* Mock website content */}
        <div className="relative bg-white p-3">
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
              className={`bg-neutral-100 rounded p-1.5 transition-all duration-300 ${
                hoveredProduct === 0 ? "shadow-lg scale-105" : ""
              }`}
            >
              <div className="w-full h-14 bg-neutral-300 rounded mb-1.5"></div>
              <div className="w-full h-2 bg-neutral-200 rounded mb-1"></div>
              <div className="w-12 h-2 bg-emerald-500 rounded"></div>
            </div>
            <div
              className={`bg-neutral-100 rounded p-1.5 transition-all duration-300 ${
                hoveredProduct === 1 ? "shadow-lg scale-105" : ""
              }`}
            >
              <div className="w-full h-14 bg-neutral-300 rounded mb-1.5 relative">
                <div className="absolute top-0.5 left-0.5 w-6 h-2 bg-red-500 rounded"></div>
              </div>
              <div className="w-full h-2 bg-neutral-200 rounded mb-1"></div>
              <div className="w-12 h-2 bg-emerald-500 rounded"></div>
            </div>
            <div
              className={`bg-neutral-100 rounded p-1.5 transition-all duration-300 ${
                hoveredProduct === 2 ? "shadow-lg scale-105" : ""
              }`}
            >
              <div className="w-full h-14 bg-neutral-300 rounded mb-1.5"></div>
              <div className="w-full h-2 bg-neutral-200 rounded mb-1"></div>
              <div className="w-12 h-2 bg-emerald-500 rounded"></div>
            </div>
          </div>
        </div>

        {/* Mouse cursor */}
        <div
          className="absolute w-4 h-4 transform -rotate-12 transition-all duration-1000 ease-in-out"
          style={{
            left: `${cursorPosition.x}px`,
            top: `${cursorPosition.y + 32}px`,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
            <path d="M5.5 3.5L20.5 12L12 14.5L9.5 22L5.5 3.5Z" fill="white" stroke="black" strokeWidth="1" />
          </svg>
        </div>

        {/* Click ripple effect */}
        {clickPosition && (
          <div
            className="absolute w-8 h-8 rounded-full border-2 border-blue-500 animate-ping"
            style={{
              left: `${clickPosition.x - 16}px`,
              top: `${clickPosition.y + 32 - 16}px`,
            }}
          ></div>
        )}

        {/* Replay controls — pinned to the bottom of the viewport */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-1.5 transition-colors"
            aria-label={isPlaying ? t("Pause replay") : t("Play replay")}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <div className="flex-1">
            <div className="relative h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1/2 bg-emerald-500 rounded-full"></div>
            </div>
          </div>

          <div className="text-[10px] text-neutral-600 dark:text-neutral-400 tabular-nums">2:34 / 5:12</div>
        </div>
      </CardViewport>
    </Card>
  );
}
