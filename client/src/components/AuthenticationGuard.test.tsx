import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationGuard } from "./AuthenticationGuard";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  session: { user: null as { id: string } | null, isPending: false },
  redirect: vi.fn(),
  locationReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  redirect: mocks.redirect,
}));

vi.mock("@/lib/userStore", () => ({ userStore: () => mocks.session }));

vi.mock("@/api/admin/hooks/useSites", () => ({
  useGetSiteIsPublic: () => ({ data: false, isLoading: false }),
}));

beforeEach(() => {
  mocks.pathname = "/";
  mocks.session = { user: null, isPending: false };
  vi.stubGlobal("location", { replace: mocks.locationReplace });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AuthenticationGuard", () => {
  it("sends signed-out visitors to /login with a document navigation", () => {
    render(<AuthenticationGuard />);
    expect(mocks.locationReplace).toHaveBeenCalledWith("/login");
    // redirect() would unmount the root layout, <html> included, until /login has loaded.
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("waits for the session check before navigating", () => {
    mocks.session = { user: null, isPending: true };
    render(<AuthenticationGuard />);
    expect(mocks.locationReplace).not.toHaveBeenCalled();
  });

  it("leaves signed-in users where they are", () => {
    mocks.session = { user: { id: "user-1" }, isPending: false };
    render(<AuthenticationGuard />);
    expect(mocks.locationReplace).not.toHaveBeenCalled();
  });

  it("leaves public routes alone", () => {
    mocks.pathname = "/login";
    render(<AuthenticationGuard />);
    expect(mocks.locationReplace).not.toHaveBeenCalled();
  });
});
