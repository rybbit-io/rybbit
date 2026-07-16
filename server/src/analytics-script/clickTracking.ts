import { ScriptConfig, ButtonClickProperties } from "./types.js";
import { Tracker } from "./tracking.js";

export class ClickTrackingManager {
  private tracker: Tracker;
  private config: ScriptConfig;

  constructor(tracker: Tracker, config: ScriptConfig) {
    this.tracker = tracker;
    this.config = config;
  }

  initialize(): void {
    document.addEventListener("click", this.handleClick.bind(this), true);
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Track button clicks
    if (this.config.trackButtonClicks && this.isButton(target)) {
      this.trackButtonClick(target);
    }
  }

  private isButton(element: HTMLElement): boolean {
    // Check if element is a button
    if (element.tagName === "BUTTON") return true;
    if (element.getAttribute("role") === "button") return true;
    if (element.tagName === "INPUT") {
      const type = (element as HTMLInputElement).type?.toLowerCase();
      if (type === "submit" || type === "button") return true;
    }

    // Check parent elements up to 3 levels
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      if (parent.tagName === "BUTTON") return true;
      if (parent.getAttribute("role") === "button") return true;
      parent = parent.parentElement;
      depth++;
    }

    return false;
  }

  private trackButtonClick(element: HTMLElement): void {
    const buttonElement = this.findButton(element);
    if (!buttonElement) return;

    // Skip if button has custom event tracking
    if (buttonElement.hasAttribute("data-rybbit-event")) return;

    const properties: ButtonClickProperties = {
      text: this.getElementText(buttonElement),
      ...this.extractDataAttributes(buttonElement),
    };

    this.tracker.trackButtonClick(properties);
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

  private findButton(element: HTMLElement): HTMLElement | null {
    if (element.tagName === "BUTTON") return element;
    if (element.getAttribute("role") === "button") return element;
    if (element.tagName === "INPUT") {
      const type = (element as HTMLInputElement).type?.toLowerCase();
      if (type === "submit" || type === "button") return element;
    }

    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      if (parent.tagName === "BUTTON") return parent;
      if (parent.getAttribute("role") === "button") return parent;
      parent = parent.parentElement;
      depth++;
    }

    return null;
  }

  private getElementText(element: HTMLElement): string | undefined {
    const text = element.textContent?.trim().substring(0, 100);
    if (text) return text;

    const ariaLabel = element.getAttribute("aria-label")?.trim().substring(0, 100);
    if (ariaLabel) return ariaLabel;

    if (element.tagName === "INPUT") {
      const value = (element as HTMLInputElement).value?.trim().substring(0, 100);
      if (value) return value;
    }

    const title = element.getAttribute("title")?.trim().substring(0, 100);
    if (title) return title;

    return undefined;
  }

  cleanup(): void {
    document.removeEventListener("click", this.handleClick.bind(this), true);
  }
}
