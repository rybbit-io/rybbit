"use client";

import { isNil, round, throttle } from "lodash";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import BoringAvatar from "boring-avatars";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as CountryFlags from "country-flag-icons/react/3x2";
import {
  Monitor,
  Smartphone,
  Link,
  Search,
  ExternalLink,
  Users,
  Mail,
  HelpCircle,
  DollarSign,
  Video,
  Handshake,
  FileText,
  ShoppingCart,
  Calendar,
  Headphones,
  Eye,
  MousePointerClick,
} from "lucide-react";
import { DateTime } from "luxon";

// Avatar colors from client
const AVATAR_COLORS = [
  "#ec4899",
  "#be185d",
  "#f97316",
  "#c2410c",
  "#eab308",
  "#a16207",
  "#10b981",
  "#059669",
  "#14b8a6",
  "#0d9488",
  "#06b6d4",
  "#0e7490",
  "#3b82f6",
  "#1d4ed8",
  "#6366f1",
  "#8b5cf6",
  "#475569",
  "#6b7280",
  "#9ca3af",
  "#d1d5db",
];

// Session type (full version for tooltip)
type Session = {
  session_id: string;
  user_id: string;
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_width: number;
  screen_height: number;
  referrer: string;
  channel: string;
  hostname: string;
  page_title: string;
  session_end: string;
  session_start: string;
  session_duration: number;
  entry_page: string;
  exit_page: string;
  pageviews: number;
  events: number;
  lat: number;
  lon: number;
};

type SessionsResponse = Session[];

// Constants
const SOURCE_ID = "demo-sessions";
const CLUSTER_LAYER_ID = "demo-clusters";
const CLUSTER_COUNT_LAYER_ID = "demo-cluster-count";
const UNCLUSTERED_LAYER_ID = "demo-unclustered-point";
const CLUSTER_MAX_ZOOM = 11;
const CLUSTER_RADIUS = 25;
const MIN_CLUSTER_SIZE = 20;
const CLUSTERING_THRESHOLD = 500;
const SPREAD_START_ZOOM = 8;
const SPREAD_RADIUS_DEGREES = 0.006;

// Spin configuration
const SECONDS_PER_REVOLUTION = 120;
const MAX_SPIN_ZOOM = 5;
const SLOW_SPIN_ZOOM = 3;

// Locale detection
const userLocale = typeof navigator !== "undefined" ? navigator.language : "en-US";
const hour12 = (() => {
  try {
    const resolved = new Intl.DateTimeFormat(userLocale, { hour: "numeric" }).resolvedOptions();
    return resolved.hourCycle === "h12";
  } catch {
    return true;
  }
})();

// Name generation (simplified - using colors and animals)
const colors = [
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Purple",
  "Orange",
  "Pink",
  "Cyan",
  "Teal",
  "Indigo",
  "Amber",
  "Lime",
  "Rose",
  "Sky",
  "Violet",
];
const animals = [
  "Fox",
  "Bear",
  "Wolf",
  "Eagle",
  "Hawk",
  "Owl",
  "Deer",
  "Lion",
  "Tiger",
  "Panda",
  "Koala",
  "Dolphin",
  "Penguin",
  "Rabbit",
  "Falcon",
];

function generateName(userId: string): string {
  const hash = hashStringToNumber(userId);
  const colorIndex = hash % colors.length;
  const animalIndex = Math.floor(hash / colors.length) % animals.length;
  return `${colors[colorIndex]} ${animals[animalIndex]}`;
}

function generateAvatarSVG(userId: string, size: number): string {
  const avatarElement = createElement(BoringAvatar, {
    size,
    name: userId,
    variant: "beam",
    colors: AVATAR_COLORS,
  });
  return renderToStaticMarkup(avatarElement);
}

// Hash function for deterministic spreading
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Render country flag
function renderCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const FlagComponent = CountryFlags[countryCode.toUpperCase() as keyof typeof CountryFlags];
  if (!FlagComponent) return "";
  const flagElement = createElement(FlagComponent, { className: "w-4 h-3 inline-block" });
  return renderToStaticMarkup(flagElement);
}

// Render device icon
function renderDeviceIcon(deviceType: string): string {
  const type = deviceType?.toLowerCase() || "";
  const Icon = type.includes("mobile") || type.includes("tablet") ? Smartphone : Monitor;
  const iconElement = createElement(Icon, { size: 14, className: "inline-block" });
  return renderToStaticMarkup(iconElement);
}

// Get channel icon component
function getChannelIconComponent(channel: string) {
  switch (channel) {
    case "Direct":
      return Link;
    case "Organic Search":
      return Search;
    case "Referral":
      return ExternalLink;
    case "Organic Social":
      return Users;
    case "Email":
      return Mail;
    case "Unknown":
      return HelpCircle;
    case "Paid Search":
      return Search;
    case "Paid Unknown":
      return DollarSign;
    case "Paid Social":
      return Users;
    case "Display":
      return Monitor;
    case "Organic Video":
      return Video;
    case "Affiliate":
      return Handshake;
    case "Content":
      return FileText;
    case "Organic Shopping":
      return ShoppingCart;
    case "Event":
      return Calendar;
    case "Audio":
      return Headphones;
    default:
      return null;
  }
}

// Render channel icon
function renderChannelIcon(channel: string): string {
  const IconComponent = getChannelIconComponent(channel);
  if (!IconComponent) return "";
  const iconElement = createElement(IconComponent, { size: 14, className: "inline-block" });
  return renderToStaticMarkup(iconElement);
}

// Browser and OS icon paths
const BROWSER_TO_LOGO: Record<string, string> = {
  Chrome: "Chrome.svg",
  "Mobile Chrome": "Chrome.svg",
  Firefox: "Firefox.svg",
  "Mobile Firefox": "Firefox.svg",
  Safari: "Safari.svg",
  "Mobile Safari": "Safari.svg",
  Edge: "Edge.svg",
  Opera: "Opera.svg",
  Brave: "Brave.svg",
};

const OS_TO_LOGO: Record<string, string> = {
  Windows: "Windows.svg",
  Android: "Android.svg",
  android: "Android.svg",
  Linux: "Tux.svg",
  macOS: "macOS.svg",
  iOS: "Apple.svg",
  "Chrome OS": "Chrome.svg",
};

function getBrowserIconPath(browser: string): string {
  return BROWSER_TO_LOGO[browser] ? `https://app.rybbit.io/browsers/${BROWSER_TO_LOGO[browser]}` : "";
}

function getOSIconPath(os: string): string {
  return OS_TO_LOGO[os] ? `https://app.rybbit.io/operating-systems/${OS_TO_LOGO[os]}` : "";
}

// Duration formatting
function formatShortDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

// Extract domain from referrer
function extractDomain(url: string): string | null {
  try {
    if (!url || url === "direct") return null;
    if (url.startsWith("android-app://")) {
      const match = url.match(/android-app:\/\/([^/]+)/);
      return match ? match[1] : null;
    }
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

// Get display name for common sites
function getDisplayName(hostname: string): string {
  if (hostname.startsWith("google.") || hostname.startsWith("www.google.")) return "Google";
  const commonSites: Record<string, string> = {
    "bing.com": "Bing",
    "www.bing.com": "Bing",
    "facebook.com": "Facebook",
    "www.facebook.com": "Facebook",
    "instagram.com": "Instagram",
    "www.instagram.com": "Instagram",
    "youtube.com": "YouTube",
    "www.youtube.com": "YouTube",
    "reddit.com": "Reddit",
    "www.reddit.com": "Reddit",
    "twitter.com": "Twitter",
    "x.com": "X",
    "t.co": "X",
    "linkedin.com": "LinkedIn",
    "www.linkedin.com": "LinkedIn",
    "github.com": "GitHub",
    "duckduckgo.com": "DuckDuckGo",
    "news.ycombinator.com": "Hacker News",
  };
  return commonSites[hostname] || hostname;
}

// Build tooltip HTML
function buildTooltipHTML(session: Session): string {
  const avatarSVG = generateAvatarSVG(session.user_id, 36);
  const countryCode = session.country?.length === 2 ? session.country : "";
  const flagSVG = renderCountryFlag(countryCode);
  const deviceIconSVG = renderDeviceIcon(session.device_type || "");
  const browserIconPath = getBrowserIconPath(session.browser || "");
  const osIconPath = getOSIconPath(session.operating_system || "");
  const durationDisplay = formatShortDuration(session.session_duration || 0);

  const startTime = DateTime.fromSQL(session.session_start, { zone: "utc" })
    .setLocale(userLocale)
    .toLocal()
    .toFormat(hour12 ? "MMM d, h:mm a" : "dd MMM, HH:mm");

  const pageviewIconSVG = renderToStaticMarkup(
    createElement(Eye, { size: 14, className: "inline-block text-blue-400" })
  );
  const eventIconSVG = renderToStaticMarkup(
    createElement(MousePointerClick, { size: 14, className: "inline-block text-amber-400" })
  );

  const domain = extractDomain(session.referrer);
  let referrerIconSVG = "";
  let referrerText = "";

  if (domain) {
    referrerText = getDisplayName(domain);
    referrerIconSVG = renderChannelIcon(session.channel);
  } else {
    referrerText = session.channel || "Direct";
    referrerIconSVG = renderChannelIcon(session.channel || "Direct");
  }

  const name = generateName(session.user_id);

  return `
    <div class="globe-tooltip-content">
      <div class="tooltip-header">
        <div class="tooltip-avatar">
          ${avatarSVG}
        </div>
        <div class="tooltip-info">
          <h3 class="tooltip-name">${name}</h3>
          <div class="tooltip-location">
            ${flagSVG}
            <span>${session.city || "Unknown"}, ${session.country || "Unknown"}</span>
          </div>
        </div>
      </div>
      <div class="tooltip-stats">
        ${
          browserIconPath
            ? `<img src="${browserIconPath}" alt="${session.browser}" title="${session.browser}" class="tooltip-icon" />`
            : ""
        }
        ${
          osIconPath
            ? `<img src="${osIconPath}" alt="${session.operating_system}" title="${session.operating_system}" class="tooltip-icon" />`
            : ""
        }
        <span class="tooltip-device" title="${session.device_type}">${deviceIconSVG}</span>
        <span class="tooltip-badge">
          ${pageviewIconSVG}
          <span>${session.pageviews || 0}</span>
        </span>
        <span class="tooltip-badge">
          ${eventIconSVG}
          <span>${session.events || 0}</span>
        </span>
      </div>
      <div class="tooltip-channel">
        <span class="tooltip-badge">
          ${referrerIconSVG}
          <span>${referrerText}</span>
        </span>
      </div>
      <div class="tooltip-footer">
        <span>${startTime}</span>
        <span class="tooltip-duration">${durationDisplay}</span>
      </div>
    </div>
  `;
}

function spreadOverlappingPoints(sessions: SessionsResponse, zoom: number): Map<string, [number, number]> {
  const coordinateMap = new Map<string, [number, number]>();

  if (zoom < SPREAD_START_ZOOM) {
    return coordinateMap;
  }

  const spreadIntensity = Math.min((zoom - SPREAD_START_ZOOM) / 6, 1);
  const spreadRadius = SPREAD_RADIUS_DEGREES * spreadIntensity;

  const locationGroups = new Map<string, SessionsResponse>();

  sessions.forEach(session => {
    if (isNil(session.lat) || isNil(session.lon)) return;

    const roundedLon = round(session.lon, 4);
    const roundedLat = round(session.lat, 4);
    const key = `${roundedLat},${roundedLon}`;

    if (!locationGroups.has(key)) {
      locationGroups.set(key, []);
    }
    locationGroups.get(key)!.push(session);
  });

  locationGroups.forEach((group, key) => {
    if (group.length === 1) {
      const session = group[0];
      coordinateMap.set(session.session_id, [round(session.lon, 4), round(session.lat, 4)]);
    } else {
      const [latStr, lonStr] = key.split(",");
      const baseLat = parseFloat(latStr);
      const baseLon = parseFloat(lonStr);

      group.forEach(session => {
        const seed = hashStringToNumber(session.session_id);
        const random1 = seededRandom(seed);
        const random2 = seededRandom(seed + 1);
        const angle = random1 * 2 * Math.PI;
        const radius = Math.sqrt(random2) * spreadRadius;
        const latRad = baseLat * (Math.PI / 180);
        const lonAdjustment = Math.cos(latRad);
        const offsetLat = Math.sin(angle) * radius;
        const offsetLon = (Math.cos(angle) * radius) / lonAdjustment;

        coordinateMap.set(session.session_id, [baseLon + offsetLon, baseLat + offsetLat]);
      });
    }
  });

  return coordinateMap;
}

type MarkerData = {
  marker: mapboxgl.Marker;
  element: HTMLDivElement;
  session: Session;
};

// CSS for tooltip styling
const tooltipStyles = `
  .globe-tooltip .mapboxgl-popup-content {
    background-color: rgb(23, 23, 23);
    border: 1px solid rgb(64, 64, 64);
    border-radius: 8px;
    padding: 0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }
  .globe-tooltip .mapboxgl-popup-tip {
    border-top-color: rgb(23, 23, 23);
  }
  .globe-tooltip .mapboxgl-popup-close-button {
    display: none;
  }
  .globe-tooltip-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    min-width: 220px;
    color: white;
    font-size: 13px;
  }
  .tooltip-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .tooltip-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;
  }
  .tooltip-info {
    flex: 1;
    min-width: 0;
  }
  .tooltip-name {
    font-size: 14px;
    font-weight: 600;
    color: white;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tooltip-location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: rgb(163, 163, 163);
    margin-top: 2px;
  }
  .tooltip-stats {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .tooltip-icon {
    width: 16px;
    height: 16px;
  }
  .tooltip-device {
    display: flex;
    align-items: center;
    color: rgb(163, 163, 163);
  }
  .tooltip-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 6px;
    background-color: rgb(38, 38, 38);
    color: rgb(212, 212, 212);
    font-size: 12px;
  }
  .tooltip-channel {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tooltip-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: rgb(115, 115, 115);
    padding-top: 6px;
    border-top: 1px solid rgb(64, 64, 64);
  }
  .tooltip-duration {
    color: rgb(229, 229, 229);
  }
`;

export function SpinningGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersMapRef = useRef<Map<string, MarkerData>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const isUserInteractingRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [sessions, setSessions] = useState<SessionsResponse>([]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Inject tooltip styles
  useEffect(() => {
    const styleId = "globe-tooltip-styles";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = tooltipStyles;
      document.head.appendChild(styleEl);
    }
  }, []);

  // Fetch demo sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch(
          "https://demo.rybbit.com/api/sessions/1?past_minutes_start=120&past_minutes_end=0&filters=[]&page=1&limit=100"
        );
        const data = await response.json();
        setSessions(data.data || []);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      }
    };
    fetchSessions();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !mapboxToken || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    // Use lower zoom on mobile to make globe fit better
    const isMobile = window.innerWidth < 768;
    const initialZoom = isMobile ? 1.2 : 2;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      projection: { name: "globe" },
      zoom: initialZoom,
      center: [0, 20],
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: false,
      preserveDrawingBuffer: true,
      scrollZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      boxZoom: false,
      dragPan: !isMobile,
      dragRotate: !isMobile,
    });

    mapRef.current = map;

    // Create popup for tooltips
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "globe-tooltip",
      offset: 20,
    });
    popupRef.current = popup;

    map.on("style.load", () => {
      // Make background transparent
      const canvas = map.getCanvas();
      canvas.style.background = "transparent";

      // Try to remove/hide background layers for transparency
      try {
        map.setFog(null);
      } catch {
        // Fog may not be supported
      }

      // Apply custom styling - dark water
      try {
        if (map.getLayer("water")) {
          map.setPaintProperty("water", "fill-color", "#0a1929");
        }
      } catch {
        // Layer may not exist
      }

      // Try to make land darker/more subtle
      try {
        const layers = map.getStyle()?.layers || [];
        layers.forEach(layer => {
          if (layer.id.includes("background")) {
            map.setLayoutProperty(layer.id, "visibility", "none");
          }
        });
      } catch {
        // Layers may not exist
      }

      // Add clustering source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: CLUSTER_RADIUS,
      });

      // Add cluster circle layer
      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["all", ["has", "point_count"], [">=", ["get", "point_count"], MIN_CLUSTER_SIZE]],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#059669", 10, "#059669", 30, "#10b981", 100, "#34d399"],
          "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 30, 25],
        },
      });

      // Add cluster count layer
      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["all", ["has", "point_count"], [">=", ["get", "point_count"], MIN_CLUSTER_SIZE]],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 14,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Add unclustered point layer (hidden, for querying)
      map.addLayer({
        id: UNCLUSTERED_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 0,
          "circle-opacity": 0,
        },
      });

      // Cluster click handler
      map.on("click", CLUSTER_LAYER_ID, e => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER_ID] });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !zoom) return;
          const coordinates = (features[0].geometry as GeoJSON.Point).coordinates;
          map.easeTo({ center: coordinates as [number, number], zoom, duration: 500 });
        });
      });

      // Cursor change on cluster hover
      map.on("mouseenter", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      // Spin globe function using easeTo for smooth animation
      const spinGlobe = () => {
        if (!mapRef.current) return;
        const zoom = mapRef.current.getZoom();
        if (!isUserInteractingRef.current && zoom < MAX_SPIN_ZOOM) {
          let distancePerSecond = 360 / SECONDS_PER_REVOLUTION;
          if (zoom > SLOW_SPIN_ZOOM) {
            const zoomDif = (MAX_SPIN_ZOOM - zoom) / (MAX_SPIN_ZOOM - SLOW_SPIN_ZOOM);
            distancePerSecond *= zoomDif;
          }
          const center = mapRef.current.getCenter();
          center.lng -= distancePerSecond;
          mapRef.current.easeTo({ center, duration: 1000, easing: n => n });
        }
      };

      // Pause spinning on interaction
      map.on("mousedown", () => {
        isUserInteractingRef.current = true;
      });

      // Restart spinning after interaction ends
      map.on("mouseup", () => {
        isUserInteractingRef.current = false;
        spinGlobe();
      });
      map.on("dragend", () => {
        isUserInteractingRef.current = false;
        spinGlobe();
      });
      map.on("pitchend", () => {
        isUserInteractingRef.current = false;
        spinGlobe();
      });
      map.on("rotateend", () => {
        isUserInteractingRef.current = false;
        spinGlobe();
      });

      // When animation completes, spin again (creates continuous rotation)
      map.on("moveend", () => {
        spinGlobe();
      });

      setMapLoaded(true);

      // Start spinning
      spinGlobe();
    });

    return () => {
      // Clear markers
      markersMapRef.current.forEach(({ marker }) => marker.remove());
      markersMapRef.current.clear();
      if (popupRef.current) {
        popupRef.current.remove();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [mapboxToken]);

  // Update sessions data and markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || sessions.length === 0) return;

    const mapInstance = mapRef.current;
    const markersMap = markersMapRef.current;
    const popup = popupRef.current;
    const shouldShowClusters = sessions.length > CLUSTERING_THRESHOLD;

    // Update GeoJSON data
    const updateGeoJSONData = () => {
      const source = mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (!source) return;

      const zoom = mapInstance.getZoom();
      const spreadCoordinates = spreadOverlappingPoints(sessions, zoom);

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: sessions
          .filter(s => !isNil(s.lat) && !isNil(s.lon))
          .map(session => {
            const coords = spreadCoordinates.get(session.session_id) || [round(session.lon, 4), round(session.lat, 4)];
            return {
              type: "Feature",
              properties: session,
              geometry: {
                type: "Point",
                coordinates: coords,
              },
            };
          }),
      };

      source.setData(geojson);
    };

    // Show/hide cluster layers
    const visibility = shouldShowClusters ? "visible" : "none";
    if (mapInstance.getLayer(CLUSTER_LAYER_ID)) {
      mapInstance.setLayoutProperty(CLUSTER_LAYER_ID, "visibility", visibility);
    }
    if (mapInstance.getLayer(CLUSTER_COUNT_LAYER_ID)) {
      mapInstance.setLayoutProperty(CLUSTER_COUNT_LAYER_ID, "visibility", visibility);
    }

    // Update markers function
    const updateMarkers = async () => {
      const zoom = mapInstance.getZoom();
      const spreadCoordinates = spreadOverlappingPoints(sessions, zoom);

      let unclusteredFeatures: GeoJSON.Feature[] = [];

      if (!shouldShowClusters) {
        // Show all sessions as individual markers
        unclusteredFeatures = sessions
          .filter(s => !isNil(s.lat) && !isNil(s.lon))
          .map(session => {
            const coords = spreadCoordinates.get(session.session_id) || [round(session.lon, 4), round(session.lat, 4)];
            return {
              type: "Feature",
              properties: session,
              geometry: { type: "Point", coordinates: coords },
            } as GeoJSON.Feature;
          });
      } else {
        // Get unclustered features from map
        const features = mapInstance.querySourceFeatures(SOURCE_ID);
        const source = mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        const promises: Promise<void>[] = [];

        features.forEach(f => {
          if (!f.properties) return;

          if (!f.properties.cluster) {
            unclusteredFeatures.push(f as GeoJSON.Feature);
          } else if (f.properties.point_count && f.properties.point_count < MIN_CLUSTER_SIZE) {
            const promise = new Promise<void>(resolve => {
              source.getClusterLeaves(f.properties!.cluster_id, f.properties!.point_count, 0, (err, leaves) => {
                if (!err && leaves) {
                  unclusteredFeatures.push(...(leaves as GeoJSON.Feature[]));
                }
                resolve();
              });
            });
            promises.push(promise);
          }
        });

        await Promise.all(promises);
      }

      // Build set of current session IDs
      const currentSessionIds = new Set(
        unclusteredFeatures.map(f => (f.properties as Session)?.session_id).filter(Boolean)
      );

      // Remove markers no longer visible
      const toRemove: string[] = [];
      markersMap.forEach(({ marker }, sessionId) => {
        if (!currentSessionIds.has(sessionId)) {
          marker.remove();
          toRemove.push(sessionId);
        }
      });
      toRemove.forEach(id => markersMap.delete(id));

      // Create or update markers
      unclusteredFeatures.forEach(feature => {
        const session = feature.properties as Session;
        if (!session?.session_id) return;

        const existing = markersMap.get(session.session_id);
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;

        if (existing) {
          const currentLngLat = existing.marker.getLngLat();
          if (currentLngLat.lng !== lng || currentLngLat.lat !== lat) {
            existing.marker.setLngLat([lng, lat]);
          }
        } else {
          // Create avatar marker with nested structure to avoid transform conflicts
          const markerContainer = document.createElement("div");
          markerContainer.style.cursor = "pointer";

          const avatarContainer = document.createElement("div");
          avatarContainer.className = "timeline-avatar-marker";
          avatarContainer.style.borderRadius = "50%";
          avatarContainer.style.overflow = "hidden";
          avatarContainer.style.width = "32px";
          avatarContainer.style.height = "32px";
          avatarContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
          avatarContainer.style.transition = "transform 0.15s ease";
          avatarContainer.innerHTML = generateAvatarSVG(session.user_id, 32);

          markerContainer.appendChild(avatarContainer);

          // Add hover events for tooltip
          markerContainer.addEventListener("mouseenter", () => {
            avatarContainer.style.transform = "scale(1.15)";
            if (popup && mapInstance) {
              const markerData = markersMap.get(session.session_id);
              if (markerData) {
                const lngLat = markerData.marker.getLngLat();
                popup.setLngLat(lngLat).setHTML(buildTooltipHTML(markerData.session)).addTo(mapInstance);
              }
            }
          });

          markerContainer.addEventListener("mouseleave", () => {
            avatarContainer.style.transform = "scale(1)";
            if (popup) {
              popup.remove();
            }
          });

          const marker = new mapboxgl.Marker({
            element: markerContainer,
            anchor: "center",
          })
            .setLngLat([lng, lat])
            .addTo(mapInstance);

          markersMap.set(session.session_id, { marker, element: markerContainer, session });
        }
      });
    };

    // Initial update
    updateGeoJSONData();
    updateMarkers();

    // Throttled updates on map events
    const throttledUpdate = throttle(
      () => {
        updateGeoJSONData();
        updateMarkers();
      },
      150,
      { leading: true, trailing: true }
    );

    mapInstance.on("zoom", throttledUpdate);
    mapInstance.on("move", throttledUpdate);
    mapInstance.on("sourcedata", throttledUpdate);

    return () => {
      throttledUpdate.cancel();
      mapInstance.off("zoom", throttledUpdate);
      mapInstance.off("move", throttledUpdate);
      mapInstance.off("sourcedata", throttledUpdate);
      // Clear markers on cleanup
      markersMap.forEach(({ marker }) => marker.remove());
      markersMap.clear();
    };
  }, [sessions, mapLoaded]);

  if (!mapboxToken) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full [&_.mapboxgl-ctrl-bottom-left]:!hidden [&_.mapboxgl-ctrl-logo]:!hidden [&_.mapboxgl-ctrl-bottom-right]:!hidden"
      style={{ background: "transparent" }}
    />
  );
}
