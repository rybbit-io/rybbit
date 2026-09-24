"use client";
import { Expand } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { Browser } from "@/app/[site]/components/shared/icons/Browser";
import { DeviceIcon } from "@/app/[site]/components/shared/icons/Device";
import { OperatingSystem } from "@/app/[site]/components/shared/icons/OperatingSystem";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/basic-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RollupSection } from "./RollupSection";

type Tab = "browsers" | "devices" | "os" | "dimensions";

export function Devices({ siteIds }: { siteIds: number[] }) {
  const [tab, setTab] = useState<Tab>("browsers");
  const [expanded, setExpanded] = useState(false);
  const t = useExtracted();
  const close = () => setExpanded(false);

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs
          defaultValue="browsers"
          value={tab}
          onValueChange={(value) => setTab(value as Tab)}
        >
          <div className="flex flex-row gap-2 justify-between items-center">
            <div className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="browsers">{t("Browsers")}</TabsTrigger>
                <TabsTrigger value="devices">{t("Devices")}</TabsTrigger>
                <TabsTrigger value="os">{t("Operating Systems")}</TabsTrigger>
                <TabsTrigger value="dimensions">
                  {t("Screen Dimensions")}
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="browsers">
            <RollupSection
              siteIds={siteIds}
              filterParameter="browser"
              title={t("Browsers")}
              getKey={(e) => e.value}
              getValue={(e) => e.value}
              getLabel={(e) => (
                <div className="flex gap-2 items-center">
                  <Browser browser={e.value} />
                  {e.value || t("Other")}
                </div>
              )}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="devices">
            <RollupSection
              siteIds={siteIds}
              filterParameter="device_type"
              title={t("Devices")}
              getKey={(e) => e.value}
              getValue={(e) => e.value}
              getLabel={(e) => (
                <div className="flex gap-2 items-center">
                  <DeviceIcon deviceType={e.value || ""} size={16} />
                  {e.value || t("Other")}
                </div>
              )}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="os">
            <RollupSection
              siteIds={siteIds}
              filterParameter="operating_system"
              title={t("Operating Systems")}
              getKey={(e) => e.value}
              getValue={(e) => e.value}
              getLabel={(e) => (
                <div className="flex gap-2 items-center">
                  <OperatingSystem os={e.value || "Other"} />
                  {e.value || t("Other")}
                </div>
              )}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="dimensions">
            <RollupSection
              siteIds={siteIds}
              filterParameter="dimensions"
              title={t("Screen Dimensions")}
              getKey={(e) => e.value}
              getValue={(e) => e.value}
              getLabel={(e) => e.value || t("Other")}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
