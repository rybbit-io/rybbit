import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";

import { ShareExportButton } from "./ShareExportButton";

const mocks = vi.hoisted(() => ({
  revoke: vi.fn<(siteId: number) => Promise<unknown>>(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  writeText: vi.fn<(text: string) => Promise<void>>(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string) => message,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ site: "7" }),
}));

vi.mock("../../../../api/admin/hooks/usePrivateLink", () => ({
  useGetPrivateLinkConfig: () => ({ data: { privateLinkKey: "k3y" }, isLoading: false }),
  useGeneratePrivateLinkKey: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokePrivateLinkKey: () => ({ mutateAsync: mocks.revoke, isPending: false }),
}));

vi.mock("../../../../lib/auth", () => ({
  authClient: { useSession: () => ({ data: { user: { id: "u1" } } }) },
}));

vi.mock("../../../../lib/store", () => ({
  useStore: () => ({ site: "7", time: { mode: "day" }, filters: [] }),
  getTimezone: () => "UTC",
}));

vi.mock("../../../../lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: () => ({ data: { planName: "pro" } }),
}));

vi.mock("./Export", () => ({ exportCsv: vi.fn(), exportPdf: vi.fn() }));

vi.mock("@/components/ui/sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

const LINK = `${window.location.protocol}//${window.location.host}/7/k3y`;

function openShareMenu() {
  render(
    <TooltipProvider>
      <ShareExportButton />
    </TooltipProvider>
  );
  const trigger = document.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
  fireEvent.keyDown(trigger, { key: "Enter" });
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

describe("ShareExportButton private link", () => {
  it("copies the link without a toast when the copy succeeds", async () => {
    mocks.writeText.mockResolvedValue(undefined);
    openShareMenu();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copied"));
    expect(mocks.writeText).toHaveBeenCalledWith(LINK);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("reports a failed copy instead of claiming success", async () => {
    mocks.writeText.mockRejectedValue(new DOMException("Write permission denied.", "NotAllowedError"));
    openShareMenu();

    // jsdom has no document.execCommand, so the fallback fails too.
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("Couldn't copy the link. Select it and copy it manually.")
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("confirms before revoking and reports success only once the revoke lands", async () => {
    let finishRevoke!: () => void;
    mocks.revoke.mockImplementation(
      () =>
        new Promise(resolve => {
          finishRevoke = () => resolve({ privateLinkKey: null });
        })
    );
    openShareMenu();

    fireEvent.click(screen.getByRole("button", { name: "Revoke this link" }));
    expect(mocks.revoke).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog", { name: "Revoke this private link?" });
    fireEvent.click(screen.getByRole("button", { name: "Revoke link" }));

    expect(mocks.revoke).toHaveBeenCalledWith(7);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();

    finishRevoke();

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Private link revoked"));
    await waitFor(() => expect(dialog.isConnected).toBe(false));
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("keeps the confirmation open and reports the error when the revoke fails", async () => {
    mocks.revoke.mockRejectedValue(new Error("Site not found"));
    openShareMenu();

    fireEvent.click(screen.getByRole("button", { name: "Revoke this link" }));
    await screen.findByRole("alertdialog", { name: "Revoke this private link?" });
    fireEvent.click(screen.getByRole("button", { name: "Revoke link" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Site not found"));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "Revoke this private link?" })).toBeTruthy();
  });
});
