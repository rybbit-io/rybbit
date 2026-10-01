import { Palette } from "lucide-react";
import { useExtracted } from "next-intl";
import { ControlButton } from "../../../../components/site/ControlButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { useGlobeStore, useMapStyle } from "../globeStore";
import { FLAT_STYLES, GLOBE_STYLES, MapStyleId } from "../utils/mapStyles";

/** The basemap, for whichever engine is showing: Mapbox styles on the globe, OpenFreeMap on the flat map. */
export default function MapStyleSelector() {
  const t = useExtracted();
  const mapMode = useGlobeStore(state => state.mapMode);
  const setMapStyle = useGlobeStore(state => state.setMapStyle);
  const mapStyle = useMapStyle();

  const names: Record<MapStyleId, string> = {
    standard: t("Standard"),
    "standard-satellite": t("Standard Satellite"),
    outdoors: t("Outdoors"),
    light: t("Light"),
    dark: t("Dark"),
    satellite: t("Satellite"),
    "navigation-day": t("Navigation Day"),
    "navigation-night": t("Navigation Night"),
    bright: t("Bright"),
    liberty: t("Liberty"),
  };

  const styles = mapMode === "2D" ? FLAT_STYLES : GLOBE_STYLES;
  const selected = styles.find(style => style.url === mapStyle);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ControlButton icon={<Palette />} label={t("Style")} value={selected ? names[selected.id] : t("Style")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={mapStyle} onValueChange={setMapStyle}>
          {styles.map(style => (
            <DropdownMenuRadioItem key={style.url} value={style.url}>
              {names[style.id]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
