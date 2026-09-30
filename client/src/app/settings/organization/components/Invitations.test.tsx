import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Invitations } from "./Invitations";

const mocks = vi.hoisted(() => ({
  cancelInvitation: vi.fn(),
  refetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, unknown>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key])) : message,
}));

vi.mock("../../../../api/admin/hooks/useOrganizations", () => ({
  useOrganizationInvitations: () => ({
    data: [
      {
        id: "inv-1",
        email: "ada@example.com",
        role: "member",
        status: "pending",
        expiresAt: "2026-10-05T00:00:00.000Z",
      },
    ],
    refetch: mocks.refetch,
    isLoading: false,
  }),
}));

vi.mock("../../../../lib/auth", () => ({
  authClient: { organization: { cancelInvitation: mocks.cancelInvitation } },
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

function openConfirmation() {
  render(<Invitations organizationId="org-1" canManage />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel invitation for ada@example.com" }));
  return screen.getByRole("alertdialog");
}

beforeEach(() => {
  mocks.cancelInvitation.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Invitations", () => {
  it("offers no cancel action without permission to manage members", () => {
    render(<Invitations organizationId="org-1" canManage={false} />);
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel invitation for ada@example.com" })).toBeNull();
  });

  it("asks before cancelling, and keeping the invitation does nothing", () => {
    const dialog = openConfirmation();
    expect(dialog.textContent).toContain("The invitation sent to ada@example.com will stop working.");

    fireEvent.click(screen.getByRole("button", { name: "Keep invitation" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mocks.cancelInvitation).not.toHaveBeenCalled();
  });

  it("cancels once confirmed, then refetches and closes", async () => {
    openConfirmation();
    fireEvent.click(screen.getByRole("button", { name: "Cancel invitation" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(mocks.cancelInvitation).toHaveBeenCalledWith({ invitationId: "inv-1" });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Invitation cancelled");
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the confirm button's label, width and focus while the request is pending", async () => {
    let settle: (value: unknown) => void = () => {};
    mocks.cancelInvitation.mockReturnValue(new Promise(resolve => (settle = resolve)));
    openConfirmation();
    const confirm = screen.getByRole("button", { name: "Cancel invitation" });
    confirm.focus();
    fireEvent.click(confirm);

    // Busy rather than disabled: it keeps focus, announces "Cancelling...", and the label stays in layout
    // (invisible under the spinner) so the button doesn't change width.
    const pending = await screen.findByRole("button", { name: "Cancelling..." });
    expect(pending).toBe(confirm);
    expect(confirm.getAttribute("aria-busy")).toBe("true");
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    expect(confirm.hasAttribute("disabled")).toBe(false);
    expect(confirm.textContent).toBe("Cancel invitation");
    expect(document.activeElement).toBe(confirm);
    expect(screen.getByRole("button", { name: "Keep invitation" }).hasAttribute("disabled")).toBe(true);

    // A second click while pending doesn't send a second request.
    fireEvent.click(confirm);
    expect(mocks.cancelInvitation).toHaveBeenCalledTimes(1);

    settle({ data: {}, error: null });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("reports an error returned by better-auth instead of claiming success", async () => {
    mocks.cancelInvitation.mockResolvedValue({ data: null, error: { message: "Not allowed" } });
    openConfirmation();
    fireEvent.click(screen.getByRole("button", { name: "Cancel invitation" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Not allowed"));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
    // The dialog stays open so the owner can retry or back out.
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel invitation" }).hasAttribute("disabled")).toBe(false);
  });
});
