import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DisabledOverlay } from "./DisabledOverlay";

type Subscription = { eventLimit: number; planName: string; status: string } | undefined;

const mocks = vi.hoisted(() => ({ subscription: undefined as Subscription }));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? ""),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/lib/const", async importOriginal => ({ ...(await importOriginal<object>()), IS_CLOUD: true }));
vi.mock("@/api/admin/hooks/useSites", () => ({
  useCurrentSite: () => ({ site: { organizationId: "org1" }, subscription: mocks.subscription }),
}));
vi.mock("@/hooks/usePermissions", () => ({ useCanInOrg: () => true }));
vi.mock("@/lib/auth", () => ({
  authClient: {
    useSession: () => ({ data: { user: { role: "user" } } }),
    // Created after the Pro grandfathering cutoff.
    useActiveOrganization: () => ({ data: { createdAt: new Date("2026-01-01") } }),
  },
}));

function renderOverlay(requiredPlan?: "pro" | "standard" | "basic") {
  return render(
    <DisabledOverlay requiredPlan={requiredPlan} message="funnels">
      <div>paid feature</div>
    </DisabledOverlay>
  );
}

beforeEach(() => {
  mocks.subscription = undefined;
});

afterEach(cleanup);

describe("DisabledOverlay", () => {
  it("shows a Pro feature unlocked while the subscription hasn't loaded", () => {
    const { container } = renderOverlay("pro");

    screen.getByText("paid feature");
    expect(screen.queryByText(/Upgrade/)).toBeNull();
    expect(container.querySelector("[style*='blur']")).toBeNull();
  });

  it("shows a Pro feature to a Pro subscriber", () => {
    mocks.subscription = { eventLimit: 100_000, planName: "pro100k", status: "active" };

    renderOverlay("pro");

    expect(screen.queryByText(/Upgrade/)).toBeNull();
  });

  it("sends a paying subscriber to Billing to change plan, not to a new checkout", () => {
    mocks.subscription = { eventLimit: 100_000, planName: "standard100k", status: "active" };

    renderOverlay("pro");

    expect(screen.getByRole("link", { name: /Upgrade/ }).getAttribute("href")).toBe("/settings/billing");
  });

  it("sends a free organization to /subscribe", () => {
    mocks.subscription = { eventLimit: 3_000, planName: "free", status: "free" };

    renderOverlay();

    expect(screen.getByRole("link", { name: /Upgrade/ }).getAttribute("href")).toBe("/subscribe");
  });
});
