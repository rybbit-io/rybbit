import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FeatureFlag } from "@/api/analytics/endpoints";
import { TooltipProvider } from "@/components/ui/tooltip";

import { FeatureFlagTable } from "./FeatureFlagTable";

const mocks = vi.hoisted(() => ({
  deleteFlag: vi.fn<(flagId: number) => Promise<unknown>>(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  writeText: vi.fn<(text: string) => Promise<void>>(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string | number>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`)) : message,
  useLocale: () => "en",
}));

vi.mock("@/api/analytics/hooks/featureFlags/useFeatureFlags", () => ({
  useDeleteFeatureFlag: () => ({ mutateAsync: mocks.deleteFlag, isPending: false }),
  useUpdateFeatureFlag: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("./FeatureFlagDialog", () => ({ FeatureFlagDialog: () => null }));

vi.mock("@/lib/store", () => ({ getTimezone: () => "UTC" }));

vi.mock("@/components/ui/sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

const flag: FeatureFlag = {
  flagId: 42,
  siteId: 1,
  key: "new-checkout",
  description: null,
  enabled: true,
  runtime: "client",
  flagType: "boolean",
  payload: null,
  variants: [],
  rolloutPercentage: 50,
  rules: [],
  conditionSets: [{ rules: [], rolloutPercentage: 50 }],
  version: 3,
  createdAt: "2026-09-01 10:00:00",
  updatedAt: "2026-09-20 10:00:00",
  stats: [],
};

function renderTable() {
  render(
    <TooltipProvider>
      <FeatureFlagTable flags={[flag]} />
    </TooltipProvider>
  );
}

function chooseDelete() {
  fireEvent.keyDown(screen.getByRole("button", { name: "Actions" }), { key: "Enter" });
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Object.defineProperty(navigator, "clipboard", { value: { writeText: mocks.writeText }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("FeatureFlagTable", () => {
  it("copies a flag's key from its row", async () => {
    mocks.writeText.mockResolvedValue(undefined);
    renderTable();

    fireEvent.click(screen.getByRole("button", { name: "Copy flag key" }));

    await waitFor(() => expect(mocks.writeText).toHaveBeenCalledWith("new-checkout"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copy flag key" }).getAttribute("data-status")).toBe("copied")
    );
  });

  it("asks in a dialog, not window.confirm, and deletes only once confirmed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    mocks.deleteFlag.mockResolvedValue(undefined);
    renderTable();

    chooseDelete();

    const dialog = await screen.findByRole("alertdialog", { name: "Delete this feature flag?" });
    expect(within(dialog).getByText('"new-checkout" will be permanently deleted. This cannot be undone.')).toBeTruthy();
    expect(mocks.deleteFlag).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete flag" }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Feature flag deleted"));
    expect(mocks.deleteFlag).toHaveBeenCalledWith(42);
    await waitFor(() => expect(dialog.isConnected).toBe(false));
  });

  it("deletes nothing when the dialog is cancelled", async () => {
    renderTable();

    chooseDelete();
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this feature flag?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(dialog.isConnected).toBe(false));
    expect(mocks.deleteFlag).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and reports the error when the delete fails", async () => {
    mocks.deleteFlag.mockRejectedValue(new Error("Flag is in use by an experiment"));
    renderTable();

    chooseDelete();
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this feature flag?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete flag" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Flag is in use by an experiment"));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(dialog.isConnected).toBe(true);
  });
});
