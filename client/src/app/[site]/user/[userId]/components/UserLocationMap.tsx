"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { cn } from "../../../../../lib/utils";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { useConfigs } from "../../../../../lib/configs";

interface UserLocationMapProps {
  country: string;
  region: string;
  city: string;
  className?: string;
}

export function UserLocationMap({ country, region, city, className }: UserLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { configs } = useConfigs();
  const { resolvedTheme } = useTheme();

  const query = [city, region, country].filter(Boolean).join(", ");

  const style = resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";

  const { data: coordinates, isLoading } = useQuery({
    queryKey: ["user-location-geocode", configs?.mapboxToken, query],
    queryFn: () => geocodeUserLocation(configs!.mapboxToken, query),
    enabled: Boolean(configs?.mapboxToken && query),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!containerRef.current || !configs?.mapboxToken || !coordinates) return;

    // Clean up previous map instance before creating a new one
    markerRef.current?.remove();
    markerRef.current = null;
    mapRef.current?.remove();
    mapRef.current = null;

    mapboxgl.accessToken = configs.mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style,
      center: coordinates,
      zoom: 4,
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: false,
      // Static locator: panning/zooming a thumbnail this small only steals the
      // page's scroll wheel
      interactive: false,
    });

    mapRef.current = map;

    markerRef.current = new mapboxgl.Marker({ color: "#10b981" }).setLngLat(coordinates).addTo(map);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [configs?.mapboxToken, coordinates, style]);

  if (!query) return null;

  // Reserve the slot while geocoding so the card doesn't jump
  if (isLoading) return <Skeleton className={cn("w-full rounded-md", className)} />;

  // Geocoding failed: drop the section instead of framing an empty box
  if (!coordinates) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full overflow-hidden rounded-md border border-neutral-100 dark:border-neutral-800",
        "[&_.mapboxgl-ctrl-bottom-left]:hidden! [&_.mapboxgl-ctrl-logo]:hidden! [&_.mapboxgl-ctrl-bottom-right]:hidden!",
        className
      )}
    />
  );
}

interface MapboxGeocodingResponse {
  features?: Array<{
    center?: unknown;
  }>;
}

async function geocodeUserLocation(token: string, query: string): Promise<[number, number] | null> {
  try {
    const params = new URLSearchParams({
      access_token: token,
      limit: "1",
    });

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`
    );

    if (!response.ok) return null;

    const data = (await response.json()) as MapboxGeocodingResponse;
    const center = data.features?.[0]?.center;

    if (!Array.isArray(center) || center.length < 2) return null;

    const [lng, lat] = center;
    if (typeof lng !== "number" || typeof lat !== "number") return null;

    return [lng, lat];
  } catch {
    return null;
  }
}
