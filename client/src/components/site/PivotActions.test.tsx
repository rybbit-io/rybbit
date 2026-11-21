import { Filter } from "@rybbit/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPARISON } from "@/components/DateSelector/types";
import { analyticsParsers } from "@/lib/parsers";
import { useStore } from "@/lib/store";
import { PivotActions, PivotButton } from "./PivotActions";

const mocks = vi.hoisted(() => ({
  search: "",
  replayAvailable: true,
  canWriteSegments: true,
  segmentDialog: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string) => message,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, prefetch, ...props }: { href: string; children: ReactNode; prefetch?: boolean }) => (
    // jsdom cannot navigate; following the link is the router's job, not what is under test.
    <a href={href} data-prefetch={String(prefetch)} {...props} onClick={event => event.preventDefault()}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useReplayAvailable", () => ({
  useReplayAvailable: () => mocks.replayAvailable,
}));

vi.mock("@/hooks/usePermissions", () => ({
  useCanOnSite: () => mocks.canWriteSegments,
}));

vi.mock("@/app/[site]/components/SubHeader/Filters/SegmentDialog", () => ({
  SegmentDialog: (props: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    mocks.segmentDialog(props);
    return props.open ? (
      <div role="dialog">
        <input aria-label="Name" />
        <button type="button" onClick={() => props.onOpenChange(false)}>
          Close
        </button>
      </div>
    ) : null;
  },
}));

const country: Filter = { parameter: "country", type: "equals", value: ["US"] };
const pricing: Filter = { parameter: "pathname", type: "equals", value: ["/pricing"] };
const signup: Filter = { parameter: "event_name", type: "equals", value: ["signup"] };

beforeEach(() => {
  mocks.search = "";
  mocks.replayAvailable = true;
  mocks.canWriteSegments = true;
  useStore.setState({ site: "42", privateKey: null, timezone: "UTC", filters: [country], segmentId: null });
  useStore.getState().setComparison(DEFAULT_COMPARISON);
  useStore.getState().setTime({ mode: "range", startDate: "2026-09-01", endDate: "2026-09-30" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const link = (name: string) => screen.getByRole("link", { name }) as HTMLAnchorElement;
const filtersOf = (anchor: HTMLAnchorElement) =>
  analyticsParsers.filters.parse(new URL(anchor.href).searchParams.get("filters") ?? "[]");

describe("PivotActions", () => {
  it("links to Sessions, Users and Replays by default, without Save segment", () => {
    render(<PivotActions filters={[pricing]} />);

    expect(screen.getAllByRole("link").map(anchor => anchor.textContent)).toEqual(["Sessions", "Users", "Replays"]);
    expect(screen.queryByRole("button", { name: "Save segment" })).toBeNull();
  });

  it("carries the current filters narrowed by the row's, and the current period", () => {
    render(<PivotActions filters={[pricing]} />);
    const sessions = link("Sessions");
    const url = new URL(sessions.href);

    expect(url.pathname).toBe("/42/sessions");
    expect(filtersOf(sessions)).toEqual([country, pricing]);
    expect(url.searchParams.get("startDate")).toBe("2026-09-01");
    expect(url.searchParams.get("endDate")).toBe("2026-09-30");
    expect(new URL(link("Users").href).pathname).toBe("/42/users");
    expect(new URL(link("Replays").href).pathname).toBe("/42/replay");
  });

  it("links to the page's whole population when the row adds no filter", () => {
    render(<PivotActions />);

    expect(filtersOf(link("Sessions"))).toEqual([country]);
  });

  it("stays inside a private link and stays embedded", () => {
    useStore.setState({ privateKey: "abcdef123456" });
    mocks.search = "embed=true&tab=entry";
    render(<PivotActions filters={[pricing]} />);
    const url = new URL(link("Sessions").href);

    expect(url.pathname).toBe("/42/abcdef123456/sessions");
    expect(url.searchParams.get("embed")).toBe("true");
    expect(url.searchParams.has("tab")).toBe(false);
  });

  it("does not prefetch: a table draws one link per row and per target", () => {
    render(<PivotActions filters={[pricing]} />);

    expect(link("Sessions").dataset.prefetch).toBe("false");
  });

  it("leaves out a target that would drop the row's filter", () => {
    render(<PivotActions filters={[signup]} />);

    expect(screen.getAllByRole("link").map(anchor => anchor.textContent)).toEqual(["Sessions", "Replays"]);
  });

  it("leaves Replays out on a site without replay", () => {
    mocks.replayAvailable = false;
    render(<PivotActions filters={[pricing]} />);

    expect(screen.getAllByRole("link").map(anchor => anchor.textContent)).toEqual(["Sessions", "Users"]);
  });

  it("hides Replays below the desktop breakpoint, like the sidebar", () => {
    render(<PivotActions filters={[pricing]} />);
    const classes = link("Replays").className.split(/\s+/);

    expect(classes).toContain("hidden");
    expect(classes).toContain("md:inline-flex");
    expect(classes).not.toContain("inline-flex");
  });

  it("offers only the actions asked for, in the order given", () => {
    render(<PivotActions filters={[pricing]} actions={["users", "sessions"]} />);

    expect(screen.getAllByRole("link").map(anchor => anchor.textContent)).toEqual(["Users", "Sessions"]);
  });

  it("keeps the label as the accessible name when only icons are drawn", () => {
    render(<PivotActions filters={[pricing]} actions={["sessions"]} showLabels={false} />);
    const sessions = link("Sessions");

    expect(sessions.textContent).toBe("");
    expect(sessions.getAttribute("title")).toBe("Sessions");
  });

  it("draws a page's own pivots after the standard ones", () => {
    render(
      <PivotActions filters={[pricing]} actions={["sessions"]}>
        <PivotButton icon={<svg />} label="Journeys" href="/42/journeys" />
      </PivotActions>
    );

    expect(screen.getAllByRole("link").map(anchor => anchor.textContent)).toEqual(["Sessions", "Journeys"]);
  });

  it("opens the segment dialog pre-filled with the current and the row's filters, without applying it", () => {
    render(<PivotActions filters={[pricing]} actions={["segment"]} />);

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save segment" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(mocks.segmentDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        siteId: "42",
        initialFilters: [country, pricing],
        applyOnCreate: false,
      })
    );
  });

  it("offers Save segment for any filter, since a segment is not tied to a page", () => {
    render(<PivotActions filters={[signup]} actions={["users", "segment"]} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "Save segment" })).toBeTruthy();
  });

  it("leaves Save segment out for a viewer who cannot write segments", () => {
    mocks.canWriteSegments = false;
    render(<PivotActions filters={[pricing]} actions={["sessions", "segment"]} />);

    expect(screen.queryByRole("button", { name: "Save segment" })).toBeNull();
    expect(link("Sessions")).toBeTruthy();
  });

  it("leaves Save segment out on a private link, which is read-only", () => {
    useStore.setState({ privateKey: "abcdef123456" });
    render(<PivotActions filters={[pricing]} actions={["segment"]} />);

    expect(screen.queryByRole("button", { name: "Save segment" })).toBeNull();
  });

  describe("inside a clickable row", () => {
    const onRowClick = vi.fn();
    const onRowKeyDown = vi.fn();
    const renderInRow = () =>
      render(
        <div role="button" tabIndex={0} onClick={onRowClick} onKeyDown={onRowKeyDown}>
          <PivotActions filters={[pricing]} actions={["sessions", "segment"]} />
        </div>
      );

    it("does not hand a click on a pivot to the row", () => {
      renderInRow();
      fireEvent.click(link("Sessions"));
      fireEvent.click(screen.getByRole("button", { name: "Save segment" }));

      expect(onRowClick).not.toHaveBeenCalled();
    });

    it("does not hand the row the keys that activate a pivot", () => {
      renderInRow();
      fireEvent.keyDown(link("Sessions"), { key: "Enter" });
      fireEvent.keyDown(screen.getByRole("button", { name: "Save segment" }), { key: " " });

      expect(onRowKeyDown).not.toHaveBeenCalled();
    });

    it("lets every other key through to the row and the page", () => {
      renderInRow();
      fireEvent.keyDown(link("Sessions"), { key: "ArrowDown" });

      expect(onRowKeyDown).toHaveBeenCalledTimes(1);
    });

    it("keeps clicks and typing inside the segment dialog away from the row", () => {
      renderInRow();
      fireEvent.click(screen.getByRole("button", { name: "Save segment" }));

      fireEvent.keyDown(screen.getByLabelText("Name"), { key: " " });
      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(onRowKeyDown).not.toHaveBeenCalled();
      expect(onRowClick).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
