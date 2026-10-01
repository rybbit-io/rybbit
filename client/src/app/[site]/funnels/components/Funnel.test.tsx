import React, { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FunnelStep } from "@/api/analytics/endpoints";
import { useStore } from "@/lib/store";
import { computeFunnelMetrics } from "./funnelMetrics";

const mocks = vi.hoisted(() => ({
  replayAvailable: true,
  stepSessions: vi.fn(),
}));

vi.mock("next-intl", () => {
  const format = (message: string, values: Record<string, unknown> = {}) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? key));
  const t = Object.assign(format, {
    rich: (message: string, values?: Record<string, unknown>) => format(message.replace(/<\/?\w+>/g, ""), values),
  });
  return { useExtracted: () => t };
});
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("next/link", () => ({
  default: ({ href, children, prefetch, ...props }: { href: string; children: ReactNode; prefetch?: boolean }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/hooks/useReplayAvailable", () => ({ useReplayAvailable: () => mocks.replayAvailable }));
vi.mock("@/hooks/usePermissions", () => ({ useCanOnSite: () => true }));
vi.mock("@/app/[site]/components/SubHeader/Filters/SegmentDialog", () => ({ SegmentDialog: () => null }));
vi.mock("@/api/analytics/hooks/funnels/useGetFunnelStepSessions", () => ({
  useGetFunnelStepSessions: (options: unknown) => {
    mocks.stepSessions(options);
    return { data: [], isLoading: false };
  },
}));
vi.mock("@/components/Sessions/SessionsList", () => ({
  SessionsList: ({ headerElement, emptyMessage }: { headerElement: ReactNode; emptyMessage: string }) => (
    <div data-testid="sessions-list">
      {headerElement}
      <p>{emptyMessage}</p>
    </div>
  ),
}));

import { Funnel } from "./Funnel";

const steps: FunnelStep[] = [
  { type: "page", value: "/**", name: "Any page" },
  { type: "page", value: "/pricing", name: "Pricing" },
  { type: "event", value: "signup", name: "Signed up", propertyFilters: [{ key: "plan", value: "pro" }] },
];

// 84,210 enter, 17,920 see pricing, 3,984 sign up.
const metrics = computeFunnelMetrics(
  [{ sessions: 84210, medianSecondsToNext: 58 }, { sessions: 17920, medianSecondsToNext: 81 }, { sessions: 3984 }],
  708
);
const previous = computeFunnelMetrics([{ sessions: 74930 }, { sessions: 15692 }, { sessions: 3388 }]);

const lastRequest = () => mocks.stepSessions.mock.calls.at(-1)?.[0];

beforeEach(() => {
  mocks.replayAvailable = true;
  useStore.setState({ site: "42", timezone: "UTC" });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Funnel", () => {
  it("states each step's sessions and share of the first step", () => {
    const { container } = render(<Funnel steps={steps} metrics={metrics} />);

    expect(container.textContent).toContain("84,210");
    expect(container.textContent).toContain("17,920");
    expect(container.textContent).toContain("21.3%");
    expect(container.textContent).toContain("3,984");
    expect(container.textContent).toContain("4.7%");
    // What a step matches, under its name.
    expect(screen.getByText("Page · /pricing")).toBeTruthy();
    expect(screen.getByText("Event · signup · plan = pro")).toBeTruthy();
  });

  it("puts the drop-off on the step people left", () => {
    render(<Funnel steps={steps} metrics={metrics} />);

    // 84,210 - 17,920 left after the first step; 17,920 - 3,984 after pricing.
    const firstStep = screen.getByRole("button", { name: /Any page/ });
    const afterFirst = firstStep.nextElementSibling as HTMLElement;
    expect(afterFirst.textContent).toContain("21.3%continue");
    expect(afterFirst.textContent).toContain("66,290 dropped here · 78.7%");
    expect(afterFirst.textContent).toContain("58s median to next step");

    const afterPricing = screen.getByRole("button", { name: /Pricing/ }).nextElementSibling as HTMLElement;
    expect(afterPricing.textContent).toContain("13,936 dropped here · 77.8%");
    expect(afterPricing.textContent).toContain("1m 21s median to next step");
  });

  it("closes with the overall conversion and the time from the first step", () => {
    const { container } = render(<Funnel steps={steps} metrics={metrics} />);

    expect(container.textContent).toContain("4.7%overall");
    expect(container.textContent).toContain("3,984 converted");
    expect(container.textContent).toContain("11m 48s median from first step");
  });

  it("draws step and overall changes only against a comparison period", () => {
    const alone = render(<Funnel steps={steps} metrics={metrics} />);
    expect(alone.container.textContent).not.toContain(" pp");
    expect(alone.container.textContent).not.toContain("Compared with");
    cleanup();

    const compared = render(
      <Funnel steps={steps} metrics={metrics} previous={previous} comparisonLabel="Aug 2 – Aug 31" />
    );
    // 21.3% continue against 20.9%; 4.73% overall against 4.52%.
    expect(compared.container.textContent).toContain("0.3 pp");
    expect(compared.container.textContent).toContain("0.2 pp");
    expect(compared.container.textContent).toContain("Compared with Aug 2 – Aug 31");
  });

  it("opens the sessions that left at a step from that step's drop-off", () => {
    render(<Funnel steps={steps} metrics={metrics} />);
    const afterPricing = screen.getByRole("button", { name: /Pricing/ }).nextElementSibling as HTMLElement;

    fireEvent.click(within(afterPricing).getByRole("button", { name: "Sessions" }));

    // Reached step 2 and not step 3.
    expect(lastRequest()).toMatchObject({ steps, stepNumber: 2, mode: "dropped", replaysOnly: false, enabled: true });
    expect(screen.getByText("Sessions that dropped off after Pricing")).toBeTruthy();

    fireEvent.click(within(afterPricing).getByRole("button", { name: "Replays" }));
    expect(lastRequest()).toMatchObject({ stepNumber: 2, mode: "dropped", replaysOnly: true });
    expect(screen.getByText("Replays of sessions that dropped off after Pricing")).toBeTruthy();
    expect(screen.getAllByTestId("sessions-list").length).toBe(1);
  });

  it("closes the list when its pivot is clicked again or it is dismissed", () => {
    render(<Funnel steps={steps} metrics={metrics} />);
    const afterFirst = screen.getByRole("button", { name: /Any page/ }).nextElementSibling as HTMLElement;
    const sessions = within(afterFirst).getByRole("button", { name: "Sessions" });

    fireEvent.click(sessions);
    expect(screen.getByTestId("sessions-list")).toBeTruthy();
    fireEvent.click(sessions);
    expect(screen.queryByTestId("sessions-list")).toBeNull();

    fireEvent.click(sessions);
    fireEvent.click(screen.getByRole("button", { name: "Close sessions" }));
    expect(screen.queryByTestId("sessions-list")).toBeNull();
  });

  it("opens the sessions that reached a step from the step itself", () => {
    render(<Funnel steps={steps} metrics={metrics} />);

    fireEvent.click(screen.getByRole("button", { name: /Pricing/ }));

    expect(lastRequest()).toMatchObject({ stepNumber: 2, mode: "reached", replaysOnly: false });
    expect(screen.getByText("Sessions that reached Pricing")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pricing/ }).getAttribute("aria-expanded")).toBe("true");
  });

  it("opens the converted sessions from the outcome line", () => {
    render(<Funnel steps={steps} metrics={metrics} />);
    const outcome = screen.getByText("overall").closest("div")!.parentElement as HTMLElement;

    fireEvent.click(within(outcome).getByRole("button", { name: "Sessions" }));

    expect(lastRequest()).toMatchObject({ stepNumber: 3, mode: "reached", replaysOnly: false });
    expect(screen.getByText("Sessions that converted")).toBeTruthy();
  });

  it("offers no replays on a site without replay", () => {
    mocks.replayAvailable = false;
    render(<Funnel steps={steps} metrics={metrics} />);

    expect(screen.queryByRole("button", { name: "Replays" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Sessions" }).length).toBe(3);
  });

  it("offers no sessions where nobody dropped or converted", () => {
    const allTheWay = computeFunnelMetrics([{ sessions: 10 }, { sessions: 10 }, { sessions: 0 }]);
    render(<Funnel steps={steps} metrics={allTheWay} />);

    // Nobody left after step 1; all 10 left after step 2; nobody converted.
    expect(screen.getAllByRole("button", { name: "Sessions" }).length).toBe(1);
  });

  it("links the last step to its goal", () => {
    render(<Funnel steps={steps} metrics={metrics} goal={{ name: "Signup", href: "/42/goals" }} />);

    expect(screen.getByRole("link", { name: /Goal: Signup/ }).getAttribute("href")).toBe("/42/goals");
  });

  it("survives a preview whose steps are ahead of its figures", () => {
    // The builder removed a step; the last analysis still has three.
    const { container } = render(<Funnel steps={steps.slice(0, 2)} metrics={metrics} />);

    expect(container.textContent).toContain("Step 3");
  });
});
