"use client";

import { ReactNode } from "react";
import { BOT_AVAILABLE_FILTERS } from "../../../api/analytics/hooks/bots/constants";
import { useInView } from "../../../hooks/useInView";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { AiOperatorTable } from "./components/ai/AiOperatorTable";
import { AiPages } from "./components/ai/AiPages";
import { AiSources } from "./components/ai/AiSources";
import { BotsAnalysisBar } from "./components/BotsAnalysisBar";
import { BotsChart } from "./components/BotsChart";
import { BlockingOffNotice, UnnamedAutomationInsight } from "./components/BotsNotices";
import { BotsStatBand } from "./components/BotsStatBand";
import { DetectionLayers } from "./components/DetectionLayers";
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
 * layers under the other lens answer a different one: how the traffic was
 * caught.
 */
function AiLens() {
  return (
    <>
      <BotsChart lens="ai" />
      <AiOperatorTable />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <LazySection>
          <AiPages />
        </LazySection>
        <LazySection>
          <AiSources />
        </LazySection>
      </div>
    </>
  );
}

function AllBotsLens() {
  return (
    <>
      <BotsChart lens="all" />
      <DetectionLayers />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <LazySection>
          <BotMetadata />
        </LazySection>
        <LazySection>
          <BotPages />
        </LazySection>
        <LazySection>
          <BotReferrers />
        </LazySection>
        <LazySection>
          <BotCountries />
        </LazySection>
        <LazySection>
          <BotDevices />
        </LazySection>
      </div>
    </>
  );
}

export default function BotsPage() {
  const { site } = useStore();
  const lens = useBotsStore(state => state.lens);
  useSetPageTitle("Bots");

  if (!site) {
    return null;
  }

  return (
    <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
      <SubHeader availableFilters={BOT_AVAILABLE_FILTERS} />
      <BotsStatBand />
      <BotsAnalysisBar />
      <BlockingOffNotice />
      <UnnamedAutomationInsight />
      {lens === "ai" ? <AiLens /> : <AllBotsLens />}
    </div>
  );
}
