"use client";

import { Clock, Eye, Laptop, MousePointerClick, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Browser } from "../Browser";
import { CountryFlag } from "../Country";
import { OperatingSystem } from "../OperatingSystem";
import { Card } from "./Card";

// Mock event templates
const eventTemplates = [
  {
    type: "pageview",
    pathname: "/pricing",
    country: "US",
    browser: "Chrome",
    operating_system: "Windows",
    device_type: "Desktop",
  },
  {
    type: "event",
    event_name: "button_click",
    pathname: "/features",
    country: "GB",
    browser: "Safari",
    operating_system: "macOS",
    device_type: "Desktop",
  },
  {
    type: "pageview",
    pathname: "/blog/analytics-tips",
    country: "DE",
    browser: "Firefox",
    operating_system: "Linux",
    device_type: "Mobile",
  },
  {
    type: "pageview",
    pathname: "/docs/getting-started",
    country: "JP",
    browser: "Chrome",
    operating_system: "macOS",
    device_type: "Desktop",
  },
  {
    type: "event",
    event_name: "signup",
    pathname: "/signup",
    country: "FR",
    browser: "Edge",
    operating_system: "Windows",
    device_type: "Desktop",
  },
  {
    type: "pageview",
    pathname: "/",
    country: "CA",
    browser: "Safari",
    operating_system: "iOS",
    device_type: "Mobile",
  },
  {
    type: "event",
    event_name: "download",
    pathname: "/downloads",
    country: "AU",
    browser: "Chrome",
    operating_system: "Android",
    device_type: "Mobile",
  },
];

interface Event {
  id: number;
  type: string;
  pathname?: string;
  event_name?: string;
  country: string;
  browser: string;
  operating_system: string;
  device_type: string;
  timestamp: string;
  isNew?: boolean;
}

// Generate initial events with timestamps
const generateInitialEvents = (): Event[] => {
  return [
    { ...eventTemplates[0], id: 1, timestamp: "2 min ago" },
    { ...eventTemplates[1], id: 2, timestamp: "45 sec ago" },
    { ...eventTemplates[2], id: 3, timestamp: "just now" },
  ];
};

// EventCard component for Real-time Analytics
function EventCard({ event, index, isNew }: { event: Event; index: number; isNew?: boolean }) {
  const isPageview = event.type === "pageview";
  const [isAnimating, setIsAnimating] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      // Reset animation state after a short delay
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  return (
    <div
      className="absolute w-full rounded-lg bg-neutral-800/50 overflow-hidden p-3 flex flex-col transition-all duration-500"
      style={{
        transform: isAnimating && index === 0 ? `translateY(-82px)` : `translateY(${index * 82}px)`,
        opacity: isAnimating && index === 0 ? 0 : index < 4 ? 1 : 0,
        zIndex: 10 - index,
      }}
    >
      <div className="flex items-center gap-2 text-sm text-neutral-100 mb-2">
        <div className="flex items-center gap-2">
          {isPageview ? (
            <Eye className="w-4 h-4 text-blue-500" />
          ) : (
            <MousePointerClick className="w-4 h-4 text-amber-500" />
          )}
        </div>

        <div className="truncate">{isPageview ? event.pathname : event.event_name}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex space-x-2 items-center ml-6">
          <div className="flex items-center">
            <CountryFlag country={event.country} />
          </div>
          <div>
            <Browser browser={event.browser || "Unknown"} />
          </div>
          <div>
            <OperatingSystem os={event.operating_system || ""} />
          </div>
          <div>
            {event.device_type === "Mobile" ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
          </div>
        </div>

        <div className="ml-auto flex items-center text-xs text-neutral-400">
          <Clock className="w-3 h-3 mr-1" />
          <span>{event.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

export function RealTimeAnalytics() {
  const [events, setEvents] = useState<Event[]>(generateInitialEvents());
  const [onlineCount, setOnlineCount] = useState(28);
  const [nextId, setNextId] = useState(4);

  useEffect(() => {
    // Add new events periodically
    const interval = setInterval(() => {
      const randomTemplate = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      const newEvent: Event = {
        ...randomTemplate,
        id: nextId,
        timestamp: "just now",
        isNew: true,
      };

      setEvents(prevEvents => {
        // Add new event at the beginning and keep only last 4 events
        const updatedEvents = [newEvent, ...prevEvents.slice(0, 3)].map((event, index) => ({
          ...event,
          isNew: index === 0,
          // Update timestamps
          timestamp: index === 0 ? "just now" : index === 1 ? "30 sec ago" : index === 2 ? "1 min ago" : "2 min ago",
        }));
        return updatedEvents;
      });

      setNextId(prev => prev + 1);

      // Randomly update online count
      setOnlineCount(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        return Math.max(15, Math.min(45, prev + change));
      });
    }, 3000); // Add new event every 3 seconds

    return () => clearInterval(interval);
  }, [nextId]);

  return (
    <Card
      title="Real-time Analytics"
      description="See your site performance as it happens with instant data updates and live visitor activity."
    >
      <div className="bg-neutral-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Live Visitors</h4>
          <span className="bg-emerald-500/20 text-emerald-400 font-medium px-2 py-1 rounded text-sm animate-pulse">
            {onlineCount} online
          </span>
        </div>

        <div className="relative" style={{ height: "328px" }}>
          {events.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} isNew={event.isNew} />
          ))}
        </div>
      </div>
    </Card>
  );
}
