import { useExtracted } from "next-intl";
import { useGetAutocaptureEvents } from "../../../../../api/analytics/hooks/events/useGetAutocaptureEvents";
import { useGetEventNames } from "../../../../../api/analytics/hooks/events/useGetEventNames";
import { useGetOutboundLinks } from "../../../../../api/analytics/hooks/events/useGetOutboundLinks";
import { CardLoader } from "../../../../../components/ui/card";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { AutocaptureTargetType } from "../../../../../lib/events";
import { AutocaptureEventsList } from "../../../events/components/AutocaptureEventsList";
import { EventList } from "../../../events/components/EventList";
import { OutboundLinksList } from "../../../events/components/OutboundLinksList";
import { TabbedSectionCard, type TabbedSectionItem } from "../../../components/shared/TabbedSectionCard";
import { AutocaptureEventsDialogBody } from "./AutocaptureEventsDialog";
import { OutboundLinksDialogBody } from "./OutboundLinksDialog";

type Tab = "events" | "outbound" | "buttons" | "forms" | "copies";

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
        {/* [&>div]:!block forces Radix's display:table viewport wrapper to block so name truncate is bounded */}
        <ScrollArea className="h-[394px]" viewportClassName="[&>div]:!block">
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

function AutocaptureContent({
  type,
  valueLabel,
  countLabel,
}: {
  type: AutocaptureTargetType;
  valueLabel: string;
  countLabel: string;
}) {
  const { data, isLoading } = useGetAutocaptureEvents(type);

  return (
    <>
      {isLoading && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="relative">
        <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
          <div>{valueLabel}</div>
          <div>{countLabel}</div>
        </div>
        <AutocaptureEventsList events={data || []} isLoading={isLoading} />
      </div>
    </>
  );
}

function AutocaptureDialogContent({
  type,
  valueLabel,
  countLabel,
  lastLabel,
}: {
  type: AutocaptureTargetType;
  valueLabel: string;
  countLabel: string;
  lastLabel: string;
}) {
  const { data } = useGetAutocaptureEvents(type);
  return (
    <AutocaptureEventsDialogBody
      events={data || []}
      valueLabel={valueLabel}
      countLabel={countLabel}
      lastLabel={lastLabel}
    />
  );
}

export function Events() {
  const t = useExtracted();

  const tabs: TabbedSectionItem<Tab>[] = [
    {
      value: "events",
      label: t("Custom Events"),
      content: <EventsContent />,
    },
    {
      value: "outbound",
      label: t("Outbound"),
      content: <OutboundLinksContent />,
      dialogContent: <OutboundLinksDialogContent />,
      dialogTitle: t("Outbound Links"),
    },
    {
      value: "buttons",
      label: t("Buttons"),
      content: <AutocaptureContent type="button_click" valueLabel={t("Buttons")} countLabel={t("Clicks")} />,
      dialogContent: (
        <AutocaptureDialogContent
          type="button_click"
          valueLabel={t("Button Text")}
          countLabel={t("Clicks")}
          lastLabel={t("Last Clicked")}
        />
      ),
      dialogTitle: t("Button Clicks"),
    },
    {
      value: "forms",
      label: t("Forms"),
      content: <AutocaptureContent type="form_submit" valueLabel={t("Forms")} countLabel={t("Submissions")} />,
      dialogContent: (
        <AutocaptureDialogContent
          type="form_submit"
          valueLabel={t("Form")}
          countLabel={t("Submissions")}
          lastLabel={t("Last Submitted")}
        />
      ),
      dialogTitle: t("Form Submissions"),
    },
    {
      value: "copies",
      label: t("Copies"),
      content: <AutocaptureContent type="copy" valueLabel={t("Copied Text")} countLabel={t("Copies")} />,
      dialogContent: (
        <AutocaptureDialogContent
          type="copy"
          valueLabel={t("Copied Text")}
          countLabel={t("Copies")}
          lastLabel={t("Last Copied")}
        />
      ),
      dialogTitle: t("Copies"),
    },
  ];

  return <TabbedSectionCard defaultValue="events" tabs={tabs} className="h-[483px]" />;
}
