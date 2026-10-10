import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EnableErrorTracking } from "./errors/components/EnableErrorTracking";
import { EnableWebVitals } from "./performance/components/EnableWebVitals";
import { EnableSessionReplay } from "./replay/components/EnableSessionReplay";

const mocks = vi.hoisted(() => ({
  updateSiteConfig: vi.fn(),
  refetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  site: {} as Record<string, unknown>,
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) => values?.[key] ?? ""),
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ site: "7" }) }));
vi.mock("@/api/admin/endpoints", () => ({ updateSiteConfig: mocks.updateSiteConfig }));
vi.mock("@/api/admin/hooks/useSites", () => ({
  useGetSite: () => ({ data: mocks.site, isLoading: false, refetch: mocks.refetch }),
}));
vi.mock("@/components/ui/sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock("@/lib/const", async importOriginal => ({ ...(await importOriginal<object>()), IS_CLOUD: false }));
vi.mock("@/lib/subscription/useStripeSubscription", () => ({ useStripeSubscription: () => ({ data: undefined }) }));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mocks.site = { permissions: ["sites:configure"] };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe.each([
  { name: "Web Vitals", Banner: EnableWebVitals, config: { webVitals: true }, done: "Web Vitals collection enabled" },
  {
    name: "error tracking",
    Banner: EnableErrorTracking,
    config: { trackErrors: true },
    done: "Error tracking enabled",
  },
  {
    name: "session replay",
    Banner: EnableSessionReplay,
    config: { sessionReplay: true },
    done: "Session replay enabled",
  },
])("Enable $name", ({ name, Banner, config, done }) => {
  it("stays busy until the site refetch lands, then confirms", async () => {
    const refetch = deferred();
    mocks.updateSiteConfig.mockResolvedValue({ success: true });
    mocks.refetch.mockReturnValue(refetch.promise);
    render(<Banner />);

    const button = screen.getByRole("button", { name: "Enable" });
    fireEvent.click(button);

    await waitFor(() => expect(mocks.refetch).toHaveBeenCalled());
    expect(mocks.updateSiteConfig).toHaveBeenCalledWith(7, config);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(mocks.toastSuccess).not.toHaveBeenCalled();

    // A second click while enabling does nothing.
    fireEvent.click(button);
    expect(mocks.updateSiteConfig).toHaveBeenCalledOnce();

    await act(async () => refetch.resolve());
    expect(mocks.toastSuccess).toHaveBeenCalledWith(done);
    expect(button.hasAttribute("aria-busy")).toBe(false);
  });

  it("asks for an admin instead of offering Enable without sites:configure", () => {
    mocks.site = { permissions: ["analytics:read"] };
    render(<Banner />);

    expect(screen.queryByRole("button", { name: "Enable" })).toBeNull();
    expect(screen.getByText("Ask a site admin to enable it.")).toBeTruthy();
  });

  it("reports a failure and lets the user try again", async () => {
    mocks.updateSiteConfig.mockRejectedValue(new Error("Session replay requires a Pro subscription"));
    render(<Banner />);

    const button = screen.getByRole("button", { name: "Enable" });
    fireEvent.click(button);

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        `Failed to enable ${name}: Session replay requires a Pro subscription`
      )
    );
    expect(button.hasAttribute("aria-busy")).toBe(false);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
});
