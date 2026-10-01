"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";

import { SilentEvent } from "@/api/analytics/endpoints";
import { InsightRow } from "@/components/site/InsightRow";
import { Button } from "@/components/ui/button";
import { addFilter, getTimezone } from "@/lib/store";
import { silentEventDailyAverage } from "../utils/usedIn";

interface SilentEventNoticeProps {
  /** Ranked by how often they used to fire; the first one is named. */
  events: SilentEvent[] | undefined;
}

/**
 * Says when a custom event that fired on most days has stopped. Nothing else
 * on the page can: an event with no occurrences drops out of every list.
 */
export function SilentEventNotice({ events }: SilentEventNoticeProps) {
  const t = useExtracted();
  const event = events?.[0];
  if (!event) return null;

  const lastSeen = DateTime.fromSQL(event.lastSeen, { zone: "utc" }).setZone(getTimezone());
  const average = silentEventDailyAverage(event);
  const others = (events?.length ?? 1) - 1;

  return (
    <InsightRow
      action={
        <Button
          variant="ghost"
          size="xs"
          onClick={() => addFilter({ parameter: "event_name", type: "equals", value: [event.eventName] })}
        >
          {t("View event")}
        </Button>
      }
    >
      {t.rich("<name></name> has not fired since {date}. It averaged {average} a day before that.", {
        name: () => <span className="font-medium text-neutral-900 dark:text-neutral-50">{event.eventName}</span>,
        date: lastSeen.toFormat("MMM d"),
        average: average >= 10 ? Math.round(average).toLocaleString() : average.toFixed(1),
      })}
      {others > 0 && (
        <span className="text-neutral-500 dark:text-neutral-400">
          {" "}
          {t("{count, plural, one {# other event has gone quiet too.} other {# other events have gone quiet too.}}", {
            count: others,
          })}
        </span>
      )}
    </InsightRow>
  );
}
