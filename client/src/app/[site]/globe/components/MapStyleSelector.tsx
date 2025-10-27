import { Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { useGlobeStore } from "../globeStore";

interface MapStyle {
  name: string;
  url: string;
}

const MAP_STYLES: MapStyle[] = [
  { name: "Standard", url: "mapbox://styles/mapbox/standard" },
  { name: "Standard Satellite", url: "mapbox://styles/mapbox/standard-satellite" },
  // { name: "Streets", url: "mapbox://styles/mapbox/streets-v12" },
  { name: "Outdoors", url: "mapbox://styles/mapbox/outdoors-v12" },
  { name: "Light", url: "mapbox://styles/mapbox/light-v11" },
  { name: "Dark", url: "mapbox://styles/mapbox/dark-v11" },
  { name: "Satellite", url: "mapbox://styles/mapbox/satellite-v9" },
  { name: "Navigation Day", url: "mapbox://styles/mapbox/navigation-day-v1" },
  { name: "Navigation Night", url: "mapbox://styles/mapbox/navigation-night-v1" },
];

export default function MapStyleSelector() {
  const { mapStyle, setMapStyle, setTimelineStyle } = useGlobeStore();

  const currentStyle = MAP_STYLES.find(style => style.url === mapStyle);

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
        <span className="hidden md:inline">{currentStyle?.name || "Style"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {MAP_STYLES.map(style => (
          <DropdownMenuItem
            key={style.url}
            onClick={() => handleStyleChange(style.url)}
            className={mapStyle === style.url ? "bg-neutral-100 dark:bg-neutral-800" : ""}
          >
            {style.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
