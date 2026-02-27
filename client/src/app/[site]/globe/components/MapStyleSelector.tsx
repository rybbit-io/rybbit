import { Palette } from "lucide-react";
import { useExtracted } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { useGlobeStore } from "../globeStore";

const MAP_STYLE_URLS = [
  "mapbox://styles/mapbox/standard",
  "mapbox://styles/mapbox/standard-satellite",
  "mapbox://styles/mapbox/outdoors-v12",
  "mapbox://styles/mapbox/light-v11",
  "mapbox://styles/mapbox/dark-v11",
  "mapbox://styles/mapbox/satellite-v9",
  "mapbox://styles/mapbox/navigation-day-v1",
  "mapbox://styles/mapbox/navigation-night-v1",
];

export default function MapStyleSelector() {
  const { mapStyle, setMapStyle, setTimelineStyle } = useGlobeStore();
  const t = useExtracted();

  const getStyleName = (url: string): string => {
    switch (url) {
      case "mapbox://styles/mapbox/standard": return t("Standard");
      case "mapbox://styles/mapbox/standard-satellite": return t("Standard Satellite");
      case "mapbox://styles/mapbox/outdoors-v12": return t("Outdoors");
      case "mapbox://styles/mapbox/light-v11": return t("Light");
      case "mapbox://styles/mapbox/dark-v11": return t("Dark");
      case "mapbox://styles/mapbox/satellite-v9": return t("Satellite");
      case "mapbox://styles/mapbox/navigation-day-v1": return t("Navigation Day");
      case "mapbox://styles/mapbox/navigation-night-v1": return t("Navigation Night");
      default: return t("Style");
    }
  };

  const handleStyleChange = (styleUrl: string) => {
    setMapStyle(styleUrl);
    // Also update timelineStyle so it persists when switching views
    setTimelineStyle(styleUrl);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="text-xs font-medium rounded-lg bg-neutral-900/70 text-neutral-200 backdrop-blur-sm px-1.5 md:px-2.5 py-1.5 border border-neutral-800/50 hover:bg-neutral-800 hover:text-white transition-all inline-flex items-center gap-1.5"
        unstyled
      >
        <Palette size={14} />
        <span className="hidden md:inline">{getStyleName(mapStyle)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {MAP_STYLE_URLS.map(url => (
          <DropdownMenuItem
            key={url}
            onClick={() => handleStyleChange(url)}
            className={mapStyle === url ? "bg-neutral-100 dark:bg-neutral-800" : ""}
          >
            {getStyleName(url)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
