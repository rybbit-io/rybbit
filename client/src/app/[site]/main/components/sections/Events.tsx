import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { useGetEventNames } from "../../../../../api/analytics/events/useGetEventNames";
import { EventList } from "../../../events/components/EventList";
import { OutboundLinksList } from "../../../events/components/OutboundLinksList";
import { useGetOutboundLinks } from "../../../../../api/analytics/events/useGetOutboundLinks";

type Tab = "events" | "outbound";

function Events_() {
  const { data: eventNamesData, isLoading: isLoadingEventNames } = useGetEventNames();

  return (
    <>
      {isLoadingEventNames && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="relative">
        <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-400 mb-2">
          <div>Custom Events</div>
          <div>Count</div>
        </div>
        <EventList events={eventNamesData || []} isLoading={isLoadingEventNames} />
      </div>
    </>
  );
}

function OutboundLinks() {
  const { data: outboundLinksData, isLoading: isLoadingOutboundLinks } = useGetOutboundLinks();

  return (
    <>
      {isLoadingOutboundLinks && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="relative">
        <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-400 mb-2">
          <div>Outbound Links</div>
          <div>Clicks</div>
        </div>
        <OutboundLinksList outboundLinks={outboundLinksData || []} isLoading={isLoadingOutboundLinks} />
      </div>
    </>
  );
}

export function Events() {
  const [tab, setTab] = useState<Tab>("events");

  return (
    <Card>
      <CardContent className="mt-2">
        <Tabs defaultValue="events" value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <TabsList>
            <TabsTrigger value="events">Custom Events</TabsTrigger>
            <TabsTrigger value="outbound">Outbound Links</TabsTrigger>
          </TabsList>
          <TabsContent value="events">
            <Events_ />
          </TabsContent>
          <TabsContent value="outbound">
            <OutboundLinks />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
