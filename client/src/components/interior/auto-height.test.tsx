import { act, cleanup, render, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoHeight } from "./auto-height";

const mocks = vi.hoisted(() => ({ reduced: false }));
vi.mock("framer-motion", async importOriginal => ({
  ...(await importOriginal<typeof import("framer-motion")>()),
  useReducedMotion: () => mocks.reduced,
}));

// jsdom has no layout, so the content's height and the ResizeObserver deliveries are driven by hand.
let contentHeight = 0;
let deliver: () => void = () => {};

beforeEach(() => {
  mocks.reduced = false;
  contentHeight = 100;
  MotionGlobalConfig.skipAnimations = true;
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => contentHeight });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        deliver = () => callback([], this as unknown as ResizeObserver);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  cleanup();
  MotionGlobalConfig.skipAnimations = false;
  delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
  vi.unstubAllGlobals();
});

function mountBox() {
  const { container } = render(
    <AutoHeight contentClassName="p-4">
      <p>content</p>
    </AutoHeight>
  );
  return container.firstElementChild as HTMLElement;
}

describe("AutoHeight", () => {
  it("rests at auto height and clips only while a change animates", () => {
    const box = mountBox();

    act(() => deliver());

    expect(box.style.height).toBe("");
    expect(box.className).toContain("overflow-hidden");
  });

  it("pins the old height before the change paints, springs, then returns to auto", async () => {
    const box = mountBox();

    contentHeight = 240;
    act(() => deliver());
    expect(box.style.height).toBe("100px");

    await waitFor(() => expect(box.style.height).toBe(""));
  });

  it("pins the old height in the microtask after React commits a swap, before any resize observation", async () => {
    const Swap = ({ swapped }: { swapped: boolean }) => (
      <AutoHeight>{swapped ? <p key="after">after</p> : <p key="before">before</p>}</AutoHeight>
    );
    const { container, rerender } = render(<Swap swapped={false} />);
    const box = container.firstElementChild as HTMLElement;

    contentHeight = 40;
    rerender(<Swap swapped />);
    await Promise.resolve();

    expect(box.style.height).toBe("100px");
  });

  it("follows the content without animating under reduced motion", () => {
    mocks.reduced = true;
    const box = mountBox();

    contentHeight = 240;
    act(() => deliver());

    expect(box.style.height).toBe("");
  });
});
