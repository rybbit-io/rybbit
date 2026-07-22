"use client";

import { Event } from "../../../../../api/analytics/endpoints";
import { EVENT_TYPE_CONFIG, EventDisplayNameFormatter } from "../../../../../lib/events";

export function getEventKey(event: Event) {
  return `${event.timestamp}-${event.session_id}-${event.user_id}-${event.type}-${event.event_name ?? ""}-${event.pathname}`;
}

export function parseEventProperties(event: Event): Record<string, any> {
  if (event.properties && event.properties !== "{}") {
    try {
      return JSON.parse(event.properties);
    } catch (e) {
      console.error("Failed to parse event properties:", e);
    }
  }
  return {};
}

// EVENT_TYPE_CONFIG labels are display strings ("Pageview", "Input Change"), not
// message keys, so they must not be passed to t() — doing so throws MISSING_MESSAGE
// and breaks the events page. Return them as-is.
export function getEventTypeLabel(type: string) {
  return EVENT_TYPE_CONFIG.find(item => item.value === type)?.label ?? "Event";
}

export function buildEventPath(event: Event) {
  return `${event.pathname}${event.querystring ? `${event.querystring}` : ""}`;
}

export function getMainData(
  event: Event,
  props: Record<string, any>,
  getEventDisplayName: EventDisplayNameFormatter
) {
  const isPageview = event.type === "pageview";
  const isOutbound = event.type === "outbound";
  const isButtonClick = event.type === "button_click";
  const isCopy = event.type === "copy";
  const isFormSubmit = event.type === "form_submit";
  const isInputChange = event.type === "input_change";

  if (isPageview) {
    return {
      label: buildEventPath(event),
      url: `https://${event.hostname}${buildEventPath(event)}`,
    };
  }

  if (isOutbound && props.url) {
    return {
      label: props.url as string,
      url: props.url as string,
    };
  }

  if (isButtonClick || isCopy || isFormSubmit || isInputChange) {
    return {
      label: getEventDisplayName({ type: event.type, event_name: event.event_name, props }),
    };
  }

  return {
    label: event.event_name || "Event",
  };
}
