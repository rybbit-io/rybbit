import { SiGoogle } from "@icons-pack/react-simple-icons";
import { round } from "lodash";
import { Expand, Info, SquareArrowOutUpRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { GSCDimension } from "../../../../../api/gsc/endpoints";
import { useConnectGSC } from "../../../../../api/gsc/hooks/useConnectGSC";
import { useGetGSCConnection } from "../../../../../api/gsc/hooks/useGetGSCConnection";
import { useGetGSCData } from "../../../../../api/gsc/hooks/useGetGSCData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { formatter, getCountryName, truncateString } from "../../../../../lib/utils";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";
import { DeviceIcon } from "../../../components/shared/icons/Device";
import { StandardSkeleton } from "../../../components/shared/StandardSection/Skeleton";
import { SearchConsoleDialog } from "./SearchConsoleDialog";

type Tab = "queries" | "pages" | "countries" | "devices";

function ConnectPrompt() {
  const { mutate: connect, isPending } = useConnectGSC();
  const t = useExtracted();

  return (
    <div className="flex flex-col items-center justify-center mt-12 gap-4">
      <div className="text-sm text-neutral-600 dark:text-neutral-400 text-center max-w-sm">
        {t("Connect your Google Search Console account to view search performance data including top keywords and pages.")}
      </div>
      <Button onClick={() => connect()} disabled={isPending}>
        <SiGoogle />
        {isPending ? t("Connecting...") : t("Connect Google Search Console")}
      </Button>
    </div>
  );
}

interface DataListProps {
  dimension: GSCDimension;
  label: string;
  renderName?: (name: string) => React.ReactNode;
  expanded: boolean;
  close: () => void;
}

function DataList({ dimension, label, renderName, expanded, close }: DataListProps) {
  const { data, isLoading, isFetching } = useGetGSCData(dimension);
  const t = useExtracted();

  const totalClicks = data?.reduce((acc, item) => acc + item.clicks, 0) || 0;

  const ratio = data?.[0]?.clicks ? 100 / (data[0].clicks / totalClicks) : 1;

  return (
    <>
      {isFetching && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="flex flex-col gap-2 max-h-[344px] overflow-y-auto z-10">
        <div className="flex flex-col gap-2 overflow-x-hidden">
          <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex flex-row gap-1 items-center">{label}</div>
            <div className="flex flex-row gap-2">
              <div className="w-20 text-right">{t("Clicks")}</div>
              <div className="w-24 text-right">{t("Impressions")}</div>
            </div>
          </div>
          <ScrollArea className="h-[314px]">
            <div className="flex flex-col gap-2 overflow-x-hidden">
              {data && data.length > 0 ? (
                data.slice(0, 100).map((item, index) => {
                  const percentage = item.clicks / totalClicks;
                  return (
                    <div
                      key={index}
                      className="relative flex flex-row gap-2 justify-between pr-1 text-xs py-1 hover:bg-neutral-150 dark:hover:bg-neutral-850 rounded px-2 group"
                    >
                      <div
                        className="absolute inset-0 bg-dataviz py-2 opacity-25 rounded-md"
                        style={{ width: `${percentage * ratio}%` }}
                      />
                      <div className="flex-1 truncate overflow-x-hidden z-10">
                        {renderName ? renderName(item.name) : truncateString(item.name, 32)}
                      </div>
                      <div className="flex flex-row gap-2 z-10">
                        <div className="w-28 text-right pr-1 flex flex-row gap-2 items-center justify-end">
                          <div className="hidden group-hover:block text-neutral-600 dark:text-neutral-400">
                            {round(percentage * 100, 1)}%
                          </div>
                          {formatter(item.clicks)}
                        </div>
                        <div className="w-24 text-right pr-1">{formatter(item.impressions)}</div>
                      </div>
                    </div>
                  );
                })
              ) : isLoading ? (
                <StandardSkeleton />
              ) : (
                <div className="text-neutral-600 dark:text-neutral-300 w-full text-center mt-6 flex flex-row gap-2 items-center justify-center">
                  <div className="text-neutral-500 dark:text-neutral-500">
                    <div className="text-neutral-600 dark:text-neutral-300 w-full text-center flex flex-row gap-2 items-center justify-center">
                      <Info className="w-5 h-5" />
                      {t("No Data")}
                    </div>
                    <div className="text-sm mt-2">
                      {t("Google Search Console data has a 2-3 day delay. Try selecting a wider date range.")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      <SearchConsoleDialog
        title={label}
        dimension={dimension}
        renderName={renderName}
        expanded={expanded}
        close={close}
      />
    </>
  );
}

export function SearchConsole() {
  const [tab, setTab] = useState<Tab>("queries");
  const [expanded, setExpanded] = useState(false);
  const close = () => setExpanded(false);
  const { data: connection, isLoading: isLoadingConnection } = useGetGSCConnection();
  const t = useExtracted();

  const topSection = (
    <div className="flex flex-row gap-2 justify-between items-center">
      <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="queries">{t("Keywords")}</TabsTrigger>
          <TabsTrigger value="pages">{t("Pages")}</TabsTrigger>
          <TabsTrigger value="countries">{t("Countries")}</TabsTrigger>
          <TabsTrigger value="devices">{t("Devices")}</TabsTrigger>
        </TabsList>
      </div>
      <div className="w-7">
        <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
          <Expand className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  if (isLoadingConnection) {
    return (
      <Card className="h-[405px]">
        <CardLoader />
        <CardContent className="mt-2">
          <Tabs defaultValue="queries" value={tab} onValueChange={value => setTab(value as Tab)}>
            {topSection}
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  const isConnected = connection?.connected;

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="queries" value={tab} onValueChange={value => setTab(value as Tab)}>
          {topSection}
          {!isConnected ? (
            <ConnectPrompt />
          ) : (
            <>
              <TabsContent value="queries">
                <DataList dimension="query" label={t("Keyword")} expanded={expanded} close={close} />
              </TabsContent>
              <TabsContent value="pages">
                <DataList
                  dimension="page"
                  label={t("Page")}
                  renderName={name => (
                    <div className="flex items-center gap-1">
                      <span className="truncate">{truncateString(new URL(name).pathname || "/", 32)}</span>
                      <a href={name} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <SquareArrowOutUpRight
                          className="ml-0.5 w-3.5 h-3.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                          strokeWidth={3}
                        />
                      </a>
                    </div>
                  )}
                  expanded={expanded}
                  close={close}
                />
              </TabsContent>
              <TabsContent value="countries">
                <DataList
                  dimension="country"
                  label={t("Country")}
                  renderName={name => (
                    <div className="flex items-center gap-2">
                      <CountryFlag country={name} />
                      {getCountryName(name)}
                    </div>
                  )}
                  expanded={expanded}
                  close={close}
                />
              </TabsContent>
              <TabsContent value="devices">
                <DataList
                  dimension="device"
                  label={t("Device")}
                  expanded={expanded}
                  close={close}
                  renderName={e => (
                    <div className="flex gap-2 items-center">
                      <DeviceIcon deviceType={e || ""} size={16} />
                      {e === "DESKTOP" ? t("Desktop") : e === "MOBILE" ? t("Mobile") : e === "TABLET" ? t("Tablet") : t("Other")}
                    </div>
                  )}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
