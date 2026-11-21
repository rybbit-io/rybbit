import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/utils";

import SiteTransferPage from "./page";

const mocks = vi.hoisted(() => ({
  session: { data: null as { user: { email: string } } | null, isPending: false },
  incoming: { data: undefined as unknown, error: null as unknown, isLoading: false },
  organizations: [] as { id: string; name: string; permissions: string[] }[],
  accept: vi.fn(),
  decline: vi.fn(),
  push: vi.fn(),
  createOrganization: vi.fn(),
  setActive: vi.fn(),
  signOut: vi.fn(),
  sendVerificationEmail: vi.fn(async () => ({ error: null })),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, unknown>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key])) : message,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ transferId: "tr_1" }),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/auth", () => ({
  authClient: {
    useSession: () => mocks.session,
    signOut: mocks.signOut,
    sendVerificationEmail: mocks.sendVerificationEmail,
    organization: { create: mocks.createOrganization, setActive: mocks.setActive },
  },
}));

vi.mock("@/lib/store", () => ({ getTimezone: () => "UTC" }));

vi.mock("@/components/RybbitLogo", () => ({ RybbitLogo: () => null }));

vi.mock("@/api/admin/hooks/useOrganizations", () => ({
  USER_ORGANIZATIONS_QUERY_KEY: "userOrganizations",
  useUserOrganizations: () => ({ data: mocks.organizations, isLoading: false }),
}));

vi.mock("@/api/admin/hooks/useSiteTransfers", () => ({
  useIncomingSiteTransfer: () => mocks.incoming,
  useAcceptSiteTransfer: () => ({ mutateAsync: mocks.accept }),
  useDeclineSiteTransfer: () => ({ mutate: mocks.decline, isPending: false }),
}));

vi.mock("@/app/invitation/components/login", () => ({
  Login: ({ callbackURL }: { callbackURL: string }) => <div>login form returning to {callbackURL}</div>,
}));

vi.mock("@/app/invitation/components/signup", () => ({
  Signup: ({ callbackURL }: { callbackURL: string }) => <div>signup form returning to {callbackURL}</div>,
}));

const transfer = {
  id: "tr_1",
  site: { siteId: 42, name: "Acme", domain: "acme.dev" },
  sourceOrganizationId: "org-source",
  sourceOrganizationName: "Acme Agency",
  sentBy: "grace@agency.dev",
  expiresAt: "2026-10-06T12:00:00.000Z",
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SiteTransferPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mocks.session = { data: { user: { email: "ada@example.com" } }, isPending: false };
  mocks.incoming = { data: transfer, error: null, isLoading: false };
  mocks.organizations = [];
  mocks.accept.mockResolvedValue({ success: true, siteId: 42, organizationId: "org-mine" });
  mocks.setActive.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("site transfer page", () => {
  it("asks a signed-out visitor to sign in, then brings them back to the link", () => {
    mocks.session = { data: null, isPending: false };
    renderPage();

    expect(screen.getByText("Sign in with the email address the transfer was sent to.")).toBeTruthy();
    expect(screen.getByText("signup form returning to /transfer/tr_1")).toBeTruthy();
  });

  it("names the right address when signed in as someone else", () => {
    mocks.incoming = {
      data: undefined,
      error: new ApiError("This transfer was sent to a different email address", 403, {
        reason: "wrong_account",
        recipientEmailHint: "g••@example.com",
      }),
      isLoading: false,
    };
    renderPage();

    expect(screen.getByText("This transfer was sent to g••@example.com. Sign in with that address.")).toBeTruthy();
    expect(screen.getByText("Signed in as ada@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("asks an unverified recipient to verify their address first", async () => {
    mocks.incoming = {
      data: undefined,
      error: new ApiError("Verify your email address to accept this transfer", 403, { reason: "email_unverified" }),
      isLoading: false,
    };
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Send verification email" }));

    await waitFor(() => expect(screen.getByText("Verification email sent. Check your inbox.")).toBeTruthy());
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      callbackURL: expect.stringMatching(/\/transfer\/tr_1$/),
    });
  });

  it("says a dead link is no longer valid", () => {
    mocks.incoming = {
      data: undefined,
      error: new ApiError("This transfer link is no longer valid", 404, {}),
      isLoading: false,
    };
    renderPage();

    expect(screen.getByText("This link is no longer valid")).toBeTruthy();
  });

  it("moves the site into an organization the recipient manages, then opens it there", async () => {
    mocks.organizations = [
      { id: "org-source", name: "Acme Agency", permissions: ["sites:create"] },
      { id: "org-viewer", name: "Read Only", permissions: ["sites:read"] },
      { id: "org-mine", name: "Ada's Org", permissions: ["sites:read", "sites:create"] },
    ];
    renderPage();

    expect(screen.getByText("grace@agency.dev is transferring this site to you from Acme Agency.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Accept transfer" }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/42"));
    expect(mocks.accept).toHaveBeenCalledWith("org-mine");
    expect(mocks.setActive).toHaveBeenCalledWith({ organizationId: "org-mine" });
    expect(mocks.createOrganization).not.toHaveBeenCalled();
  });

  it("creates an organization first when the recipient manages none", async () => {
    mocks.createOrganization.mockResolvedValue({ data: { id: "org-new" }, error: null });
    mocks.accept.mockResolvedValue({ success: true, siteId: 42, organizationId: "org-new" });
    renderPage();

    const accept = screen.getByRole("button", { name: "Accept transfer" });
    expect(accept.hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("Create an organization"), { target: { value: "Ada Labs" } });
    fireEvent.click(accept);

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/42"));
    expect(mocks.createOrganization).toHaveBeenCalledWith({
      name: "Ada Labs",
      slug: expect.stringMatching(/^ada-labs-/),
    });
    expect(mocks.accept).toHaveBeenCalledWith("org-new");
    expect(mocks.setActive).toHaveBeenCalledWith({ organizationId: "org-new" });
  });

  it("shows why accepting failed and stays on the page", async () => {
    mocks.organizations = [{ id: "org-mine", name: "Ada's Org", permissions: ["sites:create"] }];
    mocks.accept.mockRejectedValue(new Error("The site has moved since this transfer was sent"));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Accept transfer" }));

    expect(await screen.findByText("The site has moved since this transfer was sent")).toBeTruthy();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("declines only after confirming", () => {
    mocks.organizations = [{ id: "org-mine", name: "Ada's Org", permissions: ["sites:create"] }];
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "acme.dev stays with Acme Agency, and this link stops working."
    );
    expect(mocks.decline).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Decline transfer" }));
    expect(mocks.decline).toHaveBeenCalledTimes(1);
    mocks.decline.mock.calls[0][1].onSuccess();
    expect(mocks.push).toHaveBeenCalledWith("/");
  });
});
