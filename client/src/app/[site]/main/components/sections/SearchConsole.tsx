import { Expand, Info, Monitor, Smartphone, SquareArrowOutUpRight, Tablet } from "lucide-react";
import { useState } from "react";
import { useConnectGSC, useGSCConnection } from "../../../../../api/gsc/useGSCConnection";
import { GSCDimension, useGSCData } from "../../../../../api/gsc/useGSCData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { formatter, getCountryName } from "../../../../../lib/utils";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";
import { StandardSkeleton } from "../../../components/shared/StandardSection/Skeleton";
import { SearchConsoleDialog } from "./SearchConsoleDialog";
import { SiGoogle } from "@icons-pack/react-simple-icons";
import { round } from "lodash";

type Tab = "queries" | "pages" | "countries" | "devices";

function ConnectPrompt() {
  const { mutate: connect, isPending } = useConnectGSC();

  return (
    <div className="flex flex-col items-center justify-center mt-12 gap-4">
      <div className="text-sm text-neutral-600 dark:text-neutral-400 text-center max-w-sm">
        Connect your Google Search Console account to view search performance data including top keywords and pages.
      </div>
      <Button onClick={() => connect()} disabled={isPending}>
        <SiGoogle />
        {isPending ? "Connecting..." : "Connect Google Search Console"}
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
  const { data, isLoading, isFetching } = useGSCData(dimension);

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
              <div className="w-20 text-right">Clicks</div>
              <div className="w-24 text-right">Impressions</div>
            </div>
          </div>
          {data && data.length > 0 ? (
            data.slice(0, 10).map((item, index) => {
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
                    {renderName ? renderName(item.name) : item.name}
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
                  No Data
                </div>
                <div className="text-sm mt-2">
                  Google Search Console data has a 2-3 day delay. Try selecting a wider date range.
                </div>
              </div>
            </div>
          )}
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
  const { data: connection, isLoading: isLoadingConnection } = useGSCConnection();

  const topSection = (
    <div className="flex flex-row gap-2 justify-between items-center">
      <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="queries">Keywords</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
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
                <DataList dimension="query" label="Keyword" expanded={expanded} close={close} />
              </TabsContent>
              <TabsContent value="pages">
                <DataList
                  dimension="page"
                  label="Page"
                  renderName={name => (
                    <div className="flex items-center gap-1">
                      <span className="truncate">{new URL(name).pathname || "/"}</span>
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
                  label="Country"
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
                  label="Device"
                  expanded={expanded}
                  close={close}
                  renderName={e => (
                    <div className="flex gap-2 items-center">
                      {e === "DESKTOP" && <Monitor className="w-4 h-4" />}
                      {e === "MOBILE" && <Smartphone className="w-4 h-4" />}
                      {e === "TABLET" && <Tablet className="w-4 h-4" />}
                      {e === "DESKTOP" ? "Desktop" : e === "MOBILE" ? "Mobile" : e === "TABLET" ? "Tablet" : "Other"}
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
