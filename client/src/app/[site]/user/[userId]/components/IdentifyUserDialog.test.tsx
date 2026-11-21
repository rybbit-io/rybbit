import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IdentifyUserDialog } from "./IdentifyUserDialog";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  onOpenChange: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string) => message,
}));

vi.mock("@/api/analytics/hooks/useIdentifyUser", () => ({
  useIdentifyUser: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  mocks.mutateAsync.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("IdentifyUserDialog", () => {
  it("shows helpful placeholders and submits arbitrary traits", async () => {
    render(<IdentifyUserDialog anonymousId="anonymous-123" open onOpenChange={mocks.onOpenChange} />);

    expect(screen.getByPlaceholderText("e.g. user_123")).toBeTruthy();
    expect(screen.getByPlaceholderText("e.g. Ada Lovelace")).toBeTruthy();
    expect(screen.getByPlaceholderText("e.g. ada@example.com")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("User ID"), { target: { value: "user-456" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: "Add trait" }));
    fireEvent.change(screen.getByLabelText("Trait key"), { target: { value: "plan" } });
    fireEvent.change(screen.getByLabelText("Trait value"), { target: { value: "pro" } });
    fireEvent.click(screen.getByRole("button", { name: "Identify" }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        anonymousId: "anonymous-123",
        userId: "user-456",
        traits: { name: "Ada", plan: "pro" },
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("User identified");
    expect(mocks.onOpenChange).toHaveBeenCalledWith(false);
  });
});
