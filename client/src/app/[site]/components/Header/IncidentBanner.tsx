"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "incident-banner-2026-05-14-dismissed";

// 2026-05-14, 9:25 AM – 2:15 PM Pacific. May is PDT (UTC-7).
const INCIDENT_START = new Date("2026-05-14T09:25:00-07:00");
const INCIDENT_END = new Date("2026-05-14T14:15:00-07:00");

function formatRange(start: Date, end: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  const startFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endFmt = new Intl.DateTimeFormat(undefined, {
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return `${startFmt.format(start)} – ${endFmt.format(end)}`;
}

export function IncidentBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [range, setRange] = useState("");

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
    setRange(formatRange(INCIDENT_START, INCIDENT_END));
  }, []);

  if (dismissed || !range) return null;

  return (
    <div className="mt-4 px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40 text-sm flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
          We're sorry — Rybbit experienced a service degradation due to a DDoS attack from {range}. We've put up safeguards against future attacks. Thank you for your patience.
        </span>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "true");
          setDismissed(true);
        }}
        className="ml-4 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 transition-colors shrink-0 cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
