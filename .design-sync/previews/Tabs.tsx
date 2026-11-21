import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rybbit/ui";

function Stat({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {delta ? <span className="text-xs text-emerald-400 tabular-nums">{delta}</span> : null}
      </div>
    </div>
  );
}

/** Canonical segmented tabs: a filled TabsList with one active pill, content below. */
export function ReportTabs() {
  return (
    <div className="w-[500px] p-4">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="funnels">Funnels</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Visitors" value="18,420" delta="+12%" />
            <Stat label="Pageviews" value="26,311" delta="+8%" />
          </div>
        </TabsContent>
        <TabsContent value="sessions">Sessions</TabsContent>
        <TabsContent value="goals">Goals</TabsContent>
        <TabsContent value="funnels">Funnels</TabsContent>
      </Tabs>
    </div>
  );
}

/** A disabled trigger (feature not on this plan) and a non-first default value. */
export function WithDisabled() {
  return (
    <div className="w-[500px] p-4">
      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="replay" disabled>
            Replay
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sessions">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Sessions" value="21,904" delta="+5%" />
            <Stat label="Avg. duration" value="1m 42s" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** TabsList stretched to the container with equal-width triggers. */
export function FullWidth() {
  return (
    <div className="w-[400px] p-4">
      <Tabs defaultValue="desktop">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="desktop">Desktop</TabsTrigger>
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
        </TabsList>
        <TabsContent value="desktop">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Share" value="64%" />
            <Stat label="Bounce rate" value="38%" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
