import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormTrackingManager } from "./formTracking.js";
import type { Tracker } from "./tracking.js";
import type { ScriptConfig } from "./types.js";

describe("FormTrackingManager", () => {
  let manager: FormTrackingManager;
  let tracker: { trackFormSubmit: ReturnType<typeof vi.fn>; trackInputChange: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tracker = { trackFormSubmit: vi.fn(), trackInputChange: vi.fn() };
    manager = new FormTrackingManager(tracker as unknown as Tracker, {} as ScriptConfig);
    manager.initialize();
  });

  afterEach(() => {
    manager.cleanup();
    document.body.innerHTML = "";
  });

  // Browsers expose each named control as a property of its form, shadowing the
  // form's own property of that name. jsdom doesn't, so define them the way a
  // browser resolves them.
  function shadowWithControls(form: HTMLFormElement) {
    for (const control of Array.from(form.querySelectorAll("input[name]"))) {
      Object.defineProperty(form, control.getAttribute("name")!, { configurable: true, value: control });
    }
  }

  it("reads the form's own metadata when controls shadow it", () => {
    document.body.innerHTML = `
      <form id="signup" name="signup-form" action="/register" method="post">
        <input name="name"><input name="method"><input name="id"><input name="action"><input name="elements">
      </form>`;
    const form = document.querySelector("form")!;
    shadowWithControls(form);

    form.dispatchEvent(new Event("submit", { bubbles: true }));

    expect(tracker.trackFormSubmit).toHaveBeenCalledWith({
      formId: "signup",
      formName: "signup-form",
      formAction: new URL("/register", document.baseURI).href,
      method: "POST",
      fieldCount: 5,
      ariaLabel: undefined,
    });
  });

  it("reads the owning form's id and name for input changes when controls shadow them", () => {
    document.body.innerHTML = `<form id="search" name="search-form"><input name="id"><input name="name"><input name="q"></form>`;
    const form = document.querySelector("form")!;
    shadowWithControls(form);

    form.querySelector<HTMLInputElement>('input[name="q"]')!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(tracker.trackInputChange).toHaveBeenCalledWith(
      expect.objectContaining({ inputName: "q", formId: "search", formName: "search-form" })
    );
  });
});
