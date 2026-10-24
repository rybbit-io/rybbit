import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  createOrganization: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("code=one-use-code"),
}));
vi.mock("@/lib/auth", () => ({
  authClient: {
    useActiveOrganization: () => ({ data: null, isPending: false }),
    organization: { create: mocks.createOrganization, setActive: vi.fn().mockResolvedValue({}) },
  },
}));
vi.mock("@/lib/userStore", () => ({
  userStore: Object.assign(() => ({ user: mocks.user, isPending: false }), { setState: vi.fn() }),
}));
vi.mock("@/hooks/useSetPageTitle", () => ({ useSetPageTitle: () => {} }));
vi.mock("@/components/RybbitLogo", () => ({ RybbitTextLogo: () => null }));
vi.mock("@/components/auth/Turnstile", () => ({ Turnstile: () => null }));

import AppSumoSignupPage from "./page";

beforeEach(() => {
  mocks.createOrganization.mockReset().mockResolvedValue({ data: { id: "org-1" }, error: null });
  // The code is single-use: the first activation succeeds, any later one is refused.
  mocks.fetch.mockReset().mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  mocks.fetch.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "License already activated" }) });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AppSumo activation for a signed-in user without an organization", () => {
  it("activates the code once and reports success", async () => {
    render(<AppSumoSignupPage />);
    fireEvent.change(await screen.findByLabelText("Organization Name"), { target: { value: "Acme" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Continue & Activate License/ })));

    expect(await screen.findByText("Add your site (optional)")).toBeTruthy();
    // Let the existing-user effect, which now sees the new organization, run its course.
    await act(async () => {});
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(mocks.fetch.mock.calls[0][0]).toMatch(/\/as\/activate$/);
    expect(screen.queryByText(/License activation failed/)).toBeNull();
  });
});
