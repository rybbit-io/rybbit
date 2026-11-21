import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskSteps, taskStepStatus } from "./task-steps";

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, unknown>) =>
    message.replace(/\{(\w+)(?:, \w+)?\}/g, (_, key: string) => String(values?.[key] ?? "")),
}));

const steps = [
  { id: "a", label: "Install" },
  { id: "b", label: "Receive", meta: "from Germany" },
  { id: "c", label: "Fill in" },
];

const liveRegions = (container: HTMLElement) => container.querySelectorAll('[role="status"], [aria-live]');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("taskStepStatus", () => {
  it("marks earlier steps done, the current one active or failed, and later ones pending", () => {
    expect([0, 1, 2].map(i => taskStepStatus(i, 1, false, 3))).toEqual(["done", "active", "pending"]);
    expect([0, 1, 2].map(i => taskStepStatus(i, 1, true, 3))).toEqual(["done", "error", "pending"]);
    expect([0, 1, 2].map(i => taskStepStatus(i, 3, false, 3))).toEqual(["done", "done", "done"]);
  });
});

describe("TaskSteps", () => {
  it("exposes each step's status to assistive tech and marks the current step", () => {
    render(<TaskSteps steps={steps} current={1} label="Setup" />);

    const items = screen.getAllByRole("listitem");
    expect(screen.getByRole("list", { name: "Setup" })).toBeTruthy();
    expect(items[0].textContent).toBe("Done: Install");
    expect(items[1].textContent).toMatch(/^In progress: Receive/);
    expect(items[2].textContent).toBe("Not started: Fill in");
    expect(items[1].getAttribute("aria-current")).toBe("step");
  });

  it("keeps a step's detail hidden until the step is done", () => {
    const { rerender } = render(<TaskSteps steps={steps} current={1} />);
    expect(screen.getByText("from Germany").getAttribute("aria-hidden")).toBe("true");

    rerender(<TaskSteps steps={steps} current={2} />);
    expect(screen.getByText("from Germany").getAttribute("aria-hidden")).toBe("false");
  });

  it("holds the spinner still under reduced motion", () => {
    const { container } = render(<TaskSteps steps={steps} current={1} />);

    const spinner = container.querySelector("li[aria-current] svg")!;
    expect(spinner.getAttribute("class")).toContain("motion-safe:animate-spin");
  });

  it("announces progress after it settles, through a single live region", () => {
    const { container, rerender } = render(<TaskSteps steps={steps} current={1} />);
    expect(liveRegions(container)).toHaveLength(1);

    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("status").textContent).toBe("Receive, step 2 of 3");

    rerender(<TaskSteps steps={steps} current={3} />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("status").textContent).toBe("All 3 steps complete");
    expect(liveRegions(container)).toHaveLength(1);
  });

  it("announces a failure", () => {
    render(<TaskSteps steps={steps} current={2} failed />);

    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("status").textContent).toBe("Failed at Fill in");
    expect(screen.getAllByRole("listitem")[2].textContent).toBe("Failed: Fill in");
  });

  it("stays silent when the caller owns the announcement", () => {
    const { container } = render(<TaskSteps steps={steps} current={3} announce={false} />);

    act(() => vi.advanceTimersByTime(500));
    expect(liveRegions(container)).toHaveLength(0);
  });
});
