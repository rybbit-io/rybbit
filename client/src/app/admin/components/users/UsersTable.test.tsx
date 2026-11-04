import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminUser } from "@/types/admin";

const mocks = vi.hoisted(() => ({
  resetTwoFactor: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next-intl", () => {
  const t = (message: string, values?: Record<string, unknown>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`)) : message;
  return { useExtracted: () => t };
});
vi.mock("@/components/ui/sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));
vi.mock("@/api/admin/hooks/useAdminUserTwoFactor", () => ({
  useResetAdminUserTwoFactor: () => ({ mutateAsync: mocks.resetTwoFactor, isPending: false }),
}));
vi.mock("@/api/admin/hooks/useOrganizations", () => ({
  useRemoveUserFromOrganization: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../../../../hooks/useDateTimeFormat", () => ({
  useDateTimeFormat: () => ({ formatRelative: () => "today" }),
}));
vi.mock("../../../../components/CopyText", () => ({ CopyText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock("@/lib/userStore", () => ({ userStore: { getState: () => ({ user: { id: "u_admin" } }) } }));
vi.mock("@/components/pagination", () => ({ Pagination: () => null }));
vi.mock("./AddToOrganizationDialog", () => ({ AddToOrganizationDialog: () => null }));
vi.mock("../shared/RemoteOrganizationCombobox", () => ({ RemoteOrganizationCombobox: () => null }));

import { UsersTable } from "./UsersTable";

const users: AdminUser[] = [
  {
    id: "u_on",
    name: "Alice",
    email: "alice@example.com",
    role: "user",
    createdAt: "2026-11-01 10:00:00",
    twoFactorEnabled: true,
  },
  {
    id: "u_off",
    name: "Bob",
    email: "bob@example.com",
    role: "user",
    createdAt: "2026-11-01 10:00:00",
    twoFactorEnabled: false,
  },
];

function renderTable() {
  render(
    <UsersTable
      data={{ users, total: users.length }}
      isLoading={false}
      pagination={{ pageIndex: 0, pageSize: 50 }}
      setPagination={vi.fn()}
      sorting={[]}
      setSorting={vi.fn()}
      columnFilters={[]}
      setColumnFilters={vi.fn()}
      globalFilter=""
      setGlobalFilter={vi.fn()}
      onImpersonate={vi.fn()}
    />
  );
}

const row = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
const openMenu = (name: string) =>
  fireEvent.keyDown(within(row(name)).getByRole("button", { name: "Open menu" }), { key: "Enter" });

beforeEach(() => {
  mocks.resetTwoFactor.mockResolvedValue({ success: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("UsersTable two-factor", () => {
  it("shows who has two-factor on", () => {
    renderTable();
    expect(within(row("Alice")).getByText("On")).toBeTruthy();
    expect(within(row("Bob")).getByText("Off")).toBeTruthy();
  });

  it("offers a reset only for users with two-factor on", async () => {
    renderTable();
    openMenu("Bob");
    expect(await screen.findByRole("menuitem", { name: "Impersonate" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Reset two-factor" })).toBeNull();
  });

  it("resets after confirmation", async () => {
    renderTable();
    openMenu("Alice");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Reset two-factor" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/alice@example.com can then sign in with their password alone/)).toBeTruthy();
    expect(mocks.resetTwoFactor).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Reset two-factor" }));
    await waitFor(() => expect(mocks.resetTwoFactor).toHaveBeenCalledWith("u_on"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Two-factor authentication reset for alice@example.com");
  });

  it("keeps the dialog open and reports a failed reset", async () => {
    mocks.resetTwoFactor.mockRejectedValue(new Error("Failed to reset two-factor authentication"));
    renderTable();
    openMenu("Alice");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Reset two-factor" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset two-factor" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Failed to reset two-factor authentication"));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});
