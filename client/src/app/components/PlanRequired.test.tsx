import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlanRequiredNotice, useCheckoutReturn } from "./PlanRequired";

const mocks = vi.hoisted(() => ({
  useStripeSubscription: vi.fn(),
  organizations: { data: [{ id: "org_b", role: "owner" }], isLoading: false } as {
    data: { id: string; role: string }[] | undefined;
    isLoading: boolean;
  },
  search: "",
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? ""),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mocks.search) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/api/admin/hooks/useOrganizations", () => ({ useUserOrganizations: () => mocks.organizations }));
vi.mock("@/api/admin/hooks/useOrganizationMembers", () => ({ useOrganizationMembers: () => ({ data: undefined }) }));
vi.mock("@/lib/subscription/useStripeSubscription", () => ({ useStripeSubscription: mocks.useStripeSubscription }));

beforeEach(() => {
  mocks.organizations = { data: [{ id: "org_b", role: "owner" }], isLoading: false };
  mocks.useStripeSubscription.mockReturnValue({ data: { trialEligible: true }, isLoading: false });
  mocks.search = "";
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("PlanRequiredNotice", () => {
  it("reads trial eligibility from the site's organization, not the active one", () => {
    mocks.useStripeSubscription.mockReturnValue({ data: { trialEligible: false }, isLoading: false });

    render(<PlanRequiredNotice organizationId="org_b" siteName="example.com" returnPath="/42" />);

    expect(mocks.useStripeSubscription).toHaveBeenCalledWith("org_b");
    screen.getByRole("button", { name: "Choose a plan" });
    expect(screen.queryByText(/trial/i)).toBeNull();
  });

  it("promises nothing until the organization's history has loaded", () => {
    mocks.useStripeSubscription.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(<PlanRequiredNotice organizationId="org_b" returnPath="/" />);

    expect(container.textContent).toBe("");
  });
});

describe("useCheckoutReturn", () => {
  it("holds back the notice for two minutes after checkout and drops session_id from the URL", () => {
    vi.useFakeTimers();
    mocks.search = "session_id=cs_123";
    window.history.replaceState(null, "", "/42/main?session_id=cs_123&timeMode=day");

    const { result } = renderHook(() => useCheckoutReturn());

    expect(result.current).toBe(true);
    expect(window.location.search).toBe("?timeMode=day");

    act(() => {
      vi.advanceTimersByTime(119_000);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(false);
  });

  it("is false on an ordinary visit", () => {
    const { result } = renderHook(() => useCheckoutReturn());

    expect(result.current).toBe(false);
  });
});
