import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Session = { data: { session: { activeOrganizationId: string | null } } | null; isPending: boolean };
type Subscription = { data?: { trialEligible?: boolean }; isLoading: boolean };

const mocks = vi.hoisted(() => ({
  session: { data: null, isPending: true } as Session,
  subscription: { isLoading: false } as Subscription,
  subscriptionOrganizationId: undefined as string | undefined,
  fetch: vi.fn(),
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/const", async importOriginal => ({ ...(await importOriginal<object>()), IS_CLOUD: true }));
vi.mock("@/lib/auth", () => ({
  authClient: {
    useSession: () => mocks.session,
    getSession: () => new Promise(() => {}),
    organization: { create: vi.fn(), setActive: vi.fn() },
  },
}));
vi.mock("@/lib/configs", () => ({ useConfigs: () => ({ configs: {}, isLoading: false }) }));
vi.mock("@/lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: (organizationId?: string) => {
    mocks.subscriptionOrganizationId = organizationId;
    return organizationId ? mocks.subscription : { isLoading: false };
  },
}));
vi.mock("@/hooks/useSetPageTitle", () => ({ useSetPageTitle: () => {} }));
vi.mock("@/components/RybbitLogo", () => ({ RybbitLogo: () => null, RybbitTextLogo: () => null }));
vi.mock("@/components/subscription/components/CheckoutModal", () => ({ CheckoutModal: () => null }));
// Radix's slider measures itself with ResizeObserver, which jsdom lacks.
vi.mock("@/components/ui/slider", () => ({ Slider: () => null }));
vi.mock("./components/SetupStep", () => ({ SetupStep: () => <div data-testid="setup-step" /> }));

import SignupPage from "./page";

function renderPlanStepAfterReload() {
  return render(
    <NuqsTestingAdapter searchParams="?step=3">
      <SignupPage />
    </NuqsTestingAdapter>
  );
}

const checkoutButton = () =>
  screen.getByRole("button", { name: /Loading\.\.\.|Start free trial|Continue to checkout/ });

beforeEach(() => {
  mocks.session = { data: null, isPending: true };
  mocks.subscription = { isLoading: false };
  mocks.fetch.mockReset().mockResolvedValue({ ok: true, json: async () => ({ clientSecret: "secret" }) });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("signup plan step after a reload", () => {
  it("waits for the session instead of sending the visitor back to create another organization", () => {
    const view = renderPlanStepAfterReload();
    expect((checkoutButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(checkoutButton());
    expect(screen.queryByTestId("setup-step")).toBeNull();

    mocks.session = { data: { session: { activeOrganizationId: "org-1" } }, isPending: false };
    mocks.subscription = { data: { trialEligible: true }, isLoading: false };
    view.rerender(
      <NuqsTestingAdapter searchParams="?step=3">
        <SignupPage />
      </NuqsTestingAdapter>
    );
    expect(mocks.subscriptionOrganizationId).toBe("org-1");
    expect((checkoutButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("offers no trial to a restored organization that already had one, and checks out that organization", async () => {
    mocks.session = { data: { session: { activeOrganizationId: "org-1" } }, isPending: false };
    mocks.subscription = { data: { trialEligible: false }, isLoading: false };
    renderPlanStepAfterReload();

    expect(screen.queryByText("Start your 7-day free trial")).toBeNull();
    expect(screen.getByText("You'll be charged when you subscribe. You can cancel anytime.")).toBeTruthy();
    expect(checkoutButton().textContent).toContain("Continue to checkout");

    await act(async () => fireEvent.click(checkoutButton()));
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toMatchObject({ organizationId: "org-1" });
  });

  it("still sends a visitor with no organization back to the setup step", () => {
    mocks.session = { data: { session: { activeOrganizationId: null } }, isPending: false };
    renderPlanStepAfterReload();
    expect(screen.getByText("Start your 7-day free trial")).toBeTruthy();

    fireEvent.click(checkoutButton());
    expect(screen.getByTestId("setup-step")).toBeTruthy();
  });
});
