import { useExtracted } from "next-intl";
import type { DashboardDefaultTimeRange } from "@/lib/defaultTimeRange";

/**
 * The preset list, grouped. The groups are drawn as separators rather than
 * named headings — their contents say what they are, and it keeps the rail as
 * quiet as the dropdown it replaces.
 *
 * Ten presets rather than the seventeen there used to be: a list this short is
 * one people learn rather than scan, and every window it dropped (1h, 6h, 3d,
 * 14d, 60d) is a count back from now that the search box now takes typed —
 * see `parseTypedWindow`. Last week and last month are not counts, so they
 * stay a click away in the calendar. Every dropped preset keeps its label and
 * resolver so a stored default or URL param still names itself.
 *
 * `realtime` is dropped when a caller passes `pastMinutesEnabled={false}`.
 */
export type PresetGroupId = "realtime" | "relative" | "calendar";

export const PRESET_GROUPS: { id: PresetGroupId; presets: DashboardDefaultTimeRange[] }[] = [
  { id: "realtime", presets: ["last-30-minutes", "last-24-hours"] },
  { id: "relative", presets: ["today", "yesterday", "last-7-days", "last-30-days"] },
  { id: "calendar", presets: ["this-week", "this-month", "this-year", "all-time"] },
];

/**
 * One place that names a preset, shared by the menu and by the trigger label —
 * they used to be two switch statements that had already drifted apart.
 */
export function usePresetLabels(): Record<DashboardDefaultTimeRange, string> {
  const t = useExtracted();

  return {
    today: t("Today"),
    yesterday: t("Yesterday"),
    "last-3-days": t("Last 3 Days"),
    "last-7-days": t("Last 7 Days"),
    "last-14-days": t("Last 14 Days"),
    "last-30-days": t("Last 30 Days"),
    "last-60-days": t("Last 60 Days"),
    "last-30-minutes": t("Last 30 Minutes"),
    "last-1-hour": t("Last 1 Hour"),
    "last-6-hours": t("Last 6 Hours"),
    "last-24-hours": t("Last 24 Hours"),
    "this-week": t("This Week"),
    "last-week": t("Last Week"),
    "this-month": t("This Month"),
    "last-month": t("Last Month"),
    "this-year": t("This Year"),
    "all-time": t("All Time"),
  };
}

/**
 * Single-key shortcuts. The letters follow Plausible's scheme (D/E/W/T/M/Y/A)
 * so anyone arriving from there keeps their muscle memory; the two realtime
 * windows and the custom picker fill the gaps. Only This Week has no key.
 */
export const PRESET_HOTKEYS = {
  d: "today",
  e: "yesterday",
  h: "last-24-hours",
  w: "last-7-days",
  t: "last-30-days",
  m: "this-month",
  y: "this-year",
  a: "all-time",
  r: "last-30-minutes",
} as const satisfies Record<string, DashboardDefaultTimeRange>;

export type PresetHotkey = keyof typeof PRESET_HOTKEYS;

/** Opens the panel for a custom range. */
export const CUSTOM_RANGE_HOTKEY = "c";

export const HOTKEY_FOR_PRESET: Partial<Record<DashboardDefaultTimeRange, PresetHotkey>> = Object.fromEntries(
  (Object.entries(PRESET_HOTKEYS) as [PresetHotkey, DashboardDefaultTimeRange][]).map(([key, preset]) => [preset, key])
);
