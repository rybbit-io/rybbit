import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlanDialog } from "./PlanDialog";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  onOpenChange: vi.fn(),
  organizationId: "org_1",
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) => values?.[key] ?? ""),
}));
vi.mock("@/lib/auth", () => ({
  authClient: { useActiveOrganization: () => ({ data: { id: mocks.organizationId } }) },
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
  mocks.organizationId = "org_1";
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
  onlineManager.setOnline(true);
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
  it("keeps an offline-paused refresh pending for a read-only retry", async () => {
    const fetchPlan = vi.fn().mockResolvedValueOnce("standard100k").mockResolvedValue("standard250k");
    await confirmPlanChange(fetchPlan);
    await act(async () => {
      onlineManager.setOnline(false);
      update.resolve(jsonResponse({ success: true, subscription: {} }));
    });

    const retry = await screen.findByRole("button", { name: "Retry refreshing" });
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Your subscription was updated, but refreshing billing data failed: Billing refresh is paused while offline."
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.onOpenChange).not.toHaveBeenCalled();
    expect(fetchPlan).toHaveBeenCalledOnce();

    fireEvent.click(retry);
    await waitFor(() => expect(retry.hasAttribute("aria-busy")).toBe(false));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.onOpenChange).not.toHaveBeenCalled();

    await act(async () => onlineManager.setOnline(true));
    await screen.findByText("Plan: standard250k");
    fireEvent.click(retry);
    await waitFor(() => expect(mocks.onOpenChange).toHaveBeenCalledWith(false));
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("/stripe/update-subscription"))).toHaveLength(1);
  });

  it("does not apply one organization's refresh failure to another organization", async () => {
    await confirmPlanChange(vi.fn().mockResolvedValueOnce("standard100k").mockRejectedValue(new Error("Offline")));
    await act(async () => update.resolve(jsonResponse({ success: true, subscription: {} })));
    await screen.findByRole("button", { name: "Retry refreshing" });

    mocks.organizationId = "org_2";
    fireEvent.click(screen.getByRole("button", { name: "Annual" }));
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Change Plan" }));
    await screen.findByRole("button", { name: "Confirm Change" });
    const previewCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("/stripe/preview-subscription-update"));
    expect(JSON.parse(previewCalls.at(-1)![1]!.body as string).organizationId).toBe("org_2");
  });

  it("reports a refresh failure after an accepted update and retries only the reads", async () => {
    const fetchPlan = vi.fn()
      .mockResolvedValueOnce("standard100k")
      .mockRejectedValueOnce(new Error("Network offline"))
      .mockRejectedValueOnce(new Error("Still offline"))
      .mockResolvedValueOnce("standard250k");
    await confirmPlanChange(fetchPlan);
    await act(async () => update.resolve(jsonResponse({ success: true, subscription: {} })));

    const retry = await screen.findByRole("button", { name: "Retry refreshing" });
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Your subscription was updated, but refreshing billing data failed: Network offline"
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Your plan changed successfully");

    fireEvent.click(retry);
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
      "Your subscription was updated, but refreshing billing data failed: Still offline"
    ));
    await waitFor(() => expect(retry.hasAttribute("aria-busy")).toBe(false));
    expect(mocks.onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(retry);
    await waitFor(() => expect(mocks.onOpenChange).toHaveBeenCalledWith(false));
    expect(screen.getByText("Plan: standard250k")).toBeTruthy();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Subscription updated");
    const updateCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("/stripe/update-subscription"));
    expect(updateCalls).toHaveLength(1);
  });

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
