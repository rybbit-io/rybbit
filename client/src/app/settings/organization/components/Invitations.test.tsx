import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type Invitation, InvitationRow } from "./Invitations";

const mocks = vi.hoisted(() => ({
  cancelInvitation: vi.fn(),
  inviteMember: vi.fn(),
  refetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, unknown>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key])) : message,
}));

vi.mock("@/lib/auth", () => ({
  authClient: { organization: { cancelInvitation: mocks.cancelInvitation, inviteMember: mocks.inviteMember } },
}));

vi.mock("@/lib/store", () => ({ getTimezone: () => "UTC" }));

vi.mock("@/components/ui/sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

const invitation = {
  id: "inv-1",
  organizationId: "org-1",
  email: "ada@example.com",
  role: "member",
  status: "pending",
  inviterId: "user-1",
  expiresAt: new Date("2099-10-05T00:00:00.000Z"),
  createdAt: new Date("2099-10-03T00:00:00.000Z"),
} as Invitation;

const access = {
  everySiteByRole: false,
  reached: 2,
  total: 5,
  raised: [{ role: "editor", sites: 2 }],
  sources: [{ type: "team" as const, teamId: "team-1", teamName: "Growth" }],
};

function renderRow(props: Partial<React.ComponentProps<typeof InvitationRow>> = {}) {
  return render(
    <table>
      <tbody>
        <InvitationRow
          invitation={invitation}
          access={access}
          canManage
          canResend
          onChanged={mocks.refetch}
          {...props}
        />
      </tbody>
    </table>
  );
}

function openConfirmation() {
  renderRow();
  fireEvent.click(screen.getByRole("button", { name: "Cancel invitation for ada@example.com" }));
  return screen.getByRole("alertdialog");
}

beforeEach(() => {
  mocks.cancelInvitation.mockResolvedValue({ data: {}, error: null });
  mocks.inviteMember.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InvitationRow", () => {
  it("shows who was invited, as what, the sites they'll reach, and when it expires", () => {
    renderRow({ inviterName: "Grace Hopper" });
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByText("Invited by Grace Hopper")).toBeTruthy();
    expect(screen.getByText("Member")).toBeTruthy();
    expect(screen.getByText(/^2 of 5 sites/).textContent).toBe("2 of 5 sites · Editor on 2");
    expect(screen.getByText("Growth").getAttribute("title")).toBe("Access granted through this team's sites");
    expect(screen.getByText(/^Expires Oct 5/)).toBeTruthy();
  });

  it("offers no actions without permission to manage members", () => {
    renderRow({ canManage: false });
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel invitation for ada@example.com" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Resend invitation to ada@example.com" })).toBeNull();
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

  it("resends the same invitation through better-auth, then refetches", async () => {
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Resend invitation to ada@example.com" }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Invitation sent to ada@example.com"));
    expect(mocks.inviteMember).toHaveBeenCalledWith({
      email: "ada@example.com",
      role: "member",
      organizationId: "org-1",
      hasRestrictedSiteAccess: false,
      siteIds: [],
      resend: true,
    });
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("recreates an expired invitation with its team and site role, then cancels the expired one", async () => {
    const expired = {
      ...invitation,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      teamId: "team-1,team-2",
      hasRestrictedSiteAccess: true,
      siteIds: [3, 4],
      siteRole: "editor",
    } as Invitation;
    renderRow({ invitation: expired });
    fireEvent.click(screen.getByRole("button", { name: "Resend invitation to ada@example.com" }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Invitation sent to ada@example.com"));
    expect(mocks.inviteMember).toHaveBeenCalledWith({
      email: "ada@example.com",
      role: "member",
      organizationId: "org-1",
      hasRestrictedSiteAccess: true,
      siteIds: [3, 4],
      siteRole: "editor",
      teamId: ["team-1", "team-2"],
      resend: true,
    });
    expect(mocks.cancelInvitation).toHaveBeenCalledWith({ invitationId: "inv-1" });
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("leaves an unexpired invitation in place when resending it", async () => {
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Resend invitation to ada@example.com" }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());
    expect(mocks.cancelInvitation).not.toHaveBeenCalled();
  });

  it("reports a failed resend instead of claiming success", async () => {
    mocks.inviteMember.mockResolvedValue({ data: null, error: { message: "Member limit reached" } });
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Resend invitation to ada@example.com" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Member limit reached"));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it("offers no resend when the invitation can't be sent again", () => {
    renderRow({ canResend: false });
    expect(screen.queryByRole("button", { name: "Resend invitation to ada@example.com" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel invitation for ada@example.com" })).toBeTruthy();
  });
});
