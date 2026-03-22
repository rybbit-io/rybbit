"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";

import { BucketSelection } from "@/components/BucketSelection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/basic-tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomEventsChart } from "./CustomEventsChart";
import { EventTypesChart } from "./EventTypesChart";

const EVENT_LIMIT_OPTIONS = [1, 3, 5, 8, 10];

type ChartTab = "custom_events" | "event_types";

export function EventsChart() {
  const t = useExtracted();
  const [tab, setTab] = useState<ChartTab>("custom_events");
  const [eventLimit, setEventLimit] = useState(5);

  return (
    <Card className="overflow-visible">
      <Tabs value={tab} onValueChange={v => setTab(v as ChartTab)}>
        <CardHeader className="flex flex-col gap-0 pb-0">
          <div className="flex items-start gap-2">
            <TabsList className="flex-1 mt-[-8px]">
              <TabsTrigger value="custom_events">{t("Custom Events")}</TabsTrigger>
              <TabsTrigger value="event_types">{t("Event Types")}</TabsTrigger>
            </TabsList>
            <div className="hidden items-center gap-2 sm:flex">
              {tab === "custom_events" && (
                <Select value={String(eventLimit)} onValueChange={value => setEventLimit(Number(value))}>
                  <SelectTrigger className="w-[90px]" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent size="sm">
                    {EVENT_LIMIT_OPTIONS.map(option => (
                      <SelectItem key={option} value={String(option)} size="sm">
                        {t("Top {option}", { option: String(option) })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <BucketSelection />
            </div>
          </div>
          <div className="mt-2 flex w-full flex-wrap items-center gap-2 sm:-mt-1">
            <div className="ml-auto flex items-center gap-2 sm:hidden">
              {tab === "custom_events" && (
                <Select value={String(eventLimit)} onValueChange={value => setEventLimit(Number(value))}>
                  <SelectTrigger className="w-[90px]" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent size="sm">
                    {EVENT_LIMIT_OPTIONS.map(option => (
                      <SelectItem key={option} value={String(option)} size="sm">
                        {t("Top {option}", { option: String(option) })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <BucketSelection />
            </div>
          </div>
        </CardHeader>
        <div className="px-2 md:px-4 pb-2 md:pb-4 relative">
          <TabsContent value="custom_events">
            <CustomEventsChart eventLimit={eventLimit} />
          </TabsContent>
          <TabsContent value="event_types">
            <EventTypesChart />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}
