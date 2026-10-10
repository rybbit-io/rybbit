import { cleanup, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Goal, SavedFunnel } from "@/api/analytics/endpoints";
import { useStore } from "@/lib/store";
import { UsedIn } from "./UsedIn";

const mocks = vi.hoisted(() => ({ search: "" }));

vi.mock("next-intl", () => ({
  // Enough ICU for the strings under test: {count} and "{count, plural, one {# x} other {# xs}}".
  useExtracted: () => (message: string, values?: Record<string, string | number>) =>
    message
      .replace(/\{(\w+), plural, one \{([^}]*)\} other \{([^}]*)\}\}/g, (_match, key, one, other) =>
        (Number(values?.[key]) === 1 ? one : other).replace("#", String(values?.[key]))
      )
      .replace(/\{(\w+)\}/g, (_match, key) => String(values?.[key])),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, prefetch, ...props }: { href: string; children: ReactNode; prefetch?: boolean }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("./CreateGoalPopover", () => ({
  CreateGoalPopover: ({ eventName }: { eventName: string }) => (
    <button type="button">Create goal for {eventName}</button>
  ),
}));

const goal = (goalId: number, name: string | null): Goal => ({
  goalId,
  name,
  goalType: "event",
  config: { eventName: "signup" },
  createdAt: "2026-01-01",
  total_conversions: 0,
  total_sessions: 0,
  conversion_rate: 0,
});

const funnel = (id: number, name: string): SavedFunnel => ({
  id,
  name,
  steps: [{ type: "event", value: "signup" }],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
});

const renderUsedIn = (props: Partial<Parameters<typeof UsedIn>[0]> = {}) =>
  render(<UsedIn eventName="signup" goals={[]} funnels={[]} isLoading={false} canCreateGoal={true} {...props} />);

describe("UsedIn", () => {
  beforeEach(() => {
    mocks.search = "";
    useStore.setState({ site: "81", privateKey: null });
  });
  afterEach(cleanup);

  it("offers to create a goal for an event nothing measures", () => {
    renderUsedIn();

    expect(screen.getByRole("button", { name: "Create goal for signup" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("offers nothing to a viewer who cannot create goals", () => {
    renderUsedIn({ canCreateGoal: false });

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("shows neither chips nor the offer while goals and funnels load", () => {
    renderUsedIn({ isLoading: true });

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("names a single goal and links it to the Goals page", () => {
    renderUsedIn({ goals: [goal(1, "Signup")] });

    const link = screen.getByRole("link", { name: "Signup" });
    expect(link.getAttribute("href")).toBe("/81/goals");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("falls back to the event name for a goal without one", () => {
    renderUsedIn({ goals: [goal(1, null)] });

    expect(screen.getByRole("link", { name: "signup" })).toBeTruthy();
  });

  it("counts several goals and lists them in the hover text", () => {
    renderUsedIn({ goals: [goal(1, "Signup"), goal(2, "Signup with Google")] });

    const link = screen.getByRole("link", { name: "2 goals" });
    expect(link.getAttribute("title")).toBe("Signup, Signup with Google");
  });

  it("names a lone funnel when there is no goal beside it", () => {
    renderUsedIn({ funnels: [funnel(1, "Visit to paid")] });

    expect(screen.getByRole("link", { name: "Visit to paid" }).getAttribute("href")).toBe("/81/funnels");
  });

  it("counts funnels beside a goal, and when there are several", () => {
    renderUsedIn({ goals: [goal(1, "Signup")], funnels: [funnel(1, "Visit to paid")] });
    expect(screen.getByRole("link", { name: "1 funnel" })).toBeTruthy();
    cleanup();

    renderUsedIn({ funnels: [funnel(1, "Visit to paid"), funnel(2, "Demo to signup")] });
    expect(screen.getByRole("link", { name: "2 funnels" }).getAttribute("title")).toBe("Visit to paid, Demo to signup");
  });

  it("keeps the period, the filters and a private link's key on the way out", () => {
    mocks.search = "timeMode=range&startDate=2026-09-01&endDate=2026-09-30";
    useStore.setState({ site: "81", privateKey: "a1b2c3d4e5f6" });
    renderUsedIn({ goals: [goal(1, "Signup")], funnels: [funnel(1, "Visit to paid")] });

    expect(screen.getByRole("link", { name: "Signup" }).getAttribute("href")).toBe(
      "/81/a1b2c3d4e5f6/goals?timeMode=range&startDate=2026-09-01&endDate=2026-09-30"
    );
    expect(screen.getByRole("link", { name: "1 funnel" }).getAttribute("href")).toBe(
      "/81/a1b2c3d4e5f6/funnels?timeMode=range&startDate=2026-09-01&endDate=2026-09-30"
    );
  });

  it("does not prefetch a link per row", () => {
    renderUsedIn({ goals: [goal(1, "Signup")] });

    expect(screen.getByRole("link", { name: "Signup" }).getAttribute("data-prefetch")).toBe("false");
  });
});
