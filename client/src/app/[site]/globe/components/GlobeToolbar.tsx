"use client";

import { Building2, Camera, ChartNoAxesColumn, Earth, Map as MapIcon, MapPinned, Rewind } from "lucide-react";
import { useExtracted } from "next-intl";
import { useId } from "react";
import { SegmentedControl } from "../../../../components/interior/segmented-control";
import { AnalysisBar } from "../../../../components/site/AnalysisBar";
import { BreakdownControl, BreakdownOption } from "../../../../components/site/BreakdownControl";
import { ControlButton } from "../../../../components/site/ControlButton";
import { Button } from "../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { toast } from "../../../../components/ui/sonner";
import { Switch } from "../../../../components/ui/switch";
import { downloadBlob } from "../../../../lib/export";
import { Breakdown, GlobeMetric, MapMode, useGlobeStore } from "../globeStore";
import { GLOBE_METRICS, useMetricLabels } from "../hooks/useMetricLabels";
import { getMapController } from "../utils/mapController";
import MapStyleSelector from "./MapStyleSelector";

function MetricControl() {
  const t = useExtracted();
  const metric = useGlobeStore(state => state.metric);
  const setMetric = useGlobeStore(state => state.setMetric);
  const { metricLabels } = useMetricLabels();

  const select = (next: string) => {
    const picked = GLOBE_METRICS.find(candidate => candidate === next);
    if (picked) setMetric(picked);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ControlButton icon={<ChartNoAxesColumn />} label={t("Metric")} value={metricLabels[metric]} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={metric} onValueChange={select}>
          {GLOBE_METRICS.map((candidate: GlobeMetric) => (
            <DropdownMenuRadioItem key={candidate} value={candidate}>
              {metricLabels[candidate]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SnapshotButton() {
  const t = useExtracted();

  // Copies the map to the clipboard where the browser allows writing images,
  // and saves it as a file where it does not.
  const snapshot = async () => {
    const controller = getMapController();
    if (!controller) return;

    let image: Blob;
    try {
      image = await controller.snapshot();
    } catch {
      toast.error(t("The map could not be exported"));
      return;
    }

    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
      toast.success(t("Map copied as an image"));
    } catch {
      downloadBlob("globe.png", image);
      toast.success(t("Map saved as an image"));
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-8 px-0"
      aria-label={t("Copy map as image")}
      title={t("Copy map as image")}
      onClick={snapshot}
    >
      <Camera />
    </Button>
  );
}

/**
 * The page's one row of controls. What the map is split by (breakdown) and
 * what it counts (metric) come first; how it is drawn sits at the far end.
 * Time has its own control, the replay bar under the map.
 */
export function GlobeToolbar() {
  const t = useExtracted();
  const onlineId = useId();
  const breakdown = useGlobeStore(state => state.breakdown);
  const setBreakdown = useGlobeStore(state => state.setBreakdown);
  const mapMode = useGlobeStore(state => state.mapMode);
  const setMapMode = useGlobeStore(state => state.setMapMode);
  const showOnline = useGlobeStore(state => state.showOnline);
  const setShowOnline = useGlobeStore(state => state.setShowOnline);

  const breakdowns: BreakdownOption<Breakdown>[] = [
    { value: "country", label: t("Country"), icon: <Earth /> },
    { value: "region", label: t("Region"), icon: <MapPinned /> },
    { value: "city", label: t("City"), icon: <Building2 /> },
    { value: "sessions", label: t("Sessions"), icon: <Rewind /> },
  ];

  return (
    <AnalysisBar
      breakdown={<BreakdownControl value={breakdown} onChange={setBreakdown} options={breakdowns} />}
      end={
        <>
          <label
            htmlFor={onlineId}
            className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700 dark:text-neutral-200"
          >
            <Switch id={onlineId} checked={showOnline} onCheckedChange={setShowOnline} />
            {t("Online now")}
          </label>
          <div className="mx-1 hidden h-5 w-px bg-neutral-200 dark:bg-neutral-800 sm:block" />
          <SegmentedControl<MapMode>
            aria-label={t("Map projection")}
            size="sm"
            options={[
              {
                value: "3D",
                label: (
                  <>
                    <Earth className="h-3.5 w-3.5" />
                    {t("Globe")}
                  </>
                ),
              },
              {
                value: "2D",
                label: (
                  <>
                    <MapIcon className="h-3.5 w-3.5" />
                    {t("Flat")}
                  </>
                ),
              },
            ]}
            value={mapMode}
            onValueChange={setMapMode}
          />
          <MapStyleSelector />
          <SnapshotButton />
        </>
      }
    >
      {/* A metric colours places; the sessions breakdown draws people instead. */}
      {breakdown !== "sessions" && <MetricControl />}
    </AnalysisBar>
  );
}
