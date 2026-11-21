"use client";

import {
  Copy,
  ExternalLink,
  Eye,
  FileInput,
  Gauge,
  LucideIcon,
  MousePointerClick,
  SquareMousePointer,
  TextCursorInput,
  TriangleAlert,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";

// The same glyphs as components/EventIcons, which paints each type its own
// colour across the app. This page keeps colour for meaning instead: custom
// events in the data hue, errors red, everything else neutral.
const ICONS: Record<string, LucideIcon> = {
  pageview: Eye,
  custom_event: MousePointerClick,
  error: TriangleAlert,
  outbound: ExternalLink,
  button_click: SquareMousePointer,
  copy: Copy,
  form_submit: FileInput,
  input_change: TextCursorInput,
  performance: Gauge,
};

export function EventTypeMark({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? MousePointerClick;

  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "h-4 w-4 shrink-0",
        type === "custom_event"
          ? "text-dataviz"
          : type === "error"
            ? "text-red-500 dark:text-red-400"
            : "text-neutral-500 dark:text-neutral-400",
        className
      )}
    />
  );
}

/** Translated names for the event types: one occurrence, and the type as a group. */
export function useEventTypeLabels() {
  const t = useExtracted();

  const singular: Record<string, string> = {
    pageview: t("Pageview"),
    custom_event: t("Event"),
    outbound: t("Outbound click"),
    button_click: t("Button click"),
    copy: t("Copy"),
    form_submit: t("Form submit"),
    input_change: t("Input change"),
    error: t("Error"),
    performance: t("Performance"),
  };

  const plural: Record<string, string> = {
    pageview: t("Pageviews"),
    custom_event: t("Custom events"),
    outbound: t("Outbound"),
    button_click: t("Button clicks"),
    copy: t("Copies"),
    form_submit: t("Form submits"),
    input_change: t("Input changes"),
    error: t("Errors"),
    performance: t("Performance"),
  };

  return { singular, plural };
}
