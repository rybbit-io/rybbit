import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedFunnel } from "@/api/analytics/endpoints";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";

const mocks = vi.hoisted(() => ({ deleteFunnel: vi.fn(), toastSuccess: vi.fn() }));

vi.mock("next-intl", () => ({
  useExtracted:
    () =>
    (message: string, values: Record<string, string> = {}) =>
      message.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? key),
}));
vi.mock("@/api/analytics/endpoints/funnels", async importOriginal => ({
  ...(await importOriginal<typeof import("@/api/analytics/endpoints/funnels")>()),
  deleteFunnel: mocks.deleteFunnel,
}));
vi.mock("@/api/analytics/hooks/funnels/useGetFunnel", () => ({
  useGetFunnel: () => ({ data: undefined, isError: false, error: null, isLoading: false, isSuccess: false }),
}));
vi.mock("@/components/ui/sonner", () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }));
vi.mock("./EditFunnel", () => ({ EditFunnelDialog: () => null }));
vi.mock("./Funnel", () => ({ Funnel: () => null }));

import { FunnelRow } from "./FunnelRow";

const funnel: SavedFunnel = {
  id: 7,
  name: "Signup",
  steps: [
    { type: "page", value: "/" },
    { type: "page", value: "/signup" },
  ],
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  conversionRate: null,
  totalVisitors: null,
};

function renderRow() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <FunnelRow funnel={funnel} index={1} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// The row's icon buttons are labelled by tooltips only, so find the delete one by its icon.
function openDeleteDialog(container: HTMLElement) {
  const trash = container.querySelector(".lucide-trash-2, .lucide-trash2")?.closest("button");
  fireEvent.click(trash!);
}

beforeEach(() => {
  useStore.setState({ site: "42" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("FunnelRow delete", () => {
  it("keeps the dialog open and shows the server error when the delete fails", async () => {
    mocks.deleteFunnel.mockRejectedValue(new Error("Funnel is used by a dashboard"));
    const { container } = renderRow();

    openDeleteDialog(container);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(await screen.findByText(/Funnel is used by a dashboard/)).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("toasts only after the server confirms, and can't be submitted twice meanwhile", async () => {
    let resolve!: (value: { success: boolean }) => void;
    mocks.deleteFunnel.mockReturnValue(new Promise(r => (resolve = r)));
    const { container } = renderRow();

    openDeleteDialog(container);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    const pending = (await screen.findByRole("button", { name: "Deleting..." })) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();

    await act(async () => resolve({ success: true }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Funnel deleted successfully"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.deleteFunnel).toHaveBeenCalledTimes(1);
    expect(mocks.deleteFunnel).toHaveBeenCalledWith("42", 7);
  });
});
