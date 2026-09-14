import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cloud: true,
  user: { id: "u1" } as { id: string } | null,
  site: {} as any,
  path: "/7/aaaaaaaaaaaa/main",
  params: new URLSearchParams(),
  organizations: [] as any[],
  pending: false,
  disableSignup: false,
  replace: vi.fn(),
  claim: vi.fn(),
  createOrg: vi.fn(),
  setActive: vi.fn(),
  signup: vi.fn(),
}));
vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("next/navigation", () => ({
  usePathname: () => state.path,
  useSearchParams: () => state.params,
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("@/lib/const", () => ({
  get IS_CLOUD() {
    return state.cloud;
  },
  BACKEND_URL: "/api",
}));
vi.mock("@/lib/configs", () => ({
  useConfigs: () => ({ configs: { disableSignup: state.disableSignup }, isLoading: false }),
}));
vi.mock("@/lib/userStore", () => ({
  userStore: Object.assign(() => ({ user: state.user }), {
    setState: (next: any) => {
      state.user = next.user;
    },
  }),
}));
vi.mock("@/lib/store", () => ({
  useStore: () => ({ site: "7", privateKey: state.path.includes("aaaaaaaaaaaa") ? "aaaaaaaaaaaa" : null }),
}));
vi.mock("@/api/admin/hooks/useSites", () => ({
  useGetSite: (siteId: string) => useQuery({ queryKey: ["get-site", siteId], queryFn: async () => state.site }),
}));
vi.mock("@/api/admin/hooks/useOrganizations", () => ({
  USER_ORGANIZATIONS_QUERY_KEY: "organizations",
  useUserOrganizations: () => ({ data: state.organizations, isPending: state.pending }),
}));
vi.mock("@/api/admin/endpoints", () => ({ claimSite: state.claim }));
vi.mock("@/lib/auth", () => ({
  authClient: {
    organization: { create: state.createOrg, setActive: state.setActive },
    signUp: { email: state.signup },
  },
}));
vi.mock("@/lib/trackAdEvent", () => ({ trackAdEvent: vi.fn() }));
vi.mock("@/app/signup/components/PlanStep", () => ({
  PlanStep: ({ onSubscribe }: any) => <button onClick={onSubscribe}>Start free trial</button>,
}));
vi.mock("@/app/signup/components/AccountStep", () => ({
  AccountStep: ({ socialCallbackURL, loginHref, onSubmit }: any) => (
    <div>
      <a href={socialCallbackURL}>OAuth</a>
      <a href={loginHref}>Log in</a>
      <button onClick={onSubmit}>Create account</button>
    </div>
  ),
}));
vi.mock("@/app/subscribe/components/utils", () => ({
  EVENT_TIERS: [100_000],
  findPriceForTier: () => ({ priceId: "price_test", name: "Pro" }),
}));
vi.mock("@/components/subscription/components/CheckoutModal", () => ({
  CheckoutModal: ({ open, clientSecret }: any) => (open ? <div>Checkout {clientSecret}</div> : null),
}));
vi.mock("./NoData", () => ({ NoData: () => null }));
vi.mock("./AffiliateBanner", () => ({ AffiliateBanner: () => null }));
vi.mock("./DemoSignupBanner", () => ({ DemoSignupBanner: () => null }));
vi.mock("./UsageBanners", () => ({ UsageBanners: () => null }));
vi.mock("@/components/FreePlanBanner", () => ({ FreePlanBanner: () => null }));
import { Header } from "./Header";

let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  state.cloud = true;
  state.disableSignup = false;
  state.user = { id: "u1" };
  state.path = "/7/aaaaaaaaaaaa/main";
  state.params = new URLSearchParams();
  state.organizations = [];
  state.pending = false;
  state.site = {
    siteId: 7,
    domain: "acme.dev",
    organizationId: null,
    claimExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  state.createOrg.mockResolvedValue({ data: { id: "org_1" } });
  state.setActive.mockResolvedValue({ data: {} });
  state.signup.mockResolvedValue({ data: { user: { id: "u1" } } });
  state.replace.mockImplementation((path: string) => {
    state.path = path.split("?")[0];
    state.params = new URLSearchParams(path.split("?")[1]);
  });
  state.claim.mockImplementation(async () => {
    state.site = { ...state.site, organizationId: "org_1", claimExpiresAt: null, isOwner: true };
    return state.site;
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ clientSecret: "secret_test" }) }))
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});
function show() {
  return render(
    <QueryClientProvider client={client}>
      <Header />
    </QueryClientProvider>
  );
}
async function openClaim() {
  fireEvent.click(await screen.findByRole("button", { name: "Claim this site" }));
}

describe("claim flow", () => {
  it("keeps the plan and checkout mounted after revoking the link and refreshing metadata", async () => {
    show();
    await openClaim();
    fireEvent.click(await screen.findByRole("button", { name: "Claim site" }));
    const subscribe = await screen.findByRole("button", { name: "Start free trial" });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Claim this site" })).toBeNull());
    expect(state.claim).toHaveBeenCalledWith(7, "aaaaaaaaaaaa", "org_1");
    expect(state.replace).toHaveBeenCalledWith("/7/main?claim=plan");
    fireEvent.click(subscribe);
    await screen.findByText("Checkout secret_test");
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.organizationId).toBe("org_1");
    expect(body.returnUrl).toBe(`${window.location.origin}/7?session_id={CHECKOUT_SESSION_ID}`);
  });
  it("reopens the claim step after OAuth returns", async () => {
    state.params = new URLSearchParams("claim=1");
    show();
    await screen.findByRole("button", { name: "Claim site" });
    expect(state.claim).not.toHaveBeenCalled();
  });
  it("resumes the plan after a reload on the owned URL", async () => {
    state.path = "/7/main";
    state.params = new URLSearchParams("claim=plan");
    state.site = { ...state.site, organizationId: "org_1", claimExpiresAt: null, isOwner: true };
    show();
    await screen.findByRole("button", { name: "Start free trial" });
    expect(state.claim).not.toHaveBeenCalled();
  });
  it("shows the banner on the globe and preserves OAuth and login return paths", async () => {
    state.path = "/7/aaaaaaaaaaaa/globe";
    state.user = null;
    show();
    await openClaim();
    expect((await screen.findByRole("link", { name: "OAuth" })).getAttribute("href")).toBe("/7/aaaaaaaaaaaa?claim=1");
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe(
      "/login?returnTo=%2F7%2Faaaaaaaaaaaa%3Fclaim%3D1"
    );
  });
  it("waits for memberships before offering to create an organization", async () => {
    state.pending = true;
    show();
    await openClaim();
    await screen.findByText("Loading...");
    expect(screen.queryByRole("button", { name: "Claim site" })).toBeNull();
    expect(state.createOrg).not.toHaveBeenCalled();
  });
  it("lets an existing admin claim into their organization", async () => {
    state.organizations = [{ id: "org_1", name: "Existing", role: "admin" }];
    show();
    await openClaim();
    fireEvent.click(await screen.findByRole("button", { name: "Claim site" }));
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/7"));
    expect(state.createOrg).not.toHaveBeenCalled();
  });
  it("finishes self-hosted signup without checkout", async () => {
    state.cloud = false;
    state.user = null;
    show();
    await openClaim();
    fireEvent.click(await screen.findByRole("button", { name: "Create account" }));
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/7"));
    expect(fetch).not.toHaveBeenCalled();
  });
  it("offers login when signup is disabled", async () => {
    state.disableSignup = true;
    state.user = null;
    show();
    await openClaim();
    await screen.findByText("Signup is disabled");
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
  });
});
