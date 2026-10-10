import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlanDialog } from "./PlanDialog";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  onOpenChange: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) => values?.[key] ?? ""),
}));
vi.mock("@/lib/auth", () => ({
  authClient: { useActiveOrganization: () => ({ data: { id: "org_1" } }) },
}));
vi.mock("@/components/ui/sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock("./CheckoutModal", () => ({ CheckoutModal: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

const PREVIEW = {
  success: true,
  preview: {
    currentPlan: { priceId: "price_old", amount: 1900, interval: "month" },
    newPlan: { priceId: "price_new", amount: 2900, interval: "month" },
    proration: { credit: 5, charge: 12, immediatePayment: 7, nextBillingDate: null },
  },
};

// Stands in for the billing page: one query derived from the plan.
function BillingPage({ fetchPlan }: { fetchPlan: () => Promise<string> }) {
  const { data } = useQuery({ queryKey: ["stripe-subscription", "org_1"], queryFn: fetchPlan });
  return (
    <>
      <p>Plan: {data}</p>
      <PlanDialog open onOpenChange={mocks.onOpenChange} currentPlanName="standard100k" hasActiveSubscription />
    </>
  );
}

let update: ReturnType<typeof deferred<Response>>;

beforeEach(() => {
  // Radix Slider measures its thumbs.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  update = deferred<Response>();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/stripe/preview-subscription-update")) return jsonResponse(PREVIEW);
      if (url.endsWith("/stripe/update-subscription")) return update.promise;
      throw new Error(`Unexpected fetch ${url}`);
    })
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function confirmPlanChange(fetchPlan: () => Promise<string>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <BillingPage fetchPlan={fetchPlan} />
    </QueryClientProvider>
  );
  expect(await screen.findByText("Plan: standard100k")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Change Plan" }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirm Change" }));

  // The preview closes; the plan button carries the pending state for the update.
  const changePlan = await screen.findByRole("button", { name: "Change Plan" });
  await waitFor(() => expect(changePlan.getAttribute("aria-busy")).toBe("true"));
  expect((changePlan as HTMLButtonElement).disabled).toBe(false);
  return changePlan;
}

describe("PlanDialog", () => {
  it("updates the plan in place: stays busy until the plan refetch lands, then closes and toasts", async () => {
    const refetch = deferred<string>();
    const fetchPlan = vi.fn().mockResolvedValueOnce("standard100k").mockReturnValueOnce(refetch.promise);
    const changePlan = await confirmPlanChange(fetchPlan);

    await act(async () => update.resolve(jsonResponse({ success: true, subscription: {} })));

    // The update succeeded, but the page hasn't caught up yet: nothing announced, dialog still open.
    await waitFor(() => expect(fetchPlan).toHaveBeenCalledTimes(2));
    expect(changePlan.getAttribute("aria-busy")).toBe("true");
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.onOpenChange).not.toHaveBeenCalled();

    await act(async () => refetch.resolve("standard250k"));

    await waitFor(() => expect(mocks.onOpenChange).toHaveBeenCalledWith(false));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Subscription updated");
    // The new plan is on the page and the toast stays up: no reload.
    expect(screen.getByText("Plan: standard250k")).toBeTruthy();
  });

  it("keeps the dialog open and reports the error when the update fails", async () => {
    const changePlan = await confirmPlanChange(vi.fn().mockResolvedValue("standard100k"));

    await act(async () => update.resolve(jsonResponse({ error: "Card declined" }, false)));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Subscription update failed: Card declined"));
    await waitFor(() => expect(changePlan.hasAttribute("aria-busy")).toBe(false));
    expect(mocks.onOpenChange).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });
});
