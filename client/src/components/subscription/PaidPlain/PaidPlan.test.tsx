import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The billing page of a paid plan, in the two states that differ: an ordinary active plan, and
 * one kept on while Stripe retries a failed renewal. The sections it only composes are stubbed.
 */
const state = vi.hoisted(() => ({
  subscription: {} as Record<string, unknown>,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useExtracted: () => (message: string, values?: Record<string, unknown>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? "")),
}));
vi.mock("@/lib/auth", () => ({
  authClient: { useActiveOrganization: () => ({ data: { id: "org_1" } }) },
}));
vi.mock("@/components/ui/sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: () => ({ data: state.subscription }),
}));
vi.mock("../PaymentFailedNotice", () => ({
  PaymentFailedNotice: () => (state.subscription.pastDue ? <div role="alert">card failed</div> : null),
  cardUpdatedReturnUrl: (organizationId: string) => `https://app.test/settings/billing?card_updated=${organizationId}`,
}));
vi.mock("../components/InvoicesSection", () => ({ InvoicesSection: () => null }));
vi.mock("../components/UsageHistorySection", () => ({ UsageHistorySection: () => null }));
vi.mock("../components/PlanDialog", () => ({
  PlanDialog: ({ open }: { open: boolean }) => (open ? <div>plan dialog</div> : null),
}));
vi.mock("../components/PlanSection", () => ({
  PlanAllowances: () => null,
  PlanSection: ({ status, action }: { status: React.ReactNode; action: React.ReactNode }) => (
    <div>
      <p data-testid="status">{status}</p>
      {action}
    </div>
  ),
}));
vi.mock("../components/UsageSection", () => ({
  UsageSection: ({ overLimitAction }: { overLimitAction: React.ReactNode }) => <div>{overLimitAction}</div>,
}));
vi.mock("./CancellationDialog", () => ({
  CancellationDialog: ({ open }: { open: boolean }) => (open ? <div>cancellation dialog</div> : null),
}));

import { PaidPlan } from "./PaidPlan";

const fetchMock = vi.fn();

const portalRequest = () => JSON.parse(fetchMock.mock.calls[0][1].body);

beforeEach(() => {
  state.subscription = {
    id: "sub_1",
    planName: "standard100k",
    status: "active",
    interval: "month",
    currentPeriodEnd: "2026-12-18T00:00:00Z",
    cancelAtPeriodEnd: false,
  };
  // Never resolves, so nothing navigates away.
  fetchMock.mockReset();
  fetchMock.mockReturnValue(new Promise(() => {}));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PaidPlan", () => {
  it("offers a plan change and the cancellation dialog on an active plan", () => {
    render(<PaidPlan />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("status").textContent).toContain("Renews monthly on");
    expect(screen.getByRole("button", { name: "Change plan" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));
    expect(screen.getByText("cancellation dialog")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("while Stripe retries a failed renewal", () => {
    beforeEach(() => {
      state.subscription.pastDue = { subscriptionId: "sub_1", planName: "standard100k" };
    });

    it("asks for a new card and stops promising a renewal or a plan change", () => {
      render(<PaidPlan />);

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByTestId("status").textContent).toBe("");
      expect(screen.queryByRole("button", { name: "Change plan" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Upgrade plan" })).toBeNull();
    });

    it("cancels through the plain portal, skipping the dialog's plan-change offers", async () => {
      render(<PaidPlan />);

      fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(screen.queryByText("cancellation dialog")).toBeNull();
      expect(portalRequest()).toMatchObject({ organizationId: "org_1" });
      expect(portalRequest().flowType).toBeUndefined();
    });

    it("comes back from the card form to charge the new card", async () => {
      render(<PaidPlan />);

      fireEvent.click(screen.getByRole("button", { name: /Manage in Stripe/ }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(portalRequest()).toMatchObject({
        flowType: "payment_method_update",
        returnUrl: "https://app.test/settings/billing?card_updated=org_1",
      });
    });
  });
});
