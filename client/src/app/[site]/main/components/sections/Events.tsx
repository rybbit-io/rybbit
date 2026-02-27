import { useExtracted } from "next-intl";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { useGetEventNames } from "../../../../../api/analytics/hooks/events/useGetEventNames";
import { EventList } from "../../../events/components/EventList";
import { OutboundLinksList } from "../../../events/components/OutboundLinksList";
import { OutboundLinksDialog } from "./OutboundLinksDialog";
import { useGetOutboundLinks } from "../../../../../api/analytics/hooks/events/useGetOutboundLinks";
import { Expand } from "lucide-react";
import { ScrollArea } from "../../../../../components/ui/scroll-area";

type Tab = "events" | "outbound";

function Events_() {
  const { data: eventNamesData, isLoading: isLoadingEventNames } = useGetEventNames();
  const t = useExtracted();

  return (
    <>
      {isLoadingEventNames && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="relative pr-2">
        <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
          <div>{t("Custom Events")}</div>
          <div>{t("Count")}</div>
        </div>
        <ScrollArea className="h-[394px]">
          <EventList events={eventNamesData || []} isLoading={isLoadingEventNames} />
        </ScrollArea>
      </div>
    </>
  );
}

function OutboundLinks({ expanded, close }: { expanded: boolean; close: () => void }) {
  const { data: outboundLinksData, isLoading: isLoadingOutboundLinks } = useGetOutboundLinks();
  const t = useExtracted();

  return (
    <>
      {isLoadingOutboundLinks && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="relative">
        <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
          <div>{t("Outbound Links")}</div>
          <div>{t("Clicks")}</div>
        </div>
        <OutboundLinksList outboundLinks={outboundLinksData || []} isLoading={isLoadingOutboundLinks} />
        <OutboundLinksDialog outboundLinks={outboundLinksData || []} expanded={expanded} close={close} />
      </div>
    </>
  );
}

export function Events() {
  const [tab, setTab] = useState<Tab>("events");
  const [expandedOutbound, setExpandedOutbound] = useState(false);
  const t = useExtracted();

  return (
    <Card className="h-[483px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="events" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 justify-between items-center">
            <div className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="events">{t("Custom Events")}</TabsTrigger>
                <TabsTrigger value="outbound">{t("Outbound Links")}</TabsTrigger>
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
