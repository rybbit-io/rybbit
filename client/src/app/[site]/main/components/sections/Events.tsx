import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { useGetEventNames } from "../../../../../api/analytics/events/useGetEventNames";
import { EventList } from "../../../events/components/EventList";
import { OutboundLinksList } from "../../../events/components/OutboundLinksList";
import { OutboundLinksDialog } from "./OutboundLinksDialog";
import { useGetOutboundLinks } from "../../../../../api/analytics/events/useGetOutboundLinks";
import { Expand } from "lucide-react";

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
      <div className="relative max-h-[344px] overflow-y-auto">
        <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-400 mb-2">
          <div>Custom Events</div>
          <div>Count</div>
        </div>
        <EventList events={eventNamesData || []} isLoading={isLoadingEventNames} />
      </div>
    </>
  );
}

function OutboundLinks({ expanded, close }: { expanded: boolean; close: () => void }) {
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
        <OutboundLinksList outboundLinks={(outboundLinksData || []).slice(0, 10)} isLoading={isLoadingOutboundLinks} />
        <OutboundLinksDialog outboundLinks={outboundLinksData || []} expanded={expanded} close={close} />
      </div>
    </>
  );
}

export function Events() {
  const [tab, setTab] = useState<Tab>("events");
  const [expandedOutbound, setExpandedOutbound] = useState(false);

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="events" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 justify-between items-center">
            <div className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="events">Custom Events</TabsTrigger>
                <TabsTrigger value="outbound">Outbound Links</TabsTrigger>
              </TabsList>
            </div>
            {tab === "outbound" && (
              <Button size="smIcon" onClick={() => setExpandedOutbound(true)}>
                <Expand className="w-4 h-4" />
              </Button>
            )}
          </div>
          <TabsContent value="events">
            <Events_ />
          </TabsContent>
          <TabsContent value="outbound">
            <OutboundLinks expanded={expandedOutbound} close={() => setExpandedOutbound(false)} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
