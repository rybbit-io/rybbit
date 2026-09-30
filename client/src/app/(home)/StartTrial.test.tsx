import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StartTrial } from "./StartTrial";

const mocks = vi.hoisted(() => ({
  addSite: vi.fn(),
  onSiteCreated: vi.fn(),
  prompt: { isLoading: false, isOwner: true, trialEligible: true },
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("../../api/admin/endpoints", () => ({ addSite: mocks.addSite }));
vi.mock("../../components/RybbitLogo", () => ({ RybbitLogo: () => null }));
vi.mock("../components/PlanRequired", () => ({
  usePlanPrompt: () => mocks.prompt,
  OrganizationOwnerContact: ({ organizationId }: { organizationId: string }) => <div>owner of {organizationId}</div>,
  LazyStartPlanDialog: ({
    open,
    returnPath,
    trialEligible,
  }: {
    open: boolean;
    returnPath: string;
    trialEligible: boolean;
  }) =>
    open ? (
      <div role="dialog">
        plans for {returnPath} {trialEligible ? "with trial" : "without trial"}
      </div>
    ) : null,
}));

beforeEach(() => {
  mocks.prompt = { isLoading: false, isOwner: true, trialEligible: true };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderStartTrial() {
  return render(<StartTrial organizationId="org_1" onSiteCreated={mocks.onSiteCreated} />);
}

function submitDomain(domain: string) {
  fireEvent.change(screen.getByLabelText("Your domain"), { target: { value: domain } });
  fireEvent.submit(screen.getByLabelText("Your domain").closest("form")!);
}

describe("StartTrial — owner", () => {
  it("creates the site from a pasted URL, then opens the plan picker returning to that site", async () => {
    mocks.addSite.mockResolvedValue({ siteId: 42 });
    renderStartTrial();

    submitDomain("https://www.example.com/pricing");

    await waitFor(() => expect(mocks.addSite).toHaveBeenCalledWith("example.com", "example.com", "org_1"));
    expect((await screen.findByRole("dialog")).textContent).toContain("plans for /42 with trial");
  });

  it("rejects something that isn't a domain without creating a site", () => {
    renderStartTrial();

    submitDomain("not a domain");

    expect(screen.getByRole("alert").textContent).toContain("Enter a domain like example.com");
    expect(screen.getByLabelText("Your domain").getAttribute("aria-invalid")).toBe("true");
    expect(mocks.addSite).not.toHaveBeenCalled();
  });

  it("shows the server's reason when the site can't be created", async () => {
    mocks.addSite.mockRejectedValue(new Error("Domain already in use"));
    renderStartTrial();

    submitDomain("example.com");

    expect((await screen.findByRole("alert")).textContent).toContain("Domain already in use");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers a trial to an organization that never had a subscription", () => {
    renderStartTrial();

    screen.getByRole("button", { name: "Start free trial" });
    screen.getByText("No charge until the trial ends. Cancel anytime.");
  });

  it("offers plans, not another trial, to a returning organization", async () => {
    mocks.prompt = { isLoading: false, isOwner: true, trialEligible: false };
    mocks.addSite.mockResolvedValue({ siteId: 7 });
    renderStartTrial();

    screen.getByRole("button", { name: "Choose a plan" });
    expect(screen.queryByText(/trial/i)).toBeNull();

    submitDomain("example.com");
    expect((await screen.findByRole("dialog")).textContent).toContain("plans for /7 without trial");
  });
});

describe("StartTrial — admins and members", () => {
  it("points at the owner instead of offering a checkout they can't complete", () => {
    mocks.prompt = { isLoading: false, isOwner: false, trialEligible: true };
    renderStartTrial();

    screen.getByRole("heading", { name: "This organization doesn't have a plan yet" });
    screen.getByText("owner of org_1");
    expect(screen.queryByLabelText("Your domain")).toBeNull();
  });
});
