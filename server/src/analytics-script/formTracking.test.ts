import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FormTrackingManager } from "./formTracking.js";

// An exception thrown inside an event listener never escapes dispatchEvent();
// the browser (and jsdom) report it as an "error" event on window instead.
function captureUncaught() {
  const errors: unknown[] = [];
  const onError = (e: ErrorEvent) => {
    e.preventDefault();
    errors.push(e.error ?? e.message);
  };
  window.addEventListener("error", onError);
  return { errors, stop: () => window.removeEventListener("error", onError) };
}

function makeManager() {
  const tracker = {
    trackFormSubmit: vi.fn(),
    trackInputChange: vi.fn(),
  };
  const manager = new FormTrackingManager(tracker as any, {} as any);
  manager.initialize();
  return { tracker, manager };
}

describe("FormTrackingManager", () => {
  let manager: FormTrackingManager;
  let tracker: { trackFormSubmit: ReturnType<typeof vi.fn>; trackInputChange: ReturnType<typeof vi.fn> };
  let uncaught: ReturnType<typeof captureUncaught>;

  beforeEach(() => {
    document.body.innerHTML = "";
    uncaught = captureUncaught();
    ({ tracker, manager } = makeManager());
  });

  afterEach(() => {
    manager.cleanup();
    uncaught.stop();
  });

  it("tracks a change on a named input", () => {
    document.body.innerHTML = `<form id="f"><input name="email" type="email"></form>`;
    const input = document.querySelector("input")!;

    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(tracker.trackInputChange).toHaveBeenCalledWith(
      expect.objectContaining({ element: "input", inputType: "email", inputName: "email", formId: "f" })
    );
  });

  it("ignores a change event whose target is not an element (custom event with an overridden target)", () => {
    // Vidstack (and other component libraries) dispatch DOM events from a host
    // element but redefine `event.target` to the component instance, which has
    // no tagName. The capturing listener on document still receives it.
    document.body.innerHTML = `<div id="host"></div>`;
    const host = document.getElementById("host")!;
    const event = new Event("change", { bubbles: true });
    Object.defineProperty(event, "target", { get: () => ({ some: "component" }) });

    host.dispatchEvent(event);

    expect(uncaught.errors).toEqual([]);
    expect(tracker.trackInputChange).not.toHaveBeenCalled();
  });

  it("ignores a change event dispatched on document itself", () => {
    document.dispatchEvent(new Event("change"));

    expect(uncaught.errors).toEqual([]);
    expect(tracker.trackInputChange).not.toHaveBeenCalled();
  });
});
