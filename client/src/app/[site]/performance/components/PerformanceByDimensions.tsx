"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { Card } from "../../../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { PerformanceDimension } from "../utils/usePerformanceRows";
import { PerformanceMap } from "./PerformanceMap";
import { PerformanceTable } from "./PerformanceTable";

type Tab = PerformanceDimension | "map";

export function PerformanceByDimensions() {
  const t = useExtracted();
  const [tab, setTab] = useState<Tab>("pathname");

  return (
    <Card>
      <div className="overflow-x-auto p-4 pb-3">
        <Tabs value={tab} onValueChange={value => setTab(value as Tab)}>
          <TabsList>
            <TabsTrigger value="pathname">{t("Pages")}</TabsTrigger>
            <TabsTrigger value="country">{t("Countries")}</TabsTrigger>
            <TabsTrigger value="region">{t("Regions")}</TabsTrigger>
            <TabsTrigger value="map">{t("Map")}</TabsTrigger>
            <TabsTrigger value="device_type">{t("Devices")}</TabsTrigger>
            <TabsTrigger value="browser">{t("Browsers")}</TabsTrigger>
            <TabsTrigger value="operating_system">{t("Operating systems")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === "map" ? (
        <div className="px-4 pb-4">
          <PerformanceMap height="600px" />
        </div>
      ) : (
        // Keyed so each dimension starts on its first page with its own sort.
        <PerformanceTable key={tab} dimension={tab} />
      )}
    </Card>
  );
}
