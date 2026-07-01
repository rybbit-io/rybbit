import { useExtracted } from "next-intl";
import { useGetEventNames } from "../../../../../api/analytics/hooks/events/useGetEventNames";
import { useGetOutboundLinks } from "../../../../../api/analytics/hooks/events/useGetOutboundLinks";
import { CardLoader } from "../../../../../components/ui/card";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { EventList } from "../../../events/components/EventList";
import { OutboundLinksList } from "../../../events/components/OutboundLinksList";
import { TabbedSectionCard, type TabbedSectionItem } from "../../../components/shared/TabbedSectionCard";
import { OutboundLinksDialogBody } from "./OutboundLinksDialog";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";

type Tab = "events" | "outbound";

function EventsContent() {
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

function OutboundLinksContent() {
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
      </div>
    </>
  );
}

function OutboundLinksDialogContent() {
  const { data: outboundLinksData } = useGetOutboundLinks();
  return <OutboundLinksDialogBody outboundLinks={outboundLinksData || []} />;
}

export function Events() {
  const t = useExtracted();
  const { data: siteMetadata } = useGetSite();
  const isApp = siteMetadata?.type === "mobile";

  const tabs: TabbedSectionItem<Tab>[] = [
    {
      value: "events",
      label: t("Custom Events"),
      content: <EventsContent />,
    },
  ];

  if (!isApp) {
    tabs.push({
      value: "outbound",
      label: t("Outbound Links"),
      content: <OutboundLinksContent />,
      dialogContent: <OutboundLinksDialogContent />,
      dialogTitle: t("Outbound Links"),
    });
  }

  return <TabbedSectionCard defaultValue="events" tabs={tabs} className="h-[483px]" />;
}
