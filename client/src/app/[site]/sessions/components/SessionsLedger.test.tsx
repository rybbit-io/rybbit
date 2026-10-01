import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GetSessionsResponse, SessionViewCounts } from "@/api/analytics/endpoints";
import { useStore } from "@/lib/store";
import { SessionsLedger, SessionsLedgerProps } from "./SessionsLedger";

const mocks = vi.hoisted(() => ({
  canWriteSegments: true,
  segmentDialog: vi.fn(),
}));

// Enough of ICU for the messages under test: {name} and one/other plurals.
const format = (message: string, values: Record<string, string | number> = {}) =>
  message
    .replace(/\{(\w+), plural, one \{([^}]*)\} other \{([^}]*)\}\}/g, (_, key, one, other) =>
      (Number(values[key]) === 1 ? one : other).replace("#", String(values[key]))
    )
    .replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

vi.mock("next-intl", () => ({
  useExtracted: () => format,
  useLocale: () => "en-US",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/usePermissions", () => ({
  useCanOnSite: () => mocks.canWriteSegments,
}));

vi.mock("../../components/SubHeader/Filters/SegmentDialog", () => ({
  SegmentDialog: (props: { open: boolean }) => {
    mocks.segmentDialog(props);
    return props.open ? <div role="dialog" /> : null;
  },
}));

// The row is covered by its own pieces; here it only has to say which session it is.
vi.mock("./SessionLedgerRow", async importOriginal => ({
  ...(await importOriginal<typeof import("./SessionLedgerRow")>()),
  SessionLedgerRow: ({ session, groupedByDay }: { session: { session_id: string }; groupedByDay: boolean }) => (
    <div data-testid="row" data-grouped={String(groupedByDay)}>
      {session.session_id}
    </div>
  ),
}));

const session = (session_id: string, session_start: string) =>
  ({ session_id, session_start }) as GetSessionsResponse[number];

const sessions = [
  session("a", "2026-09-30 14:00:00"),
  session("b", "2026-09-30 09:00:00"),
  session("c", "2026-09-29 22:00:00"),
  session("d", "2026-09-27 08:00:00"),
];

const counts: SessionViewCounts = { all: 137, identified: 43, replay: 50, converted: 36, bounced: 42, errors: 1 };

const handlers = () => ({
  onViewChange: vi.fn(),
  onSortChange: vi.fn(),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
});

const renderLedger = (props: Partial<SessionsLedgerProps> = {}) => {
  const callbacks = handlers();
  render(
    <SessionsLedger
      sessions={sessions}
      isLoading={false}
      isRefreshing={false}
      isError={false}
      view="all"
      counts={counts}
      dayCounts={
        new Map([
          ["2026-09-30", 30],
          ["2026-09-29", 1],
        ])
      }
      showReplay
      narrowed={false}
      sort={{ by: "started", order: "desc" }}
      page={1}
      pageSize={20}
      {...callbacks}
      {...props}
    />
  );
  return callbacks;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-30T18:00:00Z"));
  mocks.canWriteSegments = true;
  mocks.segmentDialog.mockClear();
  useStore.setState({ site: "5", privateKey: null, timezone: "UTC", filters: [] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SessionsLedger views", () => {
  it("offers every view with its count", () => {
    renderLedger();

    expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual([
      "All137",
      "Identified43",
      "Has replay50",
      "Converted36",
      "Bounced42",
      "With errors1",
    ]);
    expect(screen.getByRole("tab", { name: /^All/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("has no Converted view or Goal column on a site without goals", () => {
    renderLedger({ counts: { ...counts, converted: null } });

    expect(screen.queryByRole("tab", { name: /Converted/ })).toBeNull();
    expect(screen.queryByText("Goal")).toBeNull();
  });

  it("has no Has replay view on a site without a Replay page", () => {
    renderLedger({ showReplay: false });

    expect(screen.queryByRole("tab", { name: /Has replay/ })).toBeNull();
  });

  it("shows the views without counts until the summary arrives", () => {
    renderLedger({ counts: undefined });

    expect(screen.getByRole("tab", { name: "Bounced" })).toBeTruthy();
    // Unknown yet whether the site has goals, so the column is not taken away.
    expect(screen.getByText("Goal")).toBeTruthy();
  });

  it("reports the view that was picked", () => {
    const { onViewChange } = renderLedger();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /With errors/ }), { button: 0 });

    expect(onViewChange).toHaveBeenCalledWith("errors");
  });
});

describe("SessionsLedger rows", () => {
  it("groups rows under day headings with each day's total while in start order", () => {
    renderLedger();

    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("30 sessions so far")).toBeTruthy();
    expect(screen.getByText("Yesterday")).toBeTruthy();
    // One session, and a past day is not "so far".
    expect(screen.getByText("1 session")).toBeTruthy();
    // A day the summary has no count for still gets its heading.
    expect(screen.getByText("Sun, Sep 27")).toBeTruthy();

    expect(screen.getAllByTestId("row").map(row => row.textContent)).toEqual(["a", "b", "c", "d"]);
    expect(screen.getAllByTestId("row").every(row => row.dataset.grouped === "true")).toBe(true);
  });

  it("drops the day headings when sorted by anything but the start", () => {
    renderLedger({ sort: { by: "duration", order: "desc" } });

    expect(screen.queryByText("Today")).toBeNull();
    expect(screen.getAllByTestId("row").every(row => row.dataset.grouped === "false")).toBe(true);
  });

  it("sketches rows while loading", () => {
    renderLedger({ isLoading: true, sessions: [] });

    expect(screen.queryAllByTestId("row")).toHaveLength(0);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(20);
    expect(screen.queryByText("No sessions found")).toBeNull();
  });

  it("says so when the request failed, instead of claiming there are no sessions", () => {
    renderLedger({ isError: true, sessions: [] });

    expect(screen.getByText("Sessions could not be loaded. Please try again.")).toBeTruthy();
    expect(screen.queryByText("No sessions found")).toBeNull();
  });

  it("suggests the next step that fits an empty list", () => {
    renderLedger({ sessions: [] });
    expect(screen.getByText("Try a different date range or filter")).toBeTruthy();
    cleanup();

    renderLedger({ sessions: [], narrowed: true });
    expect(screen.getByText("Nothing matches this view. Try another view or a wider range.")).toBeTruthy();
    cleanup();

    renderLedger({ sessions: [], view: "identified" });
    expect(screen.getByRole("link", { name: "Learn how to identify users" })).toBeTruthy();
  });
});

describe("SessionsLedger sorting", () => {
  const header = (name: string) => screen.getByRole("button", { name });

  it("marks the sorted column", () => {
    renderLedger();

    expect(header("Started").getAttribute("aria-pressed")).toBe("true");
    expect(header("Duration").getAttribute("aria-pressed")).toBe("false");
  });

  it("starts a new column at its highest and flips the active one", () => {
    const { onSortChange } = renderLedger({ sort: { by: "duration", order: "desc" } });

    fireEvent.click(header("Pages"));
    expect(onSortChange).toHaveBeenLastCalledWith({ by: "pageviews", order: "desc" });

    fireEvent.click(header("Duration"));
    expect(onSortChange).toHaveBeenLastCalledWith({ by: "duration", order: "asc" });
  });

  it("flips back from ascending", () => {
    const { onSortChange } = renderLedger({ sort: { by: "events", order: "asc" } });

    fireEvent.click(header("Events"));
    expect(onSortChange).toHaveBeenLastCalledWith({ by: "events", order: "desc" });
  });
});

describe("SessionsLedger paging", () => {
  it("pages over the current view's total", () => {
    const { onPageChange } = renderLedger({ view: "identified", page: 2 });

    expect(screen.getByText("Showing 21 to 40 of 43 sessions")).toBeTruthy();
    expect(screen.getByLabelText("Page 2 of 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("stops at the last page", () => {
    renderLedger({ view: "identified", page: 3 });

    expect(screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(true);
  });

  it("pages open-ended until the total is known", () => {
    renderLedger({ counts: undefined, pageSize: 4 });
    // A full page may have more behind it.
    expect(screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(false);
    cleanup();

    renderLedger({ counts: undefined, pageSize: 20 });
    expect(screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(true);
  });

  it("has no pager on an empty first page but keeps the way back from an empty later one", () => {
    renderLedger({ sessions: [] });
    expect(screen.queryByRole("button", { name: "Previous page" })).toBeNull();
    cleanup();

    renderLedger({ sessions: [], page: 3 });
    expect(screen.getByRole("button", { name: "Previous page" }).hasAttribute("disabled")).toBe(false);
  });
});

describe("Save as segment", () => {
  it("opens the segment dialog with the page's filters, without applying the new segment", () => {
    useStore.setState({
      filters: [
        { parameter: "country", type: "equals", value: ["US"] },
        // Not a Sessions filter, so the list ignores it and the segment leaves it out.
        { parameter: "feature_flag:beta", type: "equals", value: ["on"] },
      ],
    });
    renderLedger();

    fireEvent.click(screen.getByRole("button", { name: "Save as segment" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(mocks.segmentDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        siteId: "5",
        applyOnCreate: false,
        initialFilters: [{ parameter: "country", type: "equals", value: ["US"] }],
      })
    );
  });

  it("is not offered to someone who cannot write segments, or on a private link", () => {
    mocks.canWriteSegments = false;
    renderLedger();
    expect(screen.queryByRole("button", { name: "Save as segment" })).toBeNull();
    cleanup();

    mocks.canWriteSegments = true;
    useStore.setState({ privateKey: "abcdef123456" });
    renderLedger();
    expect(screen.queryByRole("button", { name: "Save as segment" })).toBeNull();
    expect(within(document.body).queryByRole("dialog")).toBeNull();
  });
});
