import React, { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Goal, SavedFunnel } from "@/api/analytics/endpoints";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { computeFunnelMetrics, FunnelRowData } from "./funnelMetrics";

const mocks = vi.hoisted(() => ({
  deleteFunnel: vi.fn(),
  toastSuccess: vi.fn(),
  useGetFunnel: vi.fn(),
  funnel: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted:
    () =>
    (message: string, values: Record<string, string> = {}) =>
      message.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? key),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, prefetch, ...props }: { href: string; children: ReactNode; prefetch?: boolean }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/api/analytics/endpoints/funnels", async importOriginal => ({
  ...(await importOriginal<typeof import("@/api/analytics/endpoints/funnels")>()),
  deleteFunnel: mocks.deleteFunnel,
}));
vi.mock("@/api/analytics/hooks/funnels/useGetFunnel", () => ({
  useGetFunnel: (config: unknown) => mocks.useGetFunnel(config),
}));
vi.mock("@/components/ui/sonner", () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }));
vi.mock("./EditFunnel", () => ({
  EditFunnelDialog: ({ isCloneMode }: { isCloneMode?: boolean }) => (
    <div role="dialog">{isCloneMode ? "clone editor" : "edit editor"}</div>
  ),
}));
vi.mock("./Funnel", () => ({
  Funnel: (props: { actions?: ReactNode }) => {
    mocks.funnel(props);
    return <div data-testid="funnel-chart">{props.actions}</div>;
  },
}));

import { FunnelRow, FunnelRowProps } from "./FunnelRow";

const funnel: SavedFunnel = {
  id: 7,
  name: "Signup",
  steps: [
    { type: "page", value: "/", name: "Home" },
    { type: "page", value: "/pricing", name: "Pricing" },
    { type: "page", value: "/signup" },
  ],
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

const metrics = (sessions: number[]) => computeFunnelMetrics(sessions.map(count => ({ sessions: count })));

const emptyRow: FunnelRowData = { funnel, current: null, previous: null };
const fullRow: FunnelRowData = {
  funnel,
  current: metrics([84210, 17920, 412]),
  previous: metrics([74930, 15692, 335]),
};

const links = { goals: "/42/goals?compare=previous", journeys: "/42/journeys?compare=previous" };

function renderRow(props: Partial<FunnelRowProps> = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onToggle = vi.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <FunnelRow
          row={emptyRow}
          expanded={false}
          onToggle={onToggle}
          canWrite
          isLoading={false}
          links={links}
          {...props}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
  return { ...view, onToggle };
}

const openMenu = () =>
  fireEvent.keyDown(screen.getByRole("button", { name: /Edit, clone or delete Signup/ }), { key: "Enter" });

// Edit, clone and delete live in the row's menu.
async function openDeleteDialog() {
  openMenu();
  fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  useStore.setState({ site: "42" });
  mocks.useGetFunnel.mockReturnValue({ data: undefined, isError: false, error: null, isLoading: false });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("FunnelRow delete", () => {
  it("keeps the dialog open and shows the server error when the delete fails", async () => {
    mocks.deleteFunnel.mockRejectedValue(new Error("Funnel is used by a dashboard"));
    renderRow();

    await openDeleteDialog();
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(await screen.findByText(/Funnel is used by a dashboard/)).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("toasts only after the server confirms, and can't be submitted twice meanwhile", async () => {
    let resolve!: (value: { success: boolean }) => void;
    mocks.deleteFunnel.mockReturnValue(new Promise(r => (resolve = r)));
    renderRow();

    await openDeleteDialog();
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    const pending = (await screen.findByRole("button", { name: "Deleting..." })) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();

    await act(async () => resolve({ success: true }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Funnel deleted successfully"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.deleteFunnel).toHaveBeenCalledTimes(1);
    expect(mocks.deleteFunnel).toHaveBeenCalledWith("42", 7);
  });
});

describe("FunnelRow menu", () => {
  it("opens the editor to edit and to clone", async () => {
    renderRow();

    openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit funnel" }));
    expect(await screen.findByText("edit editor")).toBeTruthy();

    openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Clone" }));
    expect(await screen.findByText("clone editor")).toBeTruthy();
  });

  it("does not toggle the row when the menu is used", async () => {
    const { onToggle } = renderRow();

    fireEvent.click(screen.getByRole("button", { name: /Edit, clone or delete Signup/ }));
    await openDeleteDialog();

    expect(onToggle).not.toHaveBeenCalled();
  });

  it("offers no edit, clone or delete without funnels:write", () => {
    renderRow({ canWrite: false, expanded: true, row: fullRow });

    expect(screen.queryByRole("button", { name: /Edit, clone or delete/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit funnel" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Clone" })).toBeNull();
    // Reading where the paths go is not a write.
    expect(screen.getByRole("link", { name: "Explore paths" }).getAttribute("href")).toBe(links.journeys);
  });
});

describe("FunnelRow summary", () => {
  it("states entered, converted, conversion and the change against the comparison period", () => {
    renderRow({ row: fullRow });
    const header = screen.getByTestId("funnel-row-header");

    expect(header.textContent).toContain("84,210");
    expect(header.textContent).toContain("412");
    // 412 of 84,210 is 0.49%: two decimals, or it would read as 0.5%.
    expect(header.textContent).toContain("0.49%");
    // Against 335 of 74,930 (0.45%).
    expect(header.textContent).toContain("0.04 pp");
    expect(screen.getAllByRole("img", { name: "Sessions remaining at each of 3 steps" }).length).toBe(1);
  });

  it("lists the steps while closed and names the biggest drop-off once open", () => {
    const closed = renderRow({ row: fullRow });
    expect(closed.getByTestId("funnel-row-header").textContent).toContain("Home");
    expect(closed.getByTestId("funnel-row-header").textContent).toContain("/signup");
    cleanup();

    renderRow({ row: fullRow, expanded: true });
    // 17,920 of the 84,210 reach Pricing (78.7% lost); 412 of those 17,920 sign up (97.7% lost).
    expect(screen.getByTestId("funnel-row-header").textContent).toContain(
      "biggest drop-off Pricing to /signup (97.7%)"
    );
  });

  it("draws dashes, not zeros, for a funnel with no figures", () => {
    renderRow();
    const header = screen.getByTestId("funnel-row-header");

    expect(header.textContent).toContain("—");
    expect(header.textContent).not.toContain("0%");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("toggles from the row and from its name", () => {
    const { onToggle } = renderRow({ row: fullRow });

    fireEvent.click(screen.getByTestId("funnel-row-header"));
    fireEvent.click(screen.getByRole("button", { name: "Signup" }));

    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Signup" }).getAttribute("aria-expanded")).toBe("false");
  });
});

describe("FunnelRow expanded", () => {
  it("draws the funnel from the summary without analyzing it again", () => {
    renderRow({ row: fullRow, expanded: true, comparisonLabel: "Aug 2 – Aug 31" });

    expect(screen.getByTestId("funnel-chart")).toBeTruthy();
    expect(mocks.funnel).toHaveBeenLastCalledWith(
      expect.objectContaining({
        steps: funnel.steps,
        metrics: fullRow.current,
        previous: fullRow.previous,
        comparisonLabel: "Aug 2 – Aug 31",
        goal: null,
      })
    );
    expect(mocks.useGetFunnel).toHaveBeenLastCalledWith(undefined);
  });

  it("links the last step to the goal that measures the same thing", () => {
    const goals: Goal[] = [
      {
        goalId: 3,
        name: "Signup page",
        goalType: "path",
        config: { pathPattern: "/signup" },
        createdAt: "2026-09-01T00:00:00Z",
        total_conversions: 0,
        total_sessions: 0,
        conversion_rate: 0,
      },
    ];
    renderRow({ row: fullRow, expanded: true, goals });

    expect(mocks.funnel).toHaveBeenLastCalledWith(
      expect.objectContaining({ goal: { name: "Signup page", href: links.goals } })
    );
  });

  it("analyzes a funnel the summary does not cover when it is opened", () => {
    mocks.useGetFunnel.mockReturnValue({
      data: [
        { step_number: 1, step_name: "Home", sessions: 50, conversion_rate: 100, dropoff_rate: 0 },
        { step_number: 2, step_name: "Pricing", sessions: 20, conversion_rate: 40, dropoff_rate: 60 },
        { step_number: 3, step_name: "/signup", sessions: 5, conversion_rate: 10, dropoff_rate: 75 },
      ],
      isError: false,
      error: null,
      isLoading: false,
    });
    renderRow({ expanded: true });

    expect(mocks.useGetFunnel).toHaveBeenLastCalledWith({ steps: funnel.steps });
    expect(mocks.funnel).toHaveBeenLastCalledWith(
      expect.objectContaining({ metrics: expect.objectContaining({ entered: 50, converted: 5, conversion: 0.1 }) })
    );
  });

  it("waits for the summary before deciding to analyze", () => {
    renderRow({ expanded: true, isLoading: true });

    expect(mocks.useGetFunnel).toHaveBeenLastCalledWith(undefined);
    expect(screen.queryByTestId("funnel-chart")).toBeNull();
  });

  it("says so when the analysis fails", () => {
    mocks.useGetFunnel.mockReturnValue({ data: undefined, isError: true, error: new Error("boom"), isLoading: false });
    renderRow({ expanded: true });

    expect(screen.getByText(/Error loading funnel:/).textContent).toContain("boom");
  });
});
