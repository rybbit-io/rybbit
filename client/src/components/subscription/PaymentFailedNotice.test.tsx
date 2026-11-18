import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  subscription: undefined as { pastDue?: { subscriptionId: string; planName: string | null } } | undefined,
  canManageBilling: true,
  authedFetch: vi.fn(),
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/api/utils", () => ({ authedFetch: state.authedFetch }));
vi.mock("@/components/ui/sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/hooks/usePermissions", () => ({ useCanInOrg: () => state.canManageBilling }));
vi.mock("@/lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: () => ({ data: state.subscription }),
}));

import { PaymentFailedNotice } from "./PaymentFailedNotice";

beforeEach(() => {
  state.subscription = { pastDue: { subscriptionId: "sub_1", planName: "standard100k" } };
  state.canManageBilling = true;
  state.authedFetch.mockReset();
  // Never resolves, so the test doesn't navigate away.
  state.authedFetch.mockReturnValue(new Promise(() => {}));
});

afterEach(cleanup);

describe("PaymentFailedNotice", () => {
  it("renders nothing unless a charge is being retried", () => {
    state.subscription = {};
    const { container } = render(<PaymentFailedNotice organizationId="org_1" />);

    expect(container.firstChild).toBeNull();
  });

  it("sends an owner to the portal's card form and back to billing for that organization", async () => {
    render(<PaymentFailedNotice organizationId="org_1" />);

    fireEvent.click(screen.getByRole("button", { name: "Update card" }));

    await waitFor(() => expect(state.authedFetch).toHaveBeenCalled());
    const [path, , config] = state.authedFetch.mock.calls[0];
    expect(path).toBe("/stripe/create-portal-session");
    expect(config.data).toMatchObject({ organizationId: "org_1", flowType: "payment_method_update" });
    expect(new URL(config.data.returnUrl).pathname).toBe("/settings/billing");
    expect(new URL(config.data.returnUrl).searchParams.get("card_updated")).toBe("org_1");
  });

  it("tells members who can't manage billing to ask the owner", () => {
    state.canManageBilling = false;
    render(<PaymentFailedNotice organizationId="org_1" />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Ask your organization owner to update it.");
  });
});
