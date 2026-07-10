// ============================================================================
// Event Types and Configuration
// ============================================================================

import { useCallback } from "react";
import { useExtracted } from "next-intl";

export type TranslationFunction = (key: string, values?: Record<string, string>) => string;

export type EventType =
  | "pageview"
  | "custom_event"
  | "error"
  | "outbound"
  | "button_click"
  | "copy"
  | "form_submit"
  | "input_change";

export interface EventTypeConfig {
  value: EventType;
  label: string;
  colorClass: string;
}

export const EVENT_TYPE_CONFIG: EventTypeConfig[] = [
  { value: "pageview", label: "Pageview", colorClass: "text-blue-400" },
  { value: "custom_event", label: "Event", colorClass: "text-amber-400" },
  { value: "outbound", label: "Outbound", colorClass: "text-lime-400" },
  { value: "button_click", label: "Button Click", colorClass: "text-green-400" },
  { value: "copy", label: "Copy", colorClass: "text-sky-400" },
  { value: "form_submit", label: "Form Submit", colorClass: "text-purple-400" },
  { value: "input_change", label: "Input Change", colorClass: "text-pink-400" },
  { value: "error", label: "Error", colorClass: "text-red-400" },
];

// Autocaptured event types that goals and funnel steps can target directly
export const AUTOCAPTURE_TARGET_TYPES = ["outbound", "button_click", "form_submit", "copy"] as const;

export type AutocaptureTargetType = (typeof AUTOCAPTURE_TARGET_TYPES)[number];

export function isAutocaptureTargetType(type: string): type is AutocaptureTargetType {
  return (AUTOCAPTURE_TARGET_TYPES as readonly string[]).includes(type);
}

// Maps goal types ("path"/"event") and funnel step types ("page"/"event")
// onto event types for icon and color display
export function targetTypeToEventType(type: string): EventType {
  if (type === "path" || type === "page") return "pageview";
  if (type === "event") return "custom_event";
  return EVENT_TYPE_CONFIG.some(config => config.value === type) ? (type as EventType) : "custom_event";
}

export type PropertyFilter = { key: string; value: string | number | boolean };

type LegacyPropertyConfig = {
  propertyFilters?: PropertyFilter[];
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
};

// Support both the propertyFilters array and the legacy single-property fields,
// for goals and funnel steps of any type.
export function resolvePropertyFilters(config: LegacyPropertyConfig): PropertyFilter[] {
  return (
    config.propertyFilters ||
    (config.eventPropertyKey && config.eventPropertyValue !== undefined
      ? [{ key: config.eventPropertyKey, value: config.eventPropertyValue }]
      : [])
  );
}

// ============================================================================
// Event Display Utilities
// ============================================================================

// Generic interface for event display - works with both SessionEvent and Event types
export interface EventLike {
  type: string;
  event_name?: string;
  props?: Record<string, any>;
}

export type EventDisplayNameFormatter = (item: EventLike) => string;

// Hook to generate display names for auto-captured events.
// Keep translation calls literal so next-intl can extract and compile them.
export function useEventDisplayName(): EventDisplayNameFormatter {
  const t = useExtracted();

  return useCallback(
    (item: EventLike): string => {
      if (item.event_name) return item.event_name;

      switch (item.type) {
        case "outbound":
          return t("Outbound Click");
        case "button_click":
          if (item.props?.text) return t("Clicked button with text \"{text}\"", { text: String(item.props.text) });
          return t("Clicked button");
        case "copy": {
          if (!item.props?.text) return t("Copied text");
          const text = String(item.props.text);
          return t("Copied \"{text}\"", { text: `${text.substring(0, 50)}${text.length > 50 ? "..." : ""}` });
        }
        case "form_submit":
          if (item.props?.formId) return t("Submitted form \"{name}\"", { name: String(item.props.formId) });
          if (item.props?.formName) return t("Submitted form \"{name}\"", { name: String(item.props.formName) });
          if (item.props?.formAction) return t("Submitted form to \"{action}\"", { action: String(item.props.formAction) });
          return t("Submitted form");
        case "input_change": {
          const inputType = item.props?.inputType ? `${item.props.inputType} ` : "";
          if (item.props?.inputName) return t("Changed {type}input \"{name}\"", { type: inputType, name: String(item.props.inputName) });
          return t("Changed {type}input", { type: inputType });
        }
        default:
          return t("Event");
      }
    },
    [t]
  );
}

// Props to hide from badges (already shown in event name or redundant)
export const PROPS_TO_HIDE: Record<string, string[]> = {
  button_click: ["text"],
  copy: ["text"],
  form_submit: ["formId", "formName", "formAction"],
  input_change: ["inputName", "inputType", "element"],
};
