import { TimeBucket } from "@rybbit/shared";
import { DateTime, Duration, DurationLikeObject, Settings } from "luxon";
import { getTimezone } from "./store";

// Detect user locale from the browser environment (fallback to 'en-US' on server)
export const userLocale = typeof navigator !== "undefined" ? navigator.language : "en-US";

// Detect whether the user prefers 12-hour time format (true = 12h, false = 24h)
const resolved = new Intl.DateTimeFormat(userLocale, {
  hour: "numeric",
}).resolvedOptions();
export const hour12 = resolved.hourCycle === "h12";

// Detect user's timezone (not exported but used internally)
export const timeZone = Intl.DateTimeFormat(userLocale).resolvedOptions().timeZone;

// Set default locale for Luxon globally
Settings.defaultLocale = userLocale;

/**
 * Returns localized weekday names, starting from Monday.
 *
 * @param locale - The locale to use (e.g., "en-US", "uk-UA").
 * @param format - The weekday format: "narrow" | "short" | "long".
 * @returns An array of localized weekday names from Monday to Sunday.
 */
function getLocalizedWeekdayNames(locale: string, format: "narrow" | "short" | "long" = "long"): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format });

  // Fallback in case Intl fails
  const fallback: Record<"narrow" | "short" | "long", string[]> = {
    narrow: ["M", "T", "W", "T", "F", "S", "S"],
    short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    long: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  };

  const today = new Date();
  const startDay = 1; // Monday

  return Array.from({ length: 7 }, (_, i) => {
    const day = startDay + i;
    const date = new Date(today);
    date.setDate(today.getDate() + ((day - today.getDay() + 7) % 7));

    const parts = formatter.formatToParts(date);
    const weekday = parts.find(part => part.type === "weekday");

    return weekday?.value ?? fallback[format][i];
  });
}

/**
 * Returns an array of 24 localized hour labels (e.g., "0", "12 AM", "1 PM")
 * based on locale and given formatting options.
 *
 * @param locale - The locale to use (e.g., "en-US", "uk-UA").
 * @param options - Intl.DateTimeFormat options (e.g., { hour: "numeric", hour12: true }).
 * @returns An array of 24 formatted hour strings.
 */
function getLocalizedTimeLabels(locale: string, options: Intl.DateTimeFormatOptions): string[] {
  const formatter = new Intl.DateTimeFormat(locale, options);

  return Array.from({ length: 24 }, (_, hour) => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return formatter.format(date);
  });
}

/**
 * Formats a duration in seconds to a human-readable string.
 *
 * @param duration - Duration in seconds.
 * @returns Human-readable duration string (e.g., "1 min, 30 sec").
 */
export function formatDuration(duration: number): string {
  // Prepare duration parts in seconds and optionally minutes.
  const units: Record<string, number> = {
    seconds: Math.round(duration % 60),
  };

  if (duration > 59) {
    units.minutes = Math.floor(duration / 60);
  }

  // Choose which units to show: only "seconds" or both "minutes" and "seconds".
  const keys: (keyof DurationLikeObject)[] = duration > 59 ? ["minutes", "seconds"] : ["seconds"];

  // Convert to Luxon duration object and format to human-readable string.
  const luxonDuration = Duration.fromObject(units)
    .shiftTo(...keys)
    .normalize();

  return luxonDuration.toHuman({
    listStyle: "narrow",
    unitDisplay: "short",
  });
}

/**
 * Formats a duration in seconds to a compact string using short units.
 *
 * @param seconds - Duration in seconds.
 * @returns Compact duration string (e.g., "1m 10s", "45s").
 */
export function formatShortDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);

  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

/**
 * Formats a given hour and minute into a localized time string
 * (e.g., "11:00 AM" or "23:00"), using the detected `hour12` preference.
 *
 * @param hour - Hour of the day (0–23).
 * @param minute - Minute of the hour (0–59).
 * @returns Localized time string.
 */
export const formatLocalTime = (hour: number, minute: number): string => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: hour12,
  });

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return formatter.format(date);
};

// --- Precomputed localized data ---

// Full weekday names (e.g., "Monday", "Tuesday")
export const longDayNames: string[] = getLocalizedWeekdayNames(userLocale, "long");

// Short weekday names (e.g., "Mon", "Tue")
export const shortDayNames: string[] = getLocalizedWeekdayNames(userLocale, "short");

// Hour-only labels (e.g., "00", "01", "02", "1 AM", "2 PM")
export const hourLabels: string[] = getLocalizedTimeLabels(userLocale, {
  hour: "numeric",
  hour12: hour12,
});

// Full hour:minute labels (e.g., "00:00", "01:00", "1:00 AM", "2:00 PM")
export const hourMinuteLabels: string[] = getLocalizedTimeLabels(userLocale, {
  hour: "numeric",
  minute: "2-digit",
  hour12: hour12,
});

export const formatChartDateTime = (dt: DateTime, bucket: TimeBucket) => {
  const showMinutes = ["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour"].includes(bucket);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    hour12: hour12,
    timeZone: getTimezone(),
  };
  if (showMinutes && !hour12) {
    options.minute = "numeric";
  }
  if (bucket === "day") {
    options.minute = undefined;
    options.hour = undefined;
    options.weekday = "short";
  }
  if (bucket === "fifteen_minutes" || bucket === "ten_minutes" || bucket === "five_minutes" || bucket === "minute") {
    options.minute = "numeric";
    options.hour = "numeric";
  }
  return new Intl.DateTimeFormat(userLocale, options).format(dt.toJSDate());
};

/**
 * Converts a UTC timestamp string to user's selected timezone for display
 * @param timestamp - UTC timestamp string from the server
 * @returns DateTime object in user's selected timezone
 */
export const parseUtcTimestamp = (timestamp: string): DateTime => {
  return DateTime.fromSQL(timestamp, { zone: "utc" }).setZone(getTimezone());
};

// Timezones with GMT offset and city name
export const timezones = [
  { value: "system", label: "System" },
  { value: "Pacific/Honolulu", label: "GMT-10 Pacific/Honolulu" },
  { value: "America/Anchorage", label: "GMT-9 America/Anchorage" },
  { value: "America/Los_Angeles", label: "GMT-8 America/Los_Angeles" },
  { value: "America/Denver", label: "GMT-7 America/Denver" },
  { value: "America/Chicago", label: "GMT-6 America/Chicago" },
  { value: "America/New_York", label: "GMT-5 America/New_York" },
  { value: "America/Halifax", label: "GMT-4 America/Halifax" },
  { value: "America/Sao_Paulo", label: "GMT-3 America/Sao_Paulo" },
  { value: "Atlantic/South_Georgia", label: "GMT-2 Atlantic/South_Georgia" },
  { value: "Atlantic/Azores", label: "GMT-1 Atlantic/Azores" },
  { value: "UTC", label: "GMT+0 UTC" },
  { value: "Europe/London", label: "GMT+0 Europe/London" },
  { value: "Europe/Paris", label: "GMT+1 Europe/Paris" },
  { value: "Europe/Berlin", label: "GMT+1 Europe/Berlin" },
  { value: "Europe/Helsinki", label: "GMT+2 Europe/Helsinki" },
  { value: "Europe/Moscow", label: "GMT+3 Europe/Moscow" },
  { value: "Asia/Dubai", label: "GMT+4 Asia/Dubai" },
  { value: "Asia/Karachi", label: "GMT+5 Asia/Karachi" },
  { value: "Asia/Kolkata", label: "GMT+5:30 Asia/Kolkata" },
  { value: "Asia/Dhaka", label: "GMT+6 Asia/Dhaka" },
  { value: "Asia/Bangkok", label: "GMT+7 Asia/Bangkok" },
  { value: "Asia/Singapore", label: "GMT+8 Asia/Singapore" },
  { value: "Asia/Shanghai", label: "GMT+8 Asia/Shanghai" },
  { value: "Asia/Tokyo", label: "GMT+9 Asia/Tokyo" },
  { value: "Australia/Sydney", label: "GMT+10 Australia/Sydney" },
  { value: "Pacific/Auckland", label: "GMT+12 Pacific/Auckland" },
];

// Get timezone label for display
export const getTimezoneLabel = (value: string): string => {
  if (value === "system") {
    return `System (${timeZone})`;
  }
  const tz = timezones.find((t) => t.value === value);
  return tz?.label ?? value;
};
