"use client";

import {
  Copy,
  ExternalLink,
  Eye,
  MousePointerClick,
  Send,
  SquareDashedMousePointer,
  TextCursorInput,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "./Card";
import { DemoFrame, LiveDot } from "./DemoFrame";

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 6;

// One entry per autocaptured event type (lib/events.ts vocabulary), plus a
// custom event to show manual tracking still composes with autocapture.
// Detail strings are product artifacts and stay untranslated by design.
const EVENT_TEMPLATES = [
  {
    icon: Eye,
    detail: "/pricing",
    iconClassName: "text-blue-600 dark:text-blue-400",
    chipClassName: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  {
    icon: MousePointerClick,
    detail: '"Start free trial"',
    iconClassName: "text-green-600 dark:text-green-400",
    chipClassName: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  {
    icon: Send,
    detail: "form#signup · 4 fields",
    iconClassName: "text-purple-600 dark:text-purple-400",
    chipClassName: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
  {
    icon: ExternalLink,
    detail: "github.com/rybbit-io",
    iconClassName: "text-lime-600 dark:text-lime-400",
    chipClassName: "bg-lime-500/10 text-lime-700 dark:text-lime-400",
  },
  {
    icon: Copy,
    detail: '"npm install @rybbit/js"',
    iconClassName: "text-sky-600 dark:text-sky-400",
    chipClassName: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  {
    icon: TextCursorInput,
    detail: "input[type=email]",
    iconClassName: "text-pink-600 dark:text-pink-400",
    chipClassName: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  },
  {
    icon: TriangleAlert,
    detail: "TypeError: cart is undefined",
    iconClassName: "text-red-600 dark:text-red-400",
    chipClassName: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  {
    icon: Zap,
    detail: "checkout_completed",
    iconClassName: "text-amber-600 dark:text-amber-400",
    chipClassName: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
];

interface FeedItem {
  key: number;
  template: number;
}

export function Autocapture() {
  const t = useExtracted();
  const prefersReducedMotion = useReducedMotion();

  // Chip labels are UI copy, translated; index-aligned with EVENT_TEMPLATES.
  const typeLabels = [
    t("Pageview"),
    t("Button click"),
    t("Form submit"),
    t("Outbound link"),
    t("Copy"),
    t("Input change"),
    t("Error"),
    t("Custom event"),
  ];

  // Newest first. Deterministic cycle so every event type gets its moment
  // and server/client renders agree.
  const [feed, setFeed] = useState<FeedItem[]>(() =>
    Array.from({ length: VISIBLE_ROWS }, (_, i) => ({ key: VISIBLE_ROWS - 1 - i, template: VISIBLE_ROWS - 1 - i }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setFeed(prev => {
        const next: FeedItem = {
          key: prev[0].key + 1,
          template: (prev[0].template + 1) % EVENT_TEMPLATES.length,
        };
        // Keep one extra row so the exiting item fades under the mask.
        return [next, ...prev.slice(0, VISIBLE_ROWS)];
      });
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <Card
      title={t("Autocapture")}
      description={t(
        "Clicks, form submits, copied text, outbound links, and errors. All captured automatically, with zero instrumentation."
      )}
      icon={SquareDashedMousePointer}
    >
      <DemoFrame label="events · autocapture" right={<><LiveDot />{t("Live")}</>}>
        <div className="relative overflow-hidden px-3" style={{ height: ROW_HEIGHT * VISIBLE_ROWS }}>
          <AnimatePresence initial={false}>
            {feed.map((item, index) => {
              const template = EVENT_TEMPLATES[item.template];
              const Icon = template.icon;
              return (
                <motion.div
                  key={item.key}
                  initial={{ y: -ROW_HEIGHT, opacity: 0 }}
                  animate={{ y: index * ROW_HEIGHT, opacity: index >= VISIBLE_ROWS ? 0 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition}
                  className="absolute inset-x-3 flex items-center gap-2.5 border-b border-neutral-200/60 dark:border-neutral-800/60"
                  style={{ height: ROW_HEIGHT }}
                >
                  <Icon size={14} className={`shrink-0 ${template.iconClassName}`} aria-hidden="true" />
                  <span className="truncate font-mono text-xs text-neutral-700 dark:text-neutral-300">
                    {template.detail}
                  </span>
                  <span
                    className={`ml-auto shrink-0 rounded px-1.5 py-0.5 text-xs font-medium leading-4 ${template.chipClassName}`}
                  >
                    {typeLabels[item.template]}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent dark:from-neutral-950"
          />
        </div>
      </DemoFrame>
    </Card>
  );
}
