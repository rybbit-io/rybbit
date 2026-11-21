import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MouseEvent, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JourneyRow, pathKey } from "./journeyUtils";
import { TopPaths, TopPathsProps } from "./TopPaths";

const mocks = vi.hoisted(() => ({ replayAvailable: true }));

vi.mock("next-intl", () => ({
  useExtracted:
    () =>
    (message: string, values: Record<string, string> = {}) =>
      message.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? ""),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch,
    onClick,
    ...props
  }: {
    href: string;
    children: ReactNode;
    prefetch?: boolean;
    onClick?: (event: MouseEvent) => void;
  }) => (
    // jsdom cannot navigate; following the link is the router's job, not what is under test.
    <a
      href={href}
      {...props}
      onClick={event => {
        onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
}));
vi.mock("@/hooks/useReplayAvailable", () => ({ useReplayAvailable: () => mocks.replayAvailable }));
vi.mock("@/hooks/usePermissions", () => ({ useCanOnSite: () => true }));
vi.mock("@/app/[site]/components/SubHeader/Filters/SegmentDialog", () => ({ SegmentDialog: () => null }));

const journey = (path: string[], count: number, conversions?: number): JourneyRow => ({
  path,
  count,
  percentage: count / 100,
  conversions,
});
const JOURNEYS = [
  journey(["/", "/pricing"], 3290, 0),
  journey(["/", "/demo"], 3180, 0),
  journey(["/", "/pricing", "/signup"], 1290, 1290),
  journey(["/docs", "/docs/script", "/signup"], 640, 80),
];

const handlers = { openSessions: vi.fn(), saveAsFunnel: vi.fn() };
const onPin = vi.fn();

const renderTable = (props: Partial<TopPathsProps> = {}) =>
  render(
    <TopPaths
      journeys={JOURNEYS}
      isLoading={false}
      steps={4}
      previousCounts={null}
      goalName="Signup"
      pinnedKey={null}
      onPin={onPin}
      pageHref={page => `/1/pages?page=${page}`}
      handlers={handlers}
      {...props}
    />
  );

const rows = () => screen.getAllByRole("row").slice(1);
const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map(cell => cell.textContent);

beforeEach(() => {
  mocks.replayAvailable = true;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TopPaths", () => {
  it("lists each path with its sessions, share and goal reach", () => {
    renderTable();

    expect(rows()).toHaveLength(4);
    expect(cells(rows()[0]).slice(0, 5)).toEqual(["1", "//pricing", "3,290", "32.9%", "0%"]);
    expect(cells(rows()[2])[4]).toBe("100%1,290");
    expect(cells(rows()[3])[4]).toBe("12.5%80");
    expect(screen.getByText("Showing 4 of 4 paths")).toBeTruthy();
  });

  it("leaves the change column out until the comparison period is known", () => {
    renderTable();
    expect(screen.queryByText("vs prev.")).toBeNull();
  });

  it("shows each path's change, and a dash for one the comparison period did not rank", () => {
    renderTable({
      previousCounts: new Map([
        [pathKey(["/", "/pricing"]), 2632],
        [pathKey(["/", "/demo"]), 3975],
      ]),
    });

    expect(screen.getByText("vs prev.")).toBeTruthy();
    expect(cells(rows()[0])[4]).toContain("25.0%");
    expect(within(rows()[0]).getByText("+25.0%")).toBeTruthy();
    expect(within(rows()[1]).getByText("-20.0%")).toBeTruthy();
    expect(cells(rows()[2])[4]).toBe("—");
  });

  it("leaves the goal column and filter out without a goal", () => {
    renderTable({ goalName: null });

    expect(screen.queryByText("Reach Signup")).toBeNull();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(cells(rows()[0])).toHaveLength(5);
  });

  it("filters to the paths that reach the goal, or never do", () => {
    renderTable();

    fireEvent.click(screen.getByRole("radio", { name: "Reach Signup" }));
    expect(rows().map(row => cells(row)[0])).toEqual(["3", "4"]);
    expect(screen.getByText("Showing 2 of 4 paths")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "Never reach it" }));
    expect(rows().map(row => cells(row)[0])).toEqual(["1", "2"]);
  });

  it("filters by a page, keeping each row's rank", () => {
    renderTable();
    const search = screen.getByLabelText("Filter paths by page");

    fireEvent.change(search, { target: { value: "/docs/**" } });
    expect(rows().map(row => cells(row)[0])).toEqual(["4"]);

    fireEvent.change(search, { target: { value: "nothing-like-this" } });
    expect(screen.getByText("No paths match this filter.")).toBeTruthy();
  });

  it("shows twelve rows until asked for all", () => {
    const many = Array.from({ length: 15 }, (_, index) => journey(["/", `/page-${index}`], 100 - index, 0));
    renderTable({ journeys: many });

    expect(rows()).toHaveLength(12);
    expect(screen.getByText("Showing 12 of 15 paths")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(rows()).toHaveLength(15);
    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(rows()).toHaveLength(12);
  });

  it("pins a row on click and from the keyboard, and marks the pinned row", () => {
    renderTable({ pinnedKey: pathKey(["/", "/demo"]) });

    fireEvent.click(rows()[0]);
    expect(onPin).toHaveBeenLastCalledWith(["/", "/pricing"]);
    fireEvent.keyDown(rows()[2], { key: "Enter" });
    expect(onPin).toHaveBeenLastCalledWith(["/", "/pricing", "/signup"]);

    expect(rows()[1].getAttribute("aria-selected")).toBe("true");
    expect(rows()[0].getAttribute("aria-selected")).toBe("false");
    // The pinned row spells its actions out.
    expect(within(rows()[1]).getByRole("button", { name: "Sessions" }).textContent).toBe("Sessions");
    expect(within(rows()[0]).getByRole("button", { name: "Sessions" }).textContent).toBe("");
  });

  it("opens a path's sessions, replays and funnel without pinning the row", () => {
    renderTable();
    const row = within(rows()[2]);

    fireEvent.click(row.getByRole("button", { name: "Sessions" }));
    expect(handlers.openSessions).toHaveBeenLastCalledWith(["/", "/pricing", "/signup"], false);
    fireEvent.click(row.getByRole("button", { name: "Replays" }));
    expect(handlers.openSessions).toHaveBeenLastCalledWith(["/", "/pricing", "/signup"], true);
    fireEvent.click(row.getByRole("button", { name: "Save as funnel" }));
    expect(handlers.saveAsFunnel).toHaveBeenCalledWith(["/", "/pricing", "/signup"]);
    fireEvent.click(row.getAllByRole("link")[0]);

    expect(onPin).not.toHaveBeenCalled();
  });

  it("offers no replays without replay, and no funnel to a viewer who cannot create one", () => {
    mocks.replayAvailable = false;
    renderTable({ handlers: { openSessions: handlers.openSessions } });

    expect(screen.queryByRole("button", { name: "Replays" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save as funnel" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Sessions" })).toHaveLength(4);
  });

  it("links each page of a path", () => {
    renderTable();

    const links = within(rows()[0]).getAllByRole("link");
    expect(links.map(link => link.getAttribute("href"))).toEqual(["/1/pages?page=/", "/1/pages?page=/pricing"]);
  });

  it("shows placeholders while loading", () => {
    renderTable({ isLoading: true, journeys: [] });

    expect(screen.queryByText("No paths in this range.")).toBeNull();
    expect(rows()).toHaveLength(6);
  });
});
