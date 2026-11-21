import * as React from "react";
import { BasicTabs, BasicTabsContent, BasicTabsList, BasicTabsTrigger } from "@rybbit/ui";

const countries = [
  { name: "United States", visitors: "6,210", share: "34%" },
  { name: "Germany", visitors: "2,104", share: "11%" },
  { name: "United Kingdom", visitors: "1,880", share: "10%" },
  { name: "Brazil", visitors: "1,132", share: "6%" },
];

function RankedList({ rows }: { rows: { name: string; visitors: string; share: string }[] }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between border-b border-neutral-800 px-3 py-2 text-sm">
          <span>{r.name}</span>
          <span className="flex gap-3 tabular-nums">
            <span>{r.visitors}</span>
            <span className="w-10 text-right text-neutral-400">{r.share}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Underline tabs that switch a section's breakdown (the pattern on every rollup card). */
export function SectionTabs() {
  return (
    <div className="w-[400px] p-4">
      <BasicTabs defaultValue="countries">
        <BasicTabsList>
          <BasicTabsTrigger value="countries">Countries</BasicTabsTrigger>
          <BasicTabsTrigger value="regions">Regions</BasicTabsTrigger>
          <BasicTabsTrigger value="cities">Cities</BasicTabsTrigger>
        </BasicTabsList>
        <BasicTabsContent value="countries">
          <RankedList rows={countries} />
        </BasicTabsContent>
        <BasicTabsContent value="regions">Regions</BasicTabsContent>
        <BasicTabsContent value="cities">Cities</BasicTabsContent>
      </BasicTabs>
    </div>
  );
}

/** Triggers carry counts; one is disabled. Active tab is the second one. */
export function WithCounts() {
  return (
    <div className="w-[400px] p-4">
      <BasicTabs defaultValue="referrers">
        <BasicTabsList>
          <BasicTabsTrigger value="channels">
            Channels <span className="ml-1 text-xs text-neutral-500 tabular-nums">6</span>
          </BasicTabsTrigger>
          <BasicTabsTrigger value="referrers">
            Referrers <span className="ml-1 text-xs text-neutral-500 tabular-nums">48</span>
          </BasicTabsTrigger>
          <BasicTabsTrigger value="campaigns" disabled>
            Campaigns <span className="ml-1 text-xs text-neutral-500 tabular-nums">0</span>
          </BasicTabsTrigger>
        </BasicTabsList>
        <BasicTabsContent value="referrers">
          <RankedList
            rows={[
              { name: "google.com", visitors: "4,902", share: "27%" },
              { name: "github.com", visitors: "1,377", share: "7%" },
              { name: "news.ycombinator.com", visitors: "912", share: "5%" },
            ]}
          />
        </BasicTabsContent>
      </BasicTabs>
    </div>
  );
}
