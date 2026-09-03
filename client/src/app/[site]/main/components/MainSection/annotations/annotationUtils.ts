import type { Annotation, AnnotationColor } from "@rybbit/shared";
import { DateTime } from "luxon";

// Mirrors ANNOTATION_COLORS in @rybbit/shared, which the client imports for
// types only (its runtime values would force Turbopack to bundle the
// workspace package). Keep the two in sync.
export const ANNOTATION_COLOR_OPTIONS: AnnotationColor[] = ["amber", "rose", "sky", "violet", "lime"];
export const ANNOTATION_ICON_OPTIONS = ["🚀", "🏷️", "📣", "🧪", "🐛", "✉️", "📰", "🔥", "✨", "🛠️"];

/** Marker color for the chart, tuned per theme. Neutral when unset. */
export function annotationColor(color: AnnotationColor | null | undefined, isDark: boolean): string {
  if (!color) return isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-500))";
  return `hsl(var(--${color}-${isDark ? 400 : 600}))`;
}

/** Swatch color for the form; the 500 step reads the same on both themes. */
export function annotationSwatch(color: AnnotationColor | null): string {
  return color ? `hsl(var(--${color}-500))` : "hsl(var(--neutral-400))";
}

/**
 * Annotation timestamps are ISO 8601 from the API, but a timestamptz read in
 * string mode can also arrive as Postgres text ("2026-08-18 07:00:00+00").
 */
export function parseAnnotationInstant(value: string): DateTime {
  const iso = DateTime.fromISO(value, { zone: "utc" });
  return iso.isValid ? iso : DateTime.fromSQL(value, { zone: "utc" });
}

function toZoned(value: string, timezone: string): DateTime {
  return parseAnnotationInstant(value).setZone(timezone);
}

const graphemes = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/** The last single visible character typed or pasted, or null if there is none. */
export function pickIconFromInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = graphemes ? [...graphemes.segment(trimmed)].map(part => part.segment) : Array.from(trimmed);
  return parts[parts.length - 1] ?? null;
}

function isStartOfDay(dt: DateTime): boolean {
  return dt.equals(dt.startOf("day"));
}

// Ranges are stored as [start of day, end of day], so an end that sits on the
// last millisecond of its day is a whole-day end and prints as a date.
function isEndOfDay(dt: DateTime): boolean {
  return dt.equals(dt.endOf("day"));
}

export function formatAnnotationDate(annotation: Annotation, timezone: string): string {
  const start = toZoned(annotation.date, timezone);
  const startText = start.toLocaleString(isStartOfDay(start) ? DateTime.DATE_MED : DateTime.DATETIME_MED);
  if (!annotation.endDate) return startText;
  const end = toZoned(annotation.endDate, timezone);
  const endText = end.toLocaleString(isEndOfDay(end) ? DateTime.DATE_MED : DateTime.DATETIME_MED);
  return `${startText} – ${endText}`;
}

/** Calendar date (YYYY-MM-DD) of an instant in the user's timezone, for date inputs. */
export function toDateInput(iso: string, timezone: string): string {
  return toZoned(iso, timezone).toISODate() ?? "";
}

export type PositionedAnnotation = {
  annotation: Annotation;
  x: number;
  /** Right edge of a range annotation, in plot px. */
  x2: number | null;
  y: number;
};

export type AnnotationCluster = {
  key: string;
  x: number;
  /** Highest data point among the members, so the pin sits above the line. */
  y: number;
  items: PositionedAnnotation[];
};

/** Merge pins that would overlap (closer than `gap` px) into one counted pin. */
export function clusterAnnotations(items: PositionedAnnotation[], gap: number): AnnotationCluster[] {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const groups: { x0: number; x: number; y: number; items: PositionedAnnotation[] }[] = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (last && item.x - last.x0 < gap) {
      last.items.push(item);
      last.x = (last.x0 + item.x) / 2;
      last.y = Math.min(last.y, item.y);
    } else {
      groups.push({ x0: item.x, x: item.x, y: item.y, items: [item] });
    }
  }
  return groups.map(group => ({
    key: group.items.map(item => item.annotation.annotationId).join("-"),
    x: group.x,
    y: group.y,
    items: group.items,
  }));
}
