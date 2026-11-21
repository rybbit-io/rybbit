"use client";

import { Flag } from "lucide-react";
import { useExtracted } from "next-intl";
import { BucketSelection } from "../../../components/BucketSelection";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { AnalysisBar } from "../../../components/site/AnalysisBar";
import { Button } from "../../../components/ui/button";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { cn } from "../../../lib/utils";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { EnableWebVitals } from "./components/EnableWebVitals";
import { PercentileSelector } from "./components/PercentileSelector";
import { PerformanceByDimensions } from "./components/PerformanceByDimensions";
import { PerformanceChart } from "./components/PerformanceChart";
import { PerformanceOverview } from "./components/PerformanceOverview";
import { usePerformanceStore } from "./performanceStore";
import { useVisibleAnnotations } from "./utils/useVisibleAnnotations";

// Shows and hides the timeline annotations on the chart. Without any in the
// selected period there is nothing to toggle, so it is not drawn.
function AnnotationsToggle() {
  const t = useExtracted();
  const { showAnnotations, setShowAnnotations } = usePerformanceStore();
  const annotations = useVisibleAnnotations();
  if (annotations.length === 0) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={showAnnotations}
      onClick={() => setShowAnnotations(!showAnnotations)}
      // The pressed fill the users page's quick filters use: a filled, bordered
      // step that hover does not change, so on never reads as a hover.
      className={cn(
        "gap-1.5 font-normal",
        showAnnotations &&
          "border-neutral-300 bg-neutral-100 text-neutral-900 hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
      )}
    >
      <Flag />
      {t("Annotations")}
      <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{annotations.length}</span>
    </Button>
  );
}

export default function PerformancePage() {
  useSetPageTitle("Performance");
  const t = useExtracted();
  return (
    <DisabledOverlay message={t("Performance")} featurePath="performance">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader />
        <EnableWebVitals />
        <PerformanceOverview />
        <AnalysisBar end={<AnnotationsToggle />}>
          <PercentileSelector />
          <BucketSelection />
        </AnalysisBar>
        <PerformanceChart />
        <PerformanceByDimensions />
      </div>
    </DisabledOverlay>
  );
}
