import { CopyProperties } from "./types.js";
import { Tracker } from "./tracking.js";

export class CopyTrackingManager {
  private tracker: Tracker;

  constructor(tracker: Tracker) {
    this.tracker = tracker;
  }

  initialize(): void {
    document.addEventListener("copy", this.handleCopy.bind(this));
  }

  private handleCopy(): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString();
    const textLength = text.length;

    if (textLength === 0) return;

    // Get the source element of the selection
    const anchorNode = selection.anchorNode;
    const sourceElement = anchorNode instanceof HTMLElement
      ? anchorNode
      : anchorNode?.parentElement;

    if (!sourceElement) return;

    const properties: CopyProperties = {
      text: text.substring(0, 500),
      ...(textLength > 500 && { textLength }),
      sourceElement: sourceElement.tagName.toLowerCase(),
    };

    this.tracker.trackCopy(properties);
  }

  cleanup(): void {
    document.removeEventListener("copy", this.handleCopy.bind(this));
  }
}
