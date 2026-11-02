"use client";

import { Event } from "../../../../../api/analytics/endpoints";
import type { EventLogEvent } from "../../../../../api/analytics/hooks/events/useGetEvents";

/**
 * The event's cursor, which tells it apart from every other event. A key built
 * from the whole-second timestamp merged two clicks within the same second.
 */
export function getEventKey(event: EventLogEvent) {
  return event.event_cursor;
}

/** Newest first, in the endpoint's order: by millisecond, then tie-breaker. */
export function compareEventsNewestFirst(a: EventLogEvent, b: EventLogEvent) {
  // The milliseconds have no leading zeros, so a longer cursor is a later one.
  const x = a.event_cursor;
  const y = b.event_cursor;
  return y.length - x.length || (y < x ? -1 : y > x ? 1 : 0);
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

export function buildEventPath(event: Event) {
  return `${event.pathname}${event.querystring ? `${event.querystring}` : ""}`;
}

/** A property value as one line of text: strings as they are, everything else as JSON. */
export function formatPropertyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return String(value);
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export type PropertyToken = { key: string; value: string };

/** What a log row shows of an event's payload, besides its name and page. */
export type EventRowData =
  | { kind: "link"; url: string }
  | { kind: "message"; text: string }
  | { kind: "tokens"; tokens: PropertyToken[] };

// A row is one line: this many key=value tokens is already more than it can show.
const MAX_ROW_TOKENS = 6;

export function getEventRowData(event: Event, props: Record<string, any>): EventRowData {
  if (event.type === "outbound" && typeof props.url === "string" && props.url) {
    return { kind: "link", url: props.url };
  }
  if (event.type === "error" && props.message) {
    return { kind: "message", text: formatPropertyValue(props.message) };
  }
  return {
    kind: "tokens",
    tokens: Object.entries(props)
      .slice(0, MAX_ROW_TOKENS)
      .map(([key, value]) => ({ key, value: formatPropertyValue(value) })),
  };
}

/**
 * Whether a loaded event matches the log's search box: its name, its type, any
 * property key or value, the page, or the user (display name or either id).
 * `query` is already trimmed and lower-cased.
 */
export function matchesEventSearch(event: Event, query: string, typeLabel: string, userName: string): boolean {
  if (!query) return true;
  return [
    event.event_name,
    typeLabel,
    event.properties,
    event.pathname,
    userName,
    event.user_id,
    event.identified_user_id,
  ].some(field => !!field && field.toLowerCase().includes(query));
}
