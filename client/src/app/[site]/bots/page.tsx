"use client";

import { ReactNode } from "react";
import { BOT_AVAILABLE_FILTERS } from "../../../api/analytics/hooks/bots/constants";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useInView } from "../../../hooks/useInView";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { BotChart } from "./components/BotChart";
import { BotsOverview } from "./components/BotsOverview";
import { AiBots } from "./components/ai/AiBots";
import { AiChart } from "./components/ai/AiChart";
import { AiCoverageNote } from "./components/ai/AiCoverageNote";
import { AiOperatorTable } from "./components/ai/AiOperatorTable";
import { AiOverview } from "./components/ai/AiOverview";
import { AiPages } from "./components/ai/AiPages";
import { BotCountries } from "./components/sections/BotCountries";
import { BotDevices } from "./components/sections/BotDevices";
import { BotMetadata } from "./components/sections/BotMetadata";
import { BotPages } from "./components/sections/BotPages";
import { BotReferrers } from "./components/sections/BotReferrers";
import { useBotsStore } from "./botsStore";

function LazySection({ children, height = "405px" }: { children: ReactNode; height?: string }) {
  const { ref, isInView } = useInView({ persistVisibility: true, rootMargin: "100px 0px" });
  return (
    <div ref={ref} style={{ minHeight: isInView ? undefined : height }}>
      {isInView ? children : null}
    </div>
  );
}

/**
 * Which AI systems read the site, what they read, and what they sent back.
 * Leads the page because it is the question people arrive with; the detection
 * layers below answer a different one — how the traffic was caught.
 */
function AiLens() {
  return (
    <>
      <div className="space-y-4">
        <AiOverview />
        <AiCoverageNote />
        <AiChart />
        <AiOperatorTable />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <LazySection>
          <AiBots />
        </LazySection>
        <LazySection>
          <AiPages />
        </LazySection>
      </div>
    </>
  );
}

function AllBotsLens() {
  return (
    <>
      <div className="space-y-4">
        <BotsOverview />
        <BotChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <LazySection>
          <BotReferrers />
        </LazySection>
        <LazySection>
          <BotPages />
        </LazySection>
        <LazySection>
          <BotDevices />
        </LazySection>
        <LazySection>
          <BotCountries />
        </LazySection>
        <LazySection>
          <BotMetadata />
        </LazySection>
      </div>
    </>
  );
}

export default function BotsPage() {
  const { site } = useStore();
  const { lens, setLens } = useBotsStore();
  useSetPageTitle("Bots");

  if (!site) {
    return null;
  }

  return (
    <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3">
      <SubHeader availableFilters={BOT_AVAILABLE_FILTERS} />
      <Tabs value={lens} onValueChange={value => setLens(value as typeof lens)}>
        <TabsList>
          <TabsTrigger value="ai">AI &amp; agents</TabsTrigger>
          <TabsTrigger value="all">All bots</TabsTrigger>
        </TabsList>
      </Tabs>
      {lens === "ai" ? <AiLens /> : <AllBotsLens />}
    </div>
  );
}
