import { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import { getTimezone } from "@/lib/store";

function getHour12ForLocale(locale: string): boolean {
  const resolved = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions();
  return resolved.hourCycle === "h12";
}

export function useDateTimeFormat() {
  const locale = useLocale();
  const hour12 = useMemo(() => getHour12ForLocale(locale), [locale]);

  const formatDateTime = useMemo(
    () =>
      (dt: DateTime, options: Intl.DateTimeFormatOptions): string =>
        new Intl.DateTimeFormat(locale, options).format(dt.toJSDate()),
    [locale]
  );

  const formatRelative = useMemo(
    () =>
      (dt: DateTime): string =>
        dt.setLocale(locale).toRelative() ??
        new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(dt.toJSDate()),
    [locale]
  );

  const formatChartDateTime = useMemo(() => {
    return (dt: DateTime, bucket: TimeBucket): string => {
      const showMinutes = [
        "minute",
        "five_minutes",
        "ten_minutes",
        "fifteen_minutes",
        "hour",
      ].includes(bucket);
      const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        hour: "numeric",
        hour12,
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
      if (
        bucket === "fifteen_minutes" ||
        bucket === "ten_minutes" ||
        bucket === "five_minutes" ||
        bucket === "minute"
      ) {
        options.minute = "numeric";
        options.hour = "numeric";
      }
      return new Intl.DateTimeFormat(locale, options).format(dt.toJSDate());
    };
  }, [locale, hour12]);

  return { locale, hour12, formatDateTime, formatRelative, formatChartDateTime };
}
