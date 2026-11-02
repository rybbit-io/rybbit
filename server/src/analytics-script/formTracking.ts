import { ScriptConfig, FormSubmitProperties, InputChangeProperties } from "./types.js";
import { Tracker } from "./tracking.js";

/**
 * A form's own property, read past its controls. A control named like the
 * property (<input name="method">, "action", "elements") replaces it on the
 * form itself — form.method is then that input, and .toUpperCase() throws —
 * but the prototype's getter still returns the real value.
 */
function getFormProperty<K extends "action" | "method" | "elements">(
  form: HTMLFormElement,
  key: K
): HTMLFormElement[K] | undefined {
  return Object.getOwnPropertyDescriptor(HTMLFormElement.prototype, key)?.get?.call(form);
}

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
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    // id and name come from their attributes, which controls named "id" or
    // "name" can't shadow; form.name would be that input, an object the server
    // rejects as a form name.
    const properties: FormSubmitProperties = {
      formId: form.getAttribute("id") || "",
      formName: form.getAttribute("name") || "",
      formAction: getFormProperty(form, "action") || "",
      method: (getFormProperty(form, "method") || "get").toUpperCase(),
      fieldCount: getFormProperty(form, "elements")?.length ?? 0,
      ariaLabel: form.getAttribute("aria-label") || undefined,
      ...this.extractDataAttributes(form),
    };

    this.tracker.trackFormSubmit(properties);
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLElement;
    // A capturing document listener sees every "change" event on the page, not
    // only native input events. Libraries dispatch their own (e.g. Vidstack's
    // media player overrides `event.target` with a plain component object),
    // and `document` itself can be a target — none of those have a tagName.
    if (!(target instanceof Element)) return;
    const tagName = target.tagName.toUpperCase();

    if (!["INPUT", "SELECT", "TEXTAREA"].includes(tagName)) return;

    // Skip disabled inputs
    if ((target as HTMLInputElement).disabled) return;

    // Skip readonly inputs since the user can't directly edit them
    // (e.g. fields computed from another input like a slider)
    if ((target as HTMLInputElement).readOnly) return;

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
      formId: (target as HTMLInputElement).form?.getAttribute("id") || undefined,
      formName: (target as HTMLInputElement).form?.getAttribute("name") || undefined,
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
