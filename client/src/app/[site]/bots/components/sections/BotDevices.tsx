"use client";

import { Expand } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { Browser } from "../../../components/shared/icons/Browser";
import { DeviceIcon } from "../../../components/shared/icons/Device";
import { OperatingSystem } from "../../../components/shared/icons/OperatingSystem";
import { BotSection } from "../BotSection";

type Tab = "browsers" | "browser_versions" | "devices" | "os" | "os_versions" | "dimensions";

export function BotDevices() {
  const [tab, setTab] = useState<Tab>("browsers");
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="browsers" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 justify-between items-center">
            <div className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="browsers">Browsers</TabsTrigger>
                <TabsTrigger value="browser_versions">Versions</TabsTrigger>
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="os">OS</TabsTrigger>
                <TabsTrigger value="os_versions">OS Versions</TabsTrigger>
                <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
              </TabsList>
            </div>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="browsers">
            <BotSection
              dimension="browser"
              title="Browsers"
              getValue={item => item.value}
              getKey={item => item.value || "other"}
              getLabel={item => (
                <div className="flex gap-2 items-center">
                  <Browser browser={item.value || "Other"} />
                  {item.value || "Other"}
                </div>
              )}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="browser_versions">
            <BotSection
              dimension="browser_version"
              title="Browser Versions"
              getValue={item => item.value}
              getKey={item => item.value || "other"}
              getLabel={item => {
                const browser = item.value.split(" ").slice(0, -1).join(" ");
                return (
                  <div className="flex gap-2 items-center">
                    <Browser browser={browser || "Other"} />
                    {item.value || "Other"}
                  </div>
                );
              }}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="devices">
            <BotSection
              dimension="device_type"
              title="Devices"
              getValue={item => item.value}
              getKey={item => item.value || "other"}
              getLabel={item => (
                <div className="flex gap-2 items-center">
                  <DeviceIcon deviceType={item.value || ""} size={16} />
                  {item.value || "Other"}
                </div>
              )}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="os">
            <BotSection
              dimension="operating_system"
              title="Operating Systems"
              getValue={item => item.value}
              getKey={item => item.value || "other"}
              getLabel={item => (
                <div className="flex gap-2 items-center">
                  <OperatingSystem os={item.value || "Other"} />
                  {item.value || "Other"}
                </div>
              )}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="os_versions">
            <BotSection
              dimension="operating_system_version"
              title="OS Versions"
              getValue={item => item.value}
              getKey={item => item.value || "other"}
              getLabel={item => {
                const os = item.value.split(" ").slice(0, -1).join(" ");
                return (
                  <div className="flex gap-2 items-center">
                    <OperatingSystem os={os || "Other"} />
                    {item.value || "Other"}
                  </div>
                );
              }}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="dimensions">
            <BotSection
              dimension="dimensions"
              title="Screen Dimensions"
              getValue={item => item.value}
              getKey={item => item.value || "other"}
              getLabel={item => item.value || "Other"}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
