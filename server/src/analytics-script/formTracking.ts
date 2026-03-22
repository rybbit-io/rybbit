import { ScriptConfig, FormSubmitProperties, InputChangeProperties } from "./types.js";
import { Tracker } from "./tracking.js";

export class FormTrackingManager {
  private tracker: Tracker;
  private config: ScriptConfig;
  private boundHandleSubmit: (event: Event) => void;
  private boundHandleChange: (event: Event) => void;

  constructor(tracker: Tracker, config: ScriptConfig) {
    this.tracker = tracker;
    this.config = config;
    this.boundHandleSubmit = this.handleSubmit.bind(this);
    this.boundHandleChange = this.handleChange.bind(this);
  }

  initialize(): void {
    // Form submissions
    document.addEventListener("submit", this.boundHandleSubmit, true);

    // Input/select/textarea change events
    document.addEventListener("change", this.boundHandleChange, true);
  }

  cleanup(): void {
    document.removeEventListener("submit", this.boundHandleSubmit, true);
    document.removeEventListener("change", this.boundHandleChange, true);
  }

  private handleSubmit(event: Event): void {
    const form = event.target as HTMLFormElement;
    if (form.tagName !== "FORM") return;

    const properties: FormSubmitProperties = {
      formId: form.id || "",
      formName: form.name || "",
      formAction: form.action || "",
      method: (form.method || "get").toUpperCase(),
      fieldCount: form.elements.length,
      ariaLabel: form.getAttribute("aria-label") || undefined,
      ...this.extractDataAttributes(form),
    };

    this.tracker.trackFormSubmit(properties);
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toUpperCase();

    if (!["INPUT", "SELECT", "TEXTAREA"].includes(tagName)) return;

    // Skip disabled inputs
    if ((target as HTMLInputElement).disabled) return;

    // Skip hidden inputs and password fields for privacy
    if (tagName === "INPUT") {
      const inputType = (target as HTMLInputElement).type?.toLowerCase();
      if (inputType === "hidden" || inputType === "password") return;
    }

    const inputName =
      (target as HTMLInputElement).name ||
      target.id ||
      target.getAttribute("aria-label") ||
      (target as HTMLInputElement).placeholder ||
      "";

    const properties: InputChangeProperties = {
      element: tagName.toLowerCase(),
      inputType: tagName === "INPUT" ? (target as HTMLInputElement).type?.toLowerCase() : undefined,
      inputName,
      formId: (target as HTMLInputElement).form?.id || undefined,
      formName: (target as HTMLInputElement).form?.name || undefined,
      ...this.extractDataAttributes(target),
    };

    this.tracker.trackInputChange(properties);
  }

  private extractDataAttributes(element: HTMLElement): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const attr of element.attributes) {
      if (attr.name.startsWith("data-rybbit-prop-")) {
        const key = attr.name.replace("data-rybbit-prop-", "");
        attrs[key] = attr.value;
      }
    }
    return attrs;
  }
}
