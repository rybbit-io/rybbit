import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { useStore } from "@/lib/store";
import { CommandPalette } from "./CommandPalette";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";
import { usePaletteOverlay } from "./store";

const mocks = vi.hoisted(() => ({
  pathname: "/12/main",
  signedIn: true,
  push: vi.fn(),
  setTheme: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string | number>) =>
    values
      ? message
          .replace(/\{(\w+), plural, one \{([^}]*)\} other \{([^}]*)\}\}/g, (_, key, one, other) =>
            String(values[key] === 1 ? one : other).replace("#", String(values[key]))
          )
          .replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`))
      : message,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "dark", setTheme: mocks.setTheme }) }));

vi.mock("@uidotdev/usehooks", () => ({ useWindowSize: () => ({ width: 1280, height: 800 }) }));

vi.mock("@/lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: mocks.signedIn ? { user: { id: "user-1" }, session: { activeOrganizationId: "org-1" } } : null,
      isPending: false,
    }),
    useActiveOrganization: () => ({ data: { id: "org-1" } }),
  },
}));

vi.mock("@/lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/api/admin/hooks/useSites", () => ({
  useGetSite: () => ({ data: { siteId: 12, name: "rybbit.com", domain: "rybbit.com", type: "web" } }),
  useGetSitesFromOrg: () => ({
    data: {
      sites: [
        { siteId: 12, name: "rybbit.com", domain: "rybbit.com" },
        { siteId: 13, name: "Docs", domain: "docs.rybbit.com" },
      ],
    },
  }),
}));

vi.mock("@/api/admin/hooks/useOrganizations", () => ({
  useUserOrganizations: () => ({
    data: [{ id: "org-1", role: "owner", permissions: ["members:manage", "teams:manage", "billing:manage"] }],
    isLoading: false,
  }),
}));

vi.mock("@/api/analytics/hooks/goals/useGetGoals", () => ({
  useGetGoals: () => ({
    data: { data: [{ goalId: 1, name: "Signed up", goalType: "path", config: { pathPattern: "/welcome" } }] },
  }),
}));

vi.mock("@/api/analytics/hooks/funnels/useGetFunnels", () => ({
  useGetFunnels: () => ({ data: [{ id: 3, name: "Checkout", steps: [{}, {}, {}] }] }),
}));

vi.mock("@/api/analytics/hooks/useDashboards", () => ({ useGetDashboards: () => ({ data: [] }) }));

const pressCtrlK = (target: Element = document.body) =>
  fireEvent.keyDown(target, { key: "k", code: "KeyK", ctrlKey: true });

const openPalette = async () => {
  pressCtrlK();
  return screen.findByRole("dialog", { name: "Command palette" });
};

const search = (dialog: HTMLElement, query: string) => {
  const input = within(dialog).getByRole("combobox");
  fireEvent.change(input, { target: { value: query } });
  return input;
};

const optionNames = (dialog: HTMLElement) =>
  within(dialog)
    .getAllByRole("option")
    .map(option => option.getAttribute("aria-label"));

// jsdom has no layout: stack the list's entries 36px apart in a list that shows ten.
const ROW_HEIGHT = 36;
const mockListLayout = () => {
  const box = (top: number, height: number) =>
    ({
      top,
      bottom: top + height,
      left: 0,
      right: 560,
      width: 560,
      height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;

  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.hasAttribute("cmdk-list")) return box(0, ROW_HEIGHT * 10);
    if (this.hasAttribute("data-entry")) {
      const siblings = Array.from(this.parentElement?.querySelectorAll(":scope > [data-entry]") ?? []);
      return box(siblings.indexOf(this) * ROW_HEIGHT, ROW_HEIGHT);
    }
    return box(0, 0);
  });
};

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

beforeEach(() => {
  mocks.pathname = "/12/main";
  mocks.signedIn = true;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }) as unknown as MediaQueryList
  );
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  usePaletteOverlay.setState({ overlay: null });
  window.history.replaceState(null, "", "/");
  Reflect.deleteProperty(window.navigator, "platform");
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CommandPalette", () => {
  it("opens with Ctrl+K off Apple platforms and focuses the search", async () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).toBeNull();

    const dialog = await openPalette();

    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("combobox")));
  });

  it("uses ⌘K on a Mac, and the same chord closes it again", async () => {
    Object.defineProperty(window.navigator, "platform", { value: "MacIntel", configurable: true });
    render(<CommandPalette />);

    pressCtrlK();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document.body, { key: "k", code: "KeyK", metaKey: true });
    const dialog = await screen.findByRole("dialog", { name: "Command palette" });

    // From inside the search field too.
    fireEvent.keyDown(within(dialog).getByRole("combobox"), { key: "k", code: "KeyK", metaKey: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("lists the site's sections under the sidebar's rules, its goals and funnels, and the other sites", async () => {
    render(<CommandPalette />);
    const dialog = await openPalette();
    const names = optionNames(dialog);

    expect(names).toContain("Sessions, rybbit.com");
    expect(names).toContain("Main, rybbit.com, Current");
    // Cloud-only sections stay hidden on a self-hosted build, as in the sidebar.
    expect(names).not.toContain("Pages, rybbit.com");
    expect(names).not.toContain("Query, rybbit.com");
    // The open site is not offered as a site to switch to.
    expect(names).toContain("Docs, docs.rybbit.com, Switch site");
    expect(names.some(name => name?.startsWith("rybbit.com"))).toBe(false);
    expect(names).toContain("Signed up, /welcome, Goals");
    expect(names).toContain("Checkout, 3 steps, Funnels");
    expect(names).toContain("Organization, Navigate");
    expect(names).toContain("Dark, Theme, Current");
    for (const heading of ["rybbit.com", "Switch site", "Goals", "Funnels", "Date range", "Navigate", "Theme"]) {
      expect(within(dialog).getAllByText(heading).length).toBeGreaterThan(0);
    }
  });

  it("ranks as the query changes and runs the top match with Enter", async () => {
    render(<CommandPalette />);
    const dialog = await openPalette();

    const input = search(dialog, "ses");

    expect(optionNames(dialog)[0]).toBe("Sessions, rybbit.com");
    // Ranked results drop the headings; each row shows its group instead.
    expect(within(dialog).queryByText("Switch site")).toBeNull();
    await waitFor(() => expect(within(dialog).getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true"));

    fireEvent.keyDown(input, { key: "Enter" });

    expect(mocks.push).toHaveBeenCalledWith("/12/sessions");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("glides only rows that were on screen; the rest mount in place", async () => {
    mockListLayout();
    render(<CommandPalette />);
    const dialog = await openPalette();
    const option = (name: string) => within(dialog).getByRole("option", { name });
    const list = within(dialog).getByRole("listbox");

    // Grouped view: Sessions is the fourth entry, on screen. Docs, under
    // "Switch site", is the fifteenth: below the fold.
    const sessions = option("Sessions, rybbit.com");
    const docs = option("Docs, docs.rybbit.com, Switch site");
    list.scrollTop = 120;

    search(dialog, "s");

    // Sessions keeps its element, so it glides from where it was drawn...
    expect(option("Sessions, rybbit.com")).toBe(sessions);
    // ...but Docs was never visible: a fresh element lands in its new slot.
    expect(option("Docs, docs.rybbit.com, Switch site")).not.toBe(docs);
    expect(list.scrollTop).toBe(0);
  });

  it("shows an empty state when nothing matches", async () => {
    render(<CommandPalette />);
    const dialog = await openPalette();

    search(dialog, "zzzz");

    expect(within(dialog).queryAllByRole("option")).toHaveLength(0);
    expect(within(dialog).getAllByText("No results").length).toBeGreaterThan(0);
    // Screen readers hear it once typing settles.
    await waitFor(() => expect(within(dialog).getByRole("status").textContent).toBe("No results"));
  });

  it("announces the result count once typing settles", async () => {
    render(<CommandPalette />);
    const dialog = await openPalette();
    const status = within(dialog).getByRole("status");
    expect(status.textContent).toBe("");

    search(dialog, "checkout");
    await waitFor(() => expect(status.textContent).toBe("1 result"));

    search(dialog, "s");
    const count = within(dialog).getAllByRole("option").length;
    await waitFor(() => expect(status.textContent).toBe(`${count} results`));
  });

  it("switches to another site on the same section", async () => {
    mocks.pathname = "/12/sessions";
    render(<CommandPalette />);
    const dialog = await openPalette();

    const input = search(dialog, "docs");
    await waitFor(() => expect(within(dialog).getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true"));
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mocks.push).toHaveBeenCalledWith("/13/sessions");
  });

  it("applies a date preset like its hotkey, only on pages with a date selector", async () => {
    render(<CommandPalette />);
    let dialog = await openPalette();

    const input = search(dialog, "last 7");
    expect(optionNames(dialog)[0]).toBe("Last 7 Days, Date range");
    await waitFor(() => expect(within(dialog).getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true"));
    fireEvent.keyDown(input, { key: "Enter" });

    expect(useStore.getState().time.wellKnown).toBe("last-7-days");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    cleanup();

    mocks.pathname = "/12/query";
    render(<CommandPalette />);
    dialog = await openPalette();
    expect(within(dialog).queryByText("Date range")).toBeNull();
    expect(optionNames(dialog).some(name => name?.endsWith("Date range"))).toBe(false);
  });

  it("hands over to the shortcut sheet from its command", async () => {
    render(<CommandPalette />);
    const dialog = await openPalette();

    const input = search(dialog, "keyboard");
    await waitFor(() => expect(within(dialog).getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true"));
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull());
  });

  it("opens the shortcut sheet with ? unless the user is typing", async () => {
    render(
      <>
        <input aria-label="Filter" />
        <CommandPalette />
      </>
    );
    const field = screen.getByRole("textbox", { name: "Filter" });
    field.focus();
    fireEvent.keyDown(field, { key: "?", code: "Slash", shiftKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document.body, { key: "?", code: "Slash", shiftKey: true });
    const sheet = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });

    const row = (label: string) => within(sheet).getByText(label).parentElement?.textContent;
    expect(row("Open command palette")).toBe("Open command palette" + "CtrlK");
    expect(row("Today")).toBe("TodayD");
    expect(row("Last 30 Minutes")).toBe("Last 30 MinutesR");
    expect(row("Custom range")).toBe("Custom rangeC");
    expect(row("Back 10 seconds")).toBe("Back 10 seconds←");
    expect(row("Save changes")).toBe("Save changesCtrlS");

    // "?" again closes it.
    fireEvent.keyDown(sheet, { key: "?", code: "Slash", shiftKey: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps page shortcuts and Escape from acting on the page behind an overlay", async () => {
    const pageShortcut = vi.fn();
    const windowShortcut = vi.fn();
    document.addEventListener("keydown", pageShortcut);
    window.addEventListener("keydown", windowShortcut);
    render(<CommandPalette />);

    fireEvent.keyDown(document.body, { key: "?", code: "Slash", shiftKey: true });
    const sheet = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    pageShortcut.mockClear();
    windowShortcut.mockClear();

    fireEvent.keyDown(sheet, { key: "d", code: "KeyD" });
    fireEvent.keyDown(sheet, { key: "ArrowLeft", code: "ArrowLeft" });
    fireEvent.keyDown(sheet, { key: "Escape", code: "Escape" });

    expect(pageShortcut).not.toHaveBeenCalled();
    expect(windowShortcut).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    document.removeEventListener("keydown", pageShortcut);
    window.removeEventListener("keydown", windowShortcut);
  });

  it("stays off for signed-out visitors, private links and embeds", async () => {
    mocks.signedIn = false;
    render(<CommandPalette />);
    pressCtrlK();
    fireEvent.keyDown(document.body, { key: "?", shiftKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();

    mocks.signedIn = true;
    mocks.pathname = "/12/abcdef123456/main";
    render(<CommandPalette />);
    pressCtrlK();
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();

    mocks.pathname = "/12/main";
    window.history.replaceState(null, "", "/12/main?embed=true");
    render(<CommandPalette />);
    pressCtrlK();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("CommandPaletteTrigger", () => {
  it("opens the palette and shows its shortcut", async () => {
    render(
      <>
        <CommandPaletteTrigger />
        <CommandPalette />
      </>
    );
    const trigger = screen.getByRole("button", { name: /Search/ });
    expect(trigger.getAttribute("aria-keyshortcuts")).toBe("Control+K");
    expect(trigger.textContent).toBe("SearchCtrlK");

    fireEvent.click(trigger);

    expect(await screen.findByRole("dialog", { name: "Command palette" })).toBeTruthy();
  });

  it("renders nothing for signed-out visitors", () => {
    mocks.signedIn = false;
    render(<CommandPaletteTrigger />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
