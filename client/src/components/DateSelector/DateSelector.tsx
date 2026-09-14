"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hour12 } from "@/lib/dateTimeUtils";
import { getDashboardTimeForRange, setStoredDashboardDefaultTimeRange } from "@/lib/defaultTimeRange";
import { useStore, useTimezone } from "@/lib/store";
import { Calendar } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { RangePanel } from "./RangePanel";
import { PRESET_GROUPS, usePresetLabels } from "./presets";
import { Time } from "./types";
import { useDatePresetHotkeys } from "./useDatePresetHotkeys";
import { TimeBucket } from "@rybbit/shared";

const stepDateTimeBucket = (dt: DateTime, bucket: TimeBucket, direction: 1 | -1): DateTime => {
  const n = direction;
  switch (bucket) {
    case "minute":
      return dt.plus({ minutes: n });
    case "five_minutes":
      return dt.plus({ minutes: 5 * n });
    case "ten_minutes":
      return dt.plus({ minutes: 10 * n });
    case "fifteen_minutes":
      return dt.plus({ minutes: 15 * n });
    case "hour":
      return dt.plus({ hours: n });
    case "day":
      return dt.plus({ days: n });
    case "week":
      return dt.plus({ weeks: n });
    case "month":
      return dt.plus({ months: n });
    case "year":
      return dt.plus({ years: n });
  }
};

export function DateSelector({
  time,
  setTime: setSelectedTime,
  pastMinutesEnabled = true,
  hotkeys = true,
}: {
  time: Time;
  setTime: (time: Time) => void;
  pastMinutesEnabled?: boolean;
  /** Single-key preset shortcuts (see `PRESET_HOTKEYS`). Off for selectors that live inside another form. */
  hotkeys?: boolean;
}) {
  const { timezone, setTimezone, bucket, comparison, setComparison } = useStore();
  const zone = useTimezone();
  const t = useExtracted();
  const presetLabels = usePresetLabels();
  const [open, setOpen] = useState(false);

  const setTime = (nextTime: Time) => {
    if (nextTime.wellKnown) {
      setStoredDashboardDefaultTimeRange(nextTime.wellKnown);
    }

    setSelectedTime(nextTime);
  };

  useDatePresetHotkeys(
    useMemo(
      () =>
        hotkeys
          ? {
              onPreset: preset => {
                setTime(getDashboardTimeForRange(preset, zone));
                setOpen(false);
              },
              onCustom: () => setOpen(true),
              enabled: preset =>
                pastMinutesEnabled || !PRESET_GROUPS.some(g => g.id === "realtime" && g.presets.includes(preset)),
            }
          : null,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [hotkeys, zone, pastMinutesEnabled, setSelectedTime]
    )
  );

  const getLabel = (time: Time) => {
    if (time.wellKnown) {
      return presetLabels[time.wellKnown];
    }

    const now = DateTime.now().setZone(zone);

    if (time.mode === "range") {
      if (time.startTime && time.endTime) {
        const start = DateTime.fromISO(`${time.startDate}T${time.startTime}`, { zone });
        const endExclusive = DateTime.fromISO(`${time.endDate}T${time.endTime}`, { zone });
        const displayEnd = stepDateTimeBucket(endExclusive, bucket, -1);
        const end = displayEnd > start ? displayEnd : endExclusive;
        const startFormatted = start.toFormat(hour12 ? "MMM d, h:mm a" : "MMM d, HH:mm");
        const endFormatted =
          start.toISODate() === end.toISODate()
            ? end.toFormat(hour12 ? "h:mm a" : "HH:mm")
            : end.toFormat(hour12 ? "MMM d, h:mm a" : "MMM d, HH:mm");
        return `${startFormatted} - ${endFormatted}`;
      }

      const start = DateTime.fromISO(time.startDate);
      const end = DateTime.fromISO(time.endDate);
      const startFormatted = start.toFormat("EEEE, MMM d");
      if (start.toISODate() === end.toISODate()) return startFormatted;
      const endFormatted = end.toFormat("EEEE, MMM d");
      return `${startFormatted} - ${endFormatted}`;
    }

    if (time.mode === "past-minutes") {
      // A window stepped back no longer ends at now, so name the stretch it
      // covers — "Last 30 minutes" would read as live when it isn't.
      if (time.pastMinutesEnd > 0) {
        const start = now.minus({ minutes: time.pastMinutesStart });
        const end = now.minus({ minutes: time.pastMinutesEnd });
        const clock = hour12 ? "h:mm a" : "HH:mm";
        const withDate = `MMM d, ${clock}`;
        const startFormatted = start.hasSame(now, "day") ? start.toFormat(clock) : start.toFormat(withDate);
        const endFormatted = end.hasSame(start, "day") ? end.toFormat(clock) : end.toFormat(withDate);
        return `${startFormatted} - ${endFormatted}`;
      }

      // Whole hours read as hours; a typed 90m keeps its minutes rather than
      // rounding down to "Last 1 hours".
      if (time.pastMinutesStart >= 60 && time.pastMinutesStart % 60 === 0) {
        return t("Last {hours} hours", { hours: String(time.pastMinutesStart / 60) });
      }
      return t("Last {minutes} minutes", { minutes: String(time.pastMinutesStart) });
    }

    if (time.mode === "day") {
      if (time.day === now.toISODate()) return t("Today");
      if (time.day === now.minus({ days: 1 }).toISODate()) return t("Yesterday");
      return DateTime.fromISO(time.day).toFormat("EEEE, MMM d");
    }
    if (time.mode === "week") {
      if (time.week === now.startOf("week").toISODate()) return t("This Week");
      if (time.week === now.minus({ weeks: 1 }).startOf("week").toISODate()) return t("Last Week");
      const startDate = DateTime.fromISO(time.week).toFormat("EEEE, MMM d");
      const endDate = DateTime.fromISO(time.week).endOf("week").toFormat("EEEE, MMM d");
      return `${startDate} - ${endDate}`;
    }
    if (time.mode === "month") {
      if (time.month === now.startOf("month").toISODate()) return t("This Month");
      if (time.month === now.minus({ months: 1 }).startOf("month").toISODate()) return t("Last Month");
      return DateTime.fromISO(time.month).toFormat("MMMM yyyy");
    }
    if (time.mode === "year") {
      if (time.year === now.startOf("year").toISODate()) return t("This Year");
      return DateTime.fromISO(time.year).toFormat("yyyy");
    }
    if (time.mode === "all-time") {
      return t("All Time");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm">
          <Calendar className="hidden sm:block w-4 h-4" />
          {getLabel(time)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <RangePanel
          // Switching timezone re-resolves a preset in the store (Today becomes
          // a different day), so the panel has to re-seed its draft from that
          // new value — keeping the old one would apply yesterday's date.
          key={timezone}
          time={time}
          zone={zone}
          timezone={timezone}
          setTimezone={setTimezone}
          comparison={comparison}
          pastMinutesEnabled={pastMinutesEnabled}
          onApply={(nextTime, nextComparison) => {
            setComparison(nextComparison);
            setTime(nextTime);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
