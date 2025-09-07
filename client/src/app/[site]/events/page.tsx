"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_FILTERS } from "@/lib/store";
import { useGetEventNames } from "../../../api/analytics/events/useGetEventNames";
import { useGetOutboundLinks } from "../../../api/analytics/events/useGetOutboundLinks";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { EventList } from "./components/EventList";
import { EventLog } from "./components/EventLog";
import { OutboundLinksList } from "./components/OutboundLinksList";

export default function EventsPage() {
  useSetPageTitle("Rybbit · Events");

  const { data: eventNamesData, isLoading: isLoadingEventNames } = useGetEventNames();
  const { data: outboundLinksData, isLoading: isLoadingOutboundLinks } = useGetOutboundLinks();

  return (
    <DisabledOverlay message="Events" featurePath="events">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader availableFilters={EVENT_FILTERS} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Custom Events</CardTitle>
            </CardHeader>
            <CardContent>
              <EventList events={eventNamesData || []} isLoading={isLoadingEventNames} size="large" />
            </CardContent>
          </Card>

          <Card className="h-full min-h-0 flex flex-col overflow-hidden" style={{ contain: "size" }}>
            <CardHeader>
              <CardTitle>Outbound Clicks</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
              <div className="h-full min-h-0 overflow-y-auto p-4">
                <OutboundLinksList 
                  outboundLinks={outboundLinksData || []} 
                  isLoading={isLoadingOutboundLinks} 
                  size="large"
                  fullHeight
                />
              </div>
            </CardContent>
          </Card>
        </div>

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
