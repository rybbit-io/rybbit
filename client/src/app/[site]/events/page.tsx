"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_FILTERS } from "@/lib/filterGroups";
import { useGetEventNames } from "../../../api/analytics/hooks/events/useGetEventNames";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { EventList } from "./components/EventList";
import { EventLog } from "./components/EventLog";
import { EventsChart } from "./components/EventsChart";


export default function EventsPage() {
  useSetPageTitle("Rybbit · Events");

  const { data: eventNamesData, isLoading: isLoadingEventNames } = useGetEventNames();

  return (
    <DisabledOverlay message="Events" featurePath="events">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader availableFilters={EVENT_FILTERS} />

        <EventsChart />

        <Card className="h-auto lg:h-full">
          <CardHeader>

            <CardTitle>Custom Events</CardTitle>
          </CardHeader>
          <CardContent>
            <EventList events={eventNamesData || []} isLoading={isLoadingEventNames} size="large" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Log</CardTitle>
          </CardHeader>
          <CardContent>
            <EventLog />
          </CardContent>
        </Card>
      </div>
    </DisabledOverlay>
  );
}
