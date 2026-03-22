"use client";

import { useState } from "react";
import { useExtracted } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/basic-tabs";
import { Card, CardContent } from "../../../../components/ui/card";
import { PerformanceTable } from "./PerformanceTable";
import { PerformanceMap } from "./PerformanceMap";

type Tab = "pathname" | "country" | "map" | "device_type" | "browser" | "operating_system";

export function PerformanceByDimensions() {
  const t = useExtracted();
  const [tab, setTab] = useState<Tab>("pathname");

  return (
    <Card>
      <CardContent className="mt-2">
        <Tabs defaultValue="pathname" value={tab} onValueChange={value => setTab(value as Tab)}>
          <TabsList>
            <TabsTrigger value="pathname">{t("Pages")}</TabsTrigger>
            <TabsTrigger value="country">{t("Countries")}</TabsTrigger>
            <TabsTrigger value="map">{t("Map")}</TabsTrigger>
            <TabsTrigger value="device_type">{t("Devices")}</TabsTrigger>
            <TabsTrigger value="browser">{t("Browsers")}</TabsTrigger>
            <TabsTrigger value="operating_system">{t("Operating Systems")}</TabsTrigger>
          </TabsList>

          <TabsContent value="pathname">
            <PerformanceTable dimension="pathname" title={t("Performance by Page")} />
          </TabsContent>

          <TabsContent value="country">
            <PerformanceTable dimension="country" title={t("Performance by Country")} />
          </TabsContent>

          <TabsContent value="map">
            <PerformanceMap height="600px" />
          </TabsContent>

          <TabsContent value="device_type">
            <PerformanceTable dimension="device_type" title={t("Performance by Device Type")} />
          </TabsContent>

          <TabsContent value="browser">
            <PerformanceTable dimension="browser" title={t("Performance by Browser")} />
          </TabsContent>

          <TabsContent value="operating_system">
            <PerformanceTable dimension="operating_system" title={t("Performance by Operating System")} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
