import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Subscribe from "./page";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  subscription: undefined as { id: string | null; status: string } | undefined,
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, push: vi.fn() }) }));
vi.mock("nuqs", () => ({ useQueryState: () => [null, vi.fn()] }));
vi.mock("@/lib/auth", () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: "u1" } } }),
    useActiveOrganization: () => ({ data: { id: "org1" } }),
  },
}));
vi.mock("@/lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: () => ({ data: mocks.subscription }),
}));
vi.mock("@/components/StandardPage", () => ({
  StandardPage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/UsageChart", () => ({ UsageChart: () => null }));
vi.mock("./components/PricingHeader", () => ({ PricingHeader: () => null }));
vi.mock("./components/PricingCards", () => ({ PricingCards: () => <div>pricing cards</div> }));

beforeEach(() => {
  mocks.subscription = undefined;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("/subscribe", () => {
  it.each(["active", "trialing"])("sends an organization with a %s Stripe subscription to Billing", status => {
    mocks.subscription = { id: "sub_123", status };

    render(<Subscribe />);

    expect(mocks.replace).toHaveBeenCalledWith("/settings/billing");
    expect(screen.queryByText("pricing cards")).toBeNull();
  });

  it("offers checkout to an organization without a subscription", () => {
    mocks.subscription = { id: null, status: "free" };

    render(<Subscribe />);

    screen.getByText("pricing cards");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("offers checkout to an AppSumo organization, which has no Stripe subscription to change", () => {
    mocks.subscription = { id: null, status: "active" };

    render(<Subscribe />);

    screen.getByText("pricing cards");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
