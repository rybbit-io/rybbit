"use client";

import { Clock, Eye, Laptop, MousePointerClick, Smartphone, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { useExtracted } from "next-intl";
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
      className="absolute w-full rounded-md border border-neutral-300/50 dark:border-neutral-800/50 bg-neutral-100/50 dark:bg-neutral-800/20 overflow-hidden p-2 flex flex-col transition-all duration-500"
      style={{
        transform: isAnimating && index === 0 ? `translateY(-70px)` : `translateY(${index * 70}px)`,
        opacity: isAnimating && index === 0 ? 0 : index < 4 ? 1 : 0,
        zIndex: 10 - index,
      }}
    >
      <div className="flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100 mb-1.5">
        <div className="flex items-center gap-2">
          {isPageview ? (
            <Eye className="w-4 h-4 text-blue-400" />
          ) : (
            <MousePointerClick className="w-4 h-4 text-amber-400" />
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

        <div className="ml-auto flex items-center text-xs text-neutral-500 dark:text-neutral-400">
          <Clock className="w-3 h-3 mr-1" />
          <span>{event.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

export function RealTimeAnalytics() {
  const t = useExtracted();
  const [events, setEvents] = useState<Event[]>(() => [
    { ...eventTemplates[0], id: 1, timestamp: t("2 min ago") },
    { ...eventTemplates[1], id: 2, timestamp: t("45 sec ago") },
    { ...eventTemplates[2], id: 3, timestamp: t("just now") },
  ]);
  const [onlineCount, setOnlineCount] = useState(28);
  const [nextId, setNextId] = useState(4);

  useEffect(() => {
    // Add new events periodically
    const interval = setInterval(() => {
      const randomTemplate = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      const newEvent: Event = {
        ...randomTemplate,
        id: nextId,
        timestamp: t("just now"),
        isNew: true,
      };

      setEvents(prevEvents => {
        // Add new event at the beginning and keep only last 4 events
        const updatedEvents = [newEvent, ...prevEvents.slice(0, 3)].map((event, index) => ({
          ...event,
          isNew: index === 0,
          // Update timestamps
          timestamp: index === 0 ? t("just now") : index === 1 ? t("30 sec ago") : index === 2 ? t("1 min ago") : t("2 min ago"),
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
      title={t("Real-time Analytics")}
      description={t("See your site performance as it happens with instant data updates and live visitor activity.")}
      icon={Activity}
    >
      <div className="space-y-4 mt-4 transform -rotate-2 translate-x-8 translate-y-8 bg-neutral-100/50 dark:bg-neutral-800/20 border border-neutral-300/50 dark:border-neutral-800/50 pb-20 rounded-lg p-4 -mb-[90px] transition-transform duration-300 hover:scale-105 hover:-rotate-1">
        <div className="relative" style={{ height: "280px" }}>
          {events.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} isNew={event.isNew} />
          ))}
        </div>
      </div>
    </Card>
  );
}
