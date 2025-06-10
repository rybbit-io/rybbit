"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_FILTERS } from "@/lib/store";
import { useGetEventNames } from "../../../api/analytics/events/useGetEventNames";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { EventList } from "./components/EventList";
import { EventLog } from "./components/EventLog";

export default function EventsPage() {
  useSetPageTitle("Rybbit · Events");

  const { data: eventNamesData, isLoading: isLoadingEventNames } =
    useGetEventNames();

  return (
    <DisabledOverlay message="Events">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader availableFilters={EVENT_FILTERS} />

        <Card>
          <CardHeader>
            <CardTitle>Custom Events</CardTitle>
          </CardHeader>
          <CardContent>
            <EventList
              events={eventNamesData || []}
              isLoading={isLoadingEventNames}
              size="large"
            />
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
