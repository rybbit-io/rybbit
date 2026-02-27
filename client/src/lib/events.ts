// ============================================================================
// Event Types and Configuration
// ============================================================================

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

// ============================================================================
// Event Display Utilities
// ============================================================================

// Generic interface for event display - works with both SessionEvent and Event types
export interface EventLike {
  type: string;
  event_name?: string;
  props?: Record<string, any>;
}

// Helper to generate display name for auto-captured events
export function getEventDisplayName(item: EventLike, t?: TranslationFunction): string {
  if (item.event_name) return item.event_name;

  const translate = t || ((key: string) => key);

  switch (item.type) {
    case "outbound":
      return translate("Outbound Click");
    case "button_click":
      if (item.props?.text) return translate("Clicked button with text \"{text}\"", { text: item.props.text });
      return translate("Clicked button");
    case "copy": {
      if (!item.props?.text) return translate("Copied text");
      const text = String(item.props.text);
      return translate("Copied \"{text}\"", { text: `${text.substring(0, 50)}${text.length > 50 ? "..." : ""}` });
    }
    case "form_submit":
      if (item.props?.formId) return translate("Submitted form \"{name}\"", { name: item.props.formId });
      if (item.props?.formName) return translate("Submitted form \"{name}\"", { name: item.props.formName });
      if (item.props?.formAction) return translate("Submitted form to \"{action}\"", { action: item.props.formAction });
      return translate("Submitted form");
    case "input_change": {
      const inputType = item.props?.inputType ? `${item.props.inputType} ` : "";
      if (item.props?.inputName) return translate("Changed {type}input \"{name}\"", { type: inputType, name: item.props.inputName });
      return translate("Changed {type}input", { type: inputType });
    }
    default:
      return translate("Event");
  }
}

// Props to hide from badges (already shown in event name or redundant)
export const PROPS_TO_HIDE: Record<string, string[]> = {
  button_click: ["text"],
  copy: ["text"],
  form_submit: ["formId", "formName", "formAction"],
  input_change: ["inputName", "inputType", "element"],
};
