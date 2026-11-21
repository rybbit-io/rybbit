import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AddSite } from "./AddSite";

const mocks = vi.hoisted(() => ({
  addSite: vi.fn(),
  push: vi.fn(),
  refetch: vi.fn(),
  setSite: vi.fn(),
  resetStore: vi.fn(),
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/api/admin/endpoints", () => ({ addSite: mocks.addSite }));
vi.mock("@/api/admin/hooks/useSites", () => ({
  useGetSitesFromOrg: () => ({ data: { sites: [] }, refetch: mocks.refetch }),
}));
vi.mock("@/lib/auth", () => ({
  authClient: { useActiveOrganization: () => ({ data: { id: "org_1" } }) },
}));
vi.mock("@/lib/const", async importOriginal => ({ ...(await importOriginal<object>()), IS_CLOUD: false }));
vi.mock("@/lib/store", () => ({
  resetStore: mocks.resetStore,
  useStore: () => ({ setSite: mocks.setSite }),
}));
vi.mock("@/lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: () => ({ data: undefined, isLoading: false }),
}));

beforeEach(() => {
  // Radix radios render a hidden input inside forms and measure it.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function openDialogAndType(domain: string) {
  render(<AddSite />);
  fireEvent.click(screen.getByRole("button", { name: "Add Site" }));
  const input = screen.getByLabelText("Domain") as HTMLInputElement;
  fireEvent.change(input, { target: { value: domain } });
  return input;
}

describe("AddSite", () => {
  it("adds the site when Enter is pressed in the domain field", async () => {
    const request = deferred<{ siteId: number }>();
    mocks.addSite.mockReturnValue(request.promise);
    const input = openDialogAndType("Example.com");

    const add = screen.getByRole("button", { name: "Add" }) as HTMLButtonElement;
    expect(input.form).toBeTruthy();
    expect(add.form).toBe(input.form);
    expect(add.type).toBe("submit");

    // What the browser does on Enter in a field.
    act(() => input.form!.requestSubmit());

    expect(mocks.addSite).toHaveBeenCalledWith(
      "example.com",
      "example.com",
      "org_1",
      expect.objectContaining({ type: "web" })
    );

    // Pending: same button, busy and focusable, label kept under the spinner.
    const busy = screen.getByRole("button", { name: "Adding..." }) as HTMLButtonElement;
    expect(busy).toBe(add);
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(busy.disabled).toBe(false);
    expect(busy.textContent).toBe("Add");

    request.resolve({ siteId: 42 });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/42"));
    expect(mocks.setSite).toHaveBeenCalledWith("42");
  });

  it("shows the error and hands the button back when adding fails", async () => {
    mocks.addSite.mockRejectedValue(new Error("Domain already in use"));
    const input = openDialogAndType("example.com");

    act(() => input.form!.requestSubmit());

    expect(await screen.findByText("Error: Domain already in use")).toBeTruthy();
    const add = screen.getByRole("button", { name: "Add" });
    expect(add.hasAttribute("aria-busy")).toBe(false);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("keeps Add disabled until there is a domain, so an empty Enter does nothing", () => {
    openDialogAndType("");

    expect((screen.getByRole("button", { name: "Add" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
