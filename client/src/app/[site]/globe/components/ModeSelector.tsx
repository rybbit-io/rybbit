import { Clock, Globe2, HouseIcon, Radio } from "lucide-react";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { useGlobeStore } from "../globeStore";

export type MapView = "countries" | "subdivisions" | "coordinates" | "timeline";

export default function MapViewSelector() {
  const { mapView, setMapView, mapMode, setMapMode } = useGlobeStore();
  const t = useExtracted();

  const views: { value: MapView; label: string; icon: ReactNode }[] = [
    { value: "timeline", label: t("Timeline"), icon: <Clock className="md:opacity-60" size={14} /> },
    { value: "coordinates", label: t("Coordinates"), icon: <Radio className="md:opacity-60" size={14} /> },
    { value: "countries", label: t("Countries"), icon: <Globe2 className="md:opacity-60" size={14} /> },
    { value: "subdivisions", label: t("Subdivisions"), icon: <HouseIcon className="md:opacity-60" size={14} /> },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto w-full">
      <button
        className="text-xs font-medium rounded-lg bg-neutral-900/70 text-neutral-200 backdrop-blur-sm p-1.5 border border-neutral-800/50 hover:bg-neutral-800 hover:text-white transition-all"
        onClick={() => setMapMode(mapMode === "2D" ? "3D" : "2D")}
      >
        {mapMode === "2D" ? "2D" : "3D"}
      </button>
      <SegmentedControl<MapView>
        aria-label={t("Map view")}
        size="sm"
        variant="overlay"
        className="shrink-0"
        options={views.map(view => ({
          value: view.value,
          // The text hides below md, leaving the icon: name each segment explicitly.
          ariaLabel: view.label,
          label: (
            <>
              {view.icon}
              <span className="hidden md:inline">{view.label}</span>
            </>
          ),
        }))}
        value={mapView}
        onValueChange={setMapView}
      />
    </div>
  );
}
