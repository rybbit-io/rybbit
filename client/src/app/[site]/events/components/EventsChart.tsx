"use client";

import { Card } from "@/components/ui/card";
import { CustomEventsChart } from "./CustomEventsChart";
import { EventTypesChart } from "./EventTypesChart";

export type EventsBreakdown = "type" | "name";

export const EVENT_LIMIT_OPTIONS = [1, 3, 5, 8, 10];

interface EventsChartProps {
  breakdown: EventsBreakdown;
  /** How many custom events the by-name breakdown draws. */
  eventLimit: number;
}

export function EventsChart({ breakdown, eventLimit }: EventsChartProps) {
  return (
    <Card className="overflow-visible">
      {breakdown === "type" ? (
        <EventTypesChart />
      ) : (
        // Keyed so the hidden lines reset when the set of events changes.
        <CustomEventsChart key={eventLimit} eventLimit={eventLimit} />
      )}
    </Card>
  );
}
