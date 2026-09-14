import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consent: vi.fn(),
  publicClient: vi.fn(),
  session: { data: { user: { email: "owner@example.com" } } as { user: { email: string } } | null, isPending: false },
  query: "client_id=test-client&scope=openid+analytics%3Aread&sig=signed-request&exp=9999999999",
}));

vi.mock("next-intl", () => ({
  useExtracted:
    () =>
    (message: string, values: Record<string, string> = {}) =>
      message.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? key),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mocks.query) }));
vi.mock("@/lib/auth", () => ({
  authClient: {
    useSession: () => mocks.session,
    oauth2: { consent: mocks.consent, publicClient: mocks.publicClient },
  },
}));
vi.mock("@/components/RybbitLogo", () => ({ RybbitTextLogo: () => <span>Rybbit</span> }));

import ConsentPage from "./page";

function showPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ConsentPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mocks.session.data = { user: { email: "owner@example.com" } };
  mocks.query = "client_id=test-client&scope=openid+analytics%3Aread&sig=signed-request&exp=9999999999";
  mocks.publicClient.mockResolvedValue({ data: { client_name: "Test application" } });
  mocks.consent.mockResolvedValue({ error: { message: "Request expired. Reconnect to try again." } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("OAuth consent", () => {
  it("shows the registered client and requested access, and requires an explicit decision", async () => {
    showPage();
    expect(await screen.findByText("Test application is requesting access to your Rybbit account.")).toBeTruthy();
    expect(screen.getByText("Analytics: view")).toBeTruthy();
    expect(mocks.consent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Allow access" }));
    await waitFor(() => expect(mocks.consent).toHaveBeenCalledWith({ accept: true }));
    expect(await screen.findByText("Request expired. Reconnect to try again.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Allow access" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("sends rejection to the provider when the user cancels", async () => {
    showPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(mocks.consent).toHaveBeenCalledWith({ accept: false }));
  });

  it("preserves the signed OAuth request when asking a signed-out user to log in", () => {
    mocks.session.data = null;
    showPage();
    expect(screen.getByRole("link", { name: "Login" }).getAttribute("href")).toBe(`/login?${mocks.query}`);
    expect(mocks.publicClient).not.toHaveBeenCalled();
  });

  it("never offers authorization for a malformed request", () => {
    mocks.query = "client_id=test-client&redirect_uri=https://attacker.example";
    showPage();
    expect(screen.getByText(/This authorization request is invalid/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Allow access" })).toBeNull();
    expect(mocks.publicClient).not.toHaveBeenCalled();
  });
});
