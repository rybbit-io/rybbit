"use client";

import { useGetLiveSessionLocations } from "@/api/analytics/useGetLiveSessionLocations";
import { scaleSqrt } from "d3-scale";
import { Feature, GeoJsonObject } from "geojson";
import { Layer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import { Circle, GeoJSON, MapContainer, useMapEvent } from "react-leaflet";
import { useCountries } from "../../../../lib/geo";

// Component to handle zoom events and update circle sizes
function ZoomHandler({ setZoom }: { setZoom: (zoom: number) => void }) {
  const map = useMapEvent("zoom", () => {
    setZoom(map.getZoom());
  });
  return null;
}

interface TooltipContent {
  count: number;
  city: string;
}

interface TooltipPosition {
  x: number;
  y: number;
}

export function RealtimeMap() {
  const { data: liveSessionLocations, isLoading: isLiveSessionLocationsLoading } = useGetLiveSessionLocations();
  const { data: countriesGeoData } = useCountries();
  const [currentZoom, setCurrentZoom] = useState(1.5); // Initial zoom level
  const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
  });

  // Create a scale for circle radius based on count
  const radiusScale = useMemo(() => {
    if (!liveSessionLocations?.length) return () => 0;

    const maxCount = Math.max(...liveSessionLocations.map(loc => loc.count));

    // Use sqrt scale to make small values more visible
    // This directly scales radius (not area) which makes small circles more noticeable
    const baseScale = scaleSqrt().domain([1, maxCount]).range([50000, 500000]); // Min/max radius in meters

    return (count: number) => {
      const baseRadius = baseScale(count);
      // Reduce radius gradually as zoom increases
      const zoomFactor = Math.pow(0.75, currentZoom - 1.5);
      return baseRadius * zoomFactor;
    };
  }, [liveSessionLocations, currentZoom]);

  const handleStyle = (feature: Feature | undefined) => {
    const count = feature?.properties?.["count"] || 0;
    return {
      color: "rgba(140, 140, 140, 0.5)",
      weight: 0.5,
      fill: true,
      fillColor: "rgba(140, 140, 140, 0.5)",
      fillOpacity: 0.2,
    };
  };

  const handleEachFeature = (feature: Feature, layer: Layer) => {
    layer.on({
      mouseover: () => {
        // @ts-ignore
        layer.setStyle({
          fillOpacity: 0.5,
        });
      },
      mouseout: () => {
        // @ts-ignore
        layer.setStyle({
          fillOpacity: 0.2,
        });
      },
    });
  };

  return (
    <div>
      <div
        className="w-full h-[600px] rounded-lg overflow-hidden border border-neutral-850"
        onMouseMove={e => {
          if (tooltipContent) {
            setTooltipPosition({
              x: e.clientX,
              y: e.clientY,
            });
          }
        }}
      >
        <MapContainer
          center={[30, 0]}
          zoom={1.5}
          minZoom={1}
          style={{ height: "100%", width: "100%", background: "none" }}
          attributionControl={false}
          zoomControl={false}
        >
          <ZoomHandler setZoom={setCurrentZoom} />
          {countriesGeoData && (
            <GeoJSON
              data={countriesGeoData as GeoJsonObject}
              style={handleStyle}
              // onEachFeature={handleEachFeature}
            />
          )}
          {liveSessionLocations?.map((location, index) => (
            <Circle
              key={`${location.lat}-${location.lon}-${index}`}
              center={[location.lat, location.lon]}
              radius={radiusScale(location.count)}
              pathOptions={{
                fillColor: "hsl(var(--accent-500))",
                fillOpacity: 0.4,
                color: "hsl(var(--accent-400))",
                weight: 0,
              }}
              eventHandlers={{
                mouseover: e => {
                  setTooltipContent({
                    count: location.count,
                    city: location.city,
                  });
                  setTooltipPosition({
                    x: e.originalEvent.clientX,
                    y: e.originalEvent.clientY,
                  });
                },
                mouseout: () => {
                  setTooltipContent(null);
                },
                mousemove: e => {
                  setTooltipPosition({
                    x: e.originalEvent.clientX,
                    y: e.originalEvent.clientY,
                  });
                },
              }}
            />
          ))}
        </MapContainer>

        {tooltipContent && (
          <div
            className="fixed bg-neutral-1000 text-white rounded-md p-2 shadow-lg text-sm pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y - 10,
              transform: "translate(-50%, -100%)",
              zIndex: 500,
            }}
          >
            <div className="font-sm">
              <span className="font-bold text-accent-400">{tooltipContent.count.toLocaleString()}</span>{" "}
              <span className="text-neutral-300">
                active {tooltipContent.count === 1 ? "user" : "users"}
                {tooltipContent.city ? ` from ${tooltipContent.city}` : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
