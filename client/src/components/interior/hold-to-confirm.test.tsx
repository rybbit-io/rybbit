import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { HoldToConfirm, useHoldToConfirm, type UseHoldToConfirmOptions } from "./hold-to-confirm";

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, unknown>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key])) : message,
}));

const DURATION = 1000;
// Fake rAF fires every 16 ms, and the clock's first frame only starts it, so a hold lands within
// a couple of frames of its duration. Assertions allow that much slack.
const FRAME = 16;

const onConfirm = vi.fn();
const onAbort = vi.fn();

let hold: ReturnType<typeof useHoldToConfirm>;

function Harness(options: Partial<UseHoldToConfirmOptions>) {
  hold = useHoldToConfirm({ onConfirm, onAbort, duration: DURATION, ...options });
  return (
    <button type="button" data-phase={hold.phase} {...hold.bind}>
      Hold
    </button>
  );
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function press(button: HTMLElement, point = { clientX: 20, clientY: 20 }) {
  fireEvent.pointerDown(button, { pointerId: 1, pointerType: "mouse", button: 0, ...point });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useHoldToConfirm", () => {
  it("fills linearly with held time and confirms once the duration is reached", () => {
    render(<Harness />);
    const button = screen.getByRole("button");

    press(button);
    expect(hold.phase).toBe("holding");

    advance(250 + FRAME);
    expect(hold.progress.get()).toBeCloseTo(0.25, 1);
    advance(250);
    expect(hold.progress.get()).toBeCloseTo(0.5, 1);
    advance(DURATION / 2 - 3 * FRAME);
    expect(hold.phase).toBe("holding");
    expect(onConfirm).not.toHaveBeenCalled();

    advance(4 * FRAME);
    expect(hold.phase).toBe("committed");
    expect(hold.progress.get()).toBe(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Letting go after the commit changes nothing.
    fireEvent.pointerUp(button, { pointerId: 1 });
    advance(DURATION);
    expect(hold.phase).toBe("committed");
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onAbort).not.toHaveBeenCalled();
  });

  it("drains 2.5x faster after an early release and never confirms", () => {
    render(<Harness />);
    const button = screen.getByRole("button");

    press(button);
    advance(800 + FRAME);
    fireEvent.pointerUp(button, { pointerId: 1 });
    expect(hold.phase).toBe("releasing");
    expect(onAbort).toHaveBeenCalledTimes(1);

    // 160 ms of draining removes 400 ms of held time.
    advance(160);
    expect(hold.progress.get()).toBeCloseTo(0.4, 1);

    advance(200);
    expect(hold.phase).toBe("idle");
    expect(hold.progress.get()).toBe(0);
    advance(DURATION * 2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("resumes from the current fill when pressed again mid-drain", () => {
    render(<Harness />);
    const button = screen.getByRole("button");

    press(button);
    advance(800 + FRAME);
    fireEvent.pointerUp(button, { pointerId: 1 });
    advance(160); // ~400 ms of held time left

    press(button);
    expect(hold.phase).toBe("holding");
    const resumedAt = hold.progress.get();
    expect(resumedAt).toBeGreaterThan(0.3);

    // A fresh hold would need the whole duration; this one only needs the remainder.
    advance((1 - resumedAt) * DURATION - 3 * FRAME);
    expect(hold.phase).toBe("holding");
    advance(4 * FRAME);
    expect(hold.phase).toBe("committed");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("holds with Space or Enter, ignoring key repeat", () => {
    render(<Harness />);
    const button = screen.getByRole("button");

    fireEvent.keyDown(button, { key: "Enter" });
    expect(hold.phase).toBe("holding");
    advance(300);
    fireEvent.keyUp(button, { key: "Enter" });
    expect(hold.phase).toBe("releasing");

    // Auto-repeat from a key that is still down must not restart the hold.
    fireEvent.keyDown(button, { key: "Enter", repeat: true });
    expect(hold.phase).toBe("releasing");
    advance(DURATION);
    expect(hold.phase).toBe("idle");

    fireEvent.keyDown(button, { key: " " });
    expect(hold.phase).toBe("holding");
    advance(DURATION + 2 * FRAME);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("swallows the confirming keys so they never click", () => {
    render(<Harness />);
    const button = screen.getByRole("button");

    expect(fireEvent.keyDown(button, { key: "Enter" })).toBe(false);
    expect(fireEvent.keyDown(button, { key: " ", repeat: true })).toBe(false);
    expect(fireEvent.keyDown(button, { key: "a" })).toBe(true);
  });

  it("cancels at once on Escape, wherever focus is", () => {
    render(<Harness />);
    press(screen.getByRole("button"));
    advance(600);

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(hold.phase).toBe("idle");
    expect(hold.progress.get()).toBe(0);
    advance(DURATION * 2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("lets go when the window loses focus, the tab is hidden or the button blurs", () => {
    render(<Harness />);
    const button = screen.getByRole("button");

    press(button);
    advance(300);
    fireEvent.blur(window);
    expect(hold.phase).toBe("releasing");
    advance(DURATION);

    press(button);
    advance(300);
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    try {
      fireEvent(document, new Event("visibilitychange"));
    } finally {
      delete (document as { hidden?: boolean }).hidden;
    }
    expect(hold.phase).toBe("releasing");
    advance(DURATION);

    press(button);
    advance(300);
    fireEvent.blur(button);
    expect(hold.phase).toBe("releasing");
    advance(DURATION);

    expect(hold.phase).toBe("idle");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("lets go when the pointer wanders more than 10 px", () => {
    render(<Harness />);
    const button = screen.getByRole("button");

    press(button, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 16, clientY: 16 }); // ~8.5 px
    expect(hold.phase).toBe("holding");

    fireEvent.pointerMove(button, { pointerId: 1, clientX: 21, clientY: 10 }); // 11 px
    expect(hold.phase).toBe("releasing");
  });

  it("ignores secondary mouse buttons", () => {
    render(<Harness />);
    fireEvent.pointerDown(screen.getByRole("button"), { pointerId: 1, pointerType: "mouse", button: 2 });
    expect(hold.phase).toBe("idle");
  });

  it("does nothing while disabled, and drops a hold that becomes disabled", () => {
    const { rerender } = render(<Harness disabled />);
    const button = screen.getByRole("button");

    press(button);
    fireEvent.keyDown(button, { key: "Enter" });
    advance(DURATION * 2);
    expect(hold.phase).toBe("idle");

    rerender(<Harness />);
    press(button);
    advance(600);
    expect(hold.phase).toBe("holding");

    rerender(<Harness disabled />);
    expect(hold.phase).toBe("idle");
    expect(hold.progress.get()).toBe(0);
    advance(DURATION * 2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("stops its clock on unmount", () => {
    const { unmount } = render(<Harness />);
    press(screen.getByRole("button"));
    advance(600);

    unmount();
    advance(DURATION * 2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("HoldToConfirm", () => {
  function renderButton(props: { pending?: boolean; disabled?: boolean } = {}) {
    return render(
      <HoldToConfirm onConfirm={onConfirm} pendingLabel="Deleting..." duration={DURATION} {...props}>
        Hold to delete site
      </HoldToConfirm>
    );
  }

  it("swaps to the pending label sequentially on commit, never showing both labels at once", async () => {
    // Real time: framer drives the label opacity from its own frame loop.
    vi.useRealTimers();
    const { container } = render(
      <HoldToConfirm onConfirm={onConfirm} pendingLabel="Deleting..." duration={40}>
        Hold to delete site
      </HoldToConfirm>
    );
    const button = screen.getByRole("button", { name: "Hold to delete site" });
    // One pair per layer: the resting faces and the inverted faces inside the fill.
    const labels = Array.from(container.querySelectorAll<HTMLElement>('[data-face="label"]'));
    const pendings = Array.from(container.querySelectorAll<HTMLElement>('[data-face="pending"]'));
    expect(labels).toHaveLength(2);
    expect(pendings).toHaveLength(2);
    const opacity = (face: HTMLElement) => Number(face.style.opacity || "1");

    fireEvent.keyDown(button, { key: "Enter" });
    await waitFor(() => expect(button.getAttribute("data-phase")).toBe("committed"));

    let sawOutgoingFading = false;
    for (let elapsed = 0; elapsed < 600; elapsed += 8) {
      labels.forEach((label, layer) => {
        const out = opacity(label);
        const incoming = opacity(pendings[layer]);
        if (out > 0 && out < 1) sawOutgoingFading = true;
        expect(Math.min(out, incoming), `both labels visible at ${elapsed} ms`).toBeLessThan(0.02);
      });
      await new Promise(resolve => setTimeout(resolve, 8));
    }

    expect(sawOutgoingFading).toBe(true);
    for (const layer of [0, 1]) {
      expect(opacity(labels[layer])).toBe(0);
      expect(opacity(pendings[layer])).toBe(1);
    }
  });

  it("is named by its visible label and described by the hold hint", () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Hold to delete site" });

    const hint = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toBe("Press and hold to confirm. Releasing early cancels.");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-disabled")).toBeNull();
  });

  it("announces the pending label on commit and stays inert while pending", () => {
    const { rerender } = renderButton();
    const button = screen.getByRole("button", { name: "Hold to delete site" });
    expect(screen.getByRole("status").textContent).toBe("");

    fireEvent.keyDown(button, { key: "Enter" });
    advance(DURATION + 2 * FRAME);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <HoldToConfirm onConfirm={onConfirm} pendingLabel="Deleting..." duration={DURATION} pending>
        Hold to delete site
      </HoldToConfirm>
    );
    expect(screen.getByRole("status").textContent).toBe("Deleting...");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: "Deleting..." })).toBe(button);

    fireEvent.keyUp(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: "Enter" });
    advance(DURATION * 2);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("data-phase")).toBe("committed");
  });

  it("re-arms when the pending action ends without unmounting it (it failed)", () => {
    const { rerender } = renderButton();
    const button = screen.getByRole("button");

    fireEvent.keyDown(button, { key: "Enter" });
    advance(DURATION + 2 * FRAME);
    rerender(
      <HoldToConfirm onConfirm={onConfirm} pendingLabel="Deleting..." duration={DURATION} pending>
        Hold to delete site
      </HoldToConfirm>
    );
    rerender(
      <HoldToConfirm onConfirm={onConfirm} pendingLabel="Deleting..." duration={DURATION} pending={false}>
        Hold to delete site
      </HoldToConfirm>
    );

    expect(button.getAttribute("data-phase")).toBe("idle");
    expect(button.getAttribute("aria-disabled")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("re-arms after a beat when the caller never goes pending", () => {
    renderButton();
    const button = screen.getByRole("button");

    fireEvent.keyDown(button, { key: " " });
    advance(DURATION + 2 * FRAME);
    expect(button.getAttribute("data-phase")).toBe("committed");

    advance(1500);
    expect(button.getAttribute("data-phase")).toBe("idle");
  });

  it("stays inert while disabled", () => {
    renderButton({ disabled: true });
    const button = screen.getByRole("button", { name: "Hold to delete site" });
    expect(button.getAttribute("aria-disabled")).toBe("true");

    press(button);
    fireEvent.keyDown(button, { key: "Enter" });
    advance(DURATION * 2);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button.getAttribute("data-phase")).toBe("idle");
  });
});

describe("HoldToConfirm inside an AlertDialog", () => {
  const onOpenChange = vi.fn();

  function renderDialog() {
    return render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this site?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <HoldToConfirm onConfirm={onConfirm} pendingLabel="Deleting..." duration={DURATION}>
              Hold to delete site
            </HoldToConfirm>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  it("neither closes nor confirms on a click or an early release", () => {
    renderDialog();
    const button = screen.getByRole("button", { name: "Hold to delete site" });

    press(button);
    fireEvent.pointerUp(button, { pointerId: 1 });
    fireEvent.click(button);
    press(button);
    advance(DURATION / 2);
    fireEvent.pointerUp(button, { pointerId: 1 });
    advance(DURATION * 2);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("confirms after a full hold and leaves closing to the caller", () => {
    renderDialog();
    const button = screen.getByRole("button", { name: "Hold to delete site" });

    press(button);
    advance(DURATION + 2 * FRAME);
    fireEvent.pointerUp(button, { pointerId: 1 });
    fireEvent.click(button);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("cancels the hold when Escape dismisses the dialog", () => {
    renderDialog();
    const button = screen.getByRole("button", { name: "Hold to delete site" });

    button.focus();
    fireEvent.keyDown(button, { key: " " });
    advance(DURATION * 0.9);
    fireEvent.keyDown(button, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(button.getAttribute("data-phase")).toBe("idle");
    advance(DURATION * 2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
