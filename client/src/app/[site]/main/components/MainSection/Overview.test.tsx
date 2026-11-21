import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { Overview } from "./Overview";

// Drives the real query layer (keys, placeholder data, refetches) with only the network mocked, so the
// flash rules are checked against React Query's actual flag sequence.

const BASE = {
  users: 100,
  sessions: 150,
  pageviews: 400,
  pages_per_session: 2.7,
  bounce_rate: 41.2,
  session_duration: 95,
};

const api = vi.hoisted(() => ({ overview: {} as Record<string, number> | Error }));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@number-flow/react", () => ({ default: ({ value }: { value: number }) => <span>{value}</span> }));
vi.mock("./SparklinesChart", () => ({ SparklinesChart: () => null }));
vi.mock("@/api/utils", async importOriginal => ({
  ...(await importOriginal<typeof import("@/api/utils")>()),
  authedFetch: vi.fn(async (url: string) => {
    if (url.endsWith("/overview/time-series")) return { data: [] };
    if (api.overview instanceof Error) throw api.overview;
    return { data: { ...api.overview } };
  }),
}));

function renderOverview() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <Overview />
      </TooltipProvider>
    </QueryClientProvider>
  );
  return client;
}

// The ValueFlash wrapper of a tile, found from the tile's title.
const mark = (title: string) => screen.getByText(title).nextElementSibling!.firstElementChild as HTMLElement;
const flashing = (title: string) => /text-(accent|red)-600/.test(mark(title).className);

beforeEach(() => {
  api.overview = { ...BASE };
  useStore.setState({
    site: "1",
    time: { mode: "day", day: "2026-09-28" },
    previousTime: null,
    bucket: "hour",
    filters: [],
    selectedStat: "users",
    timezone: "UTC",
  });
});

afterEach(() => {
  cleanup();
});

describe("Overview stat tiles", () => {
  it("don't flash on first paint, and flash only the number a background refetch moved", async () => {
    const client = renderOverview();
    await screen.findByText("100");
    expect(flashing("Unique Users")).toBe(false);

    api.overview = { ...BASE, users: 120 };
    await act(() => client.refetchQueries());
    await screen.findByText("120");

    expect(mark("Unique Users").className).toContain("text-accent-600");
    expect(mark("Unique Users").querySelector("[data-slot='value-flash-glyph'][aria-hidden='true']")).not.toBeNull();
    expect(flashing("Sessions")).toBe(false);
  });

  it("tint a rising bounce rate red", async () => {
    const client = renderOverview();
    await screen.findByText("100");

    api.overview = { ...BASE, bounce_rate: 55 };
    await act(() => client.refetchQueries());
    await screen.findByText("55");

    expect(mark("Bounce Rate").className).toContain("text-red-600");
  });

  it("don't flash when the user asks a different question (date range)", async () => {
    renderOverview();
    await screen.findByText("100");

    api.overview = { ...BASE, users: 500 };
    act(() => useStore.setState({ time: { mode: "day", day: "2026-09-27" } }));
    await screen.findByText("500");

    expect(flashing("Unique Users")).toBe(false);
  });

  it("don't flash when a filter changes", async () => {
    renderOverview();
    await screen.findByText("100");

    api.overview = { ...BASE, users: 40 };
    act(() => useStore.setState({ filters: [{ parameter: "browser", type: "equals", value: ["Firefox"] }] }));
    await screen.findByText("40");

    expect(flashing("Unique Users")).toBe(false);
  });
});

describe("Overview on a new site's first pageview", () => {
  const TILES = ["Unique Users", "Sessions", "Pageviews", "Pages per Session", "Bounce Rate", "Session Duration"];
  const EMPTY = { users: 0, sessions: 0, pageviews: 0, pages_per_session: 0, bounce_rate: 0, session_duration: 0 };
  const FIRST = { users: 1, sessions: 1, pageviews: 1, pages_per_session: 1, bounce_rate: 100, session_duration: 0 };

  it("fills the tiles without flashing, then flashes later changes as usual", async () => {
    api.overview = { ...EMPTY };
    const client = renderOverview();
    await screen.findAllByText("0");

    // The arrival: the first-pageview card invalidates the site's queries, refetching this same one.
    api.overview = { ...FIRST };
    await act(() => client.invalidateQueries());
    await screen.findByText("100");
    for (const title of TILES) expect(flashing(title)).toBe(false);

    // From then on a background refetch that moves a number flashes it, bounce rate included.
    api.overview = { ...FIRST, users: 2, sessions: 2, pageviews: 3, pages_per_session: 1.5, bounce_rate: 50 };
    await act(() => client.refetchQueries());
    await screen.findByText("50");
    expect(mark("Unique Users").className).toContain("text-accent-600");
    expect(mark("Bounce Rate").className).toContain("text-accent-600");
  });
});

describe("Overview load failure", () => {
  it("says so instead of rendering a row of zeros, and recovers on retry", async () => {
    api.overview = new Error("Timeout exceeded: elapsed 30 seconds");
    renderOverview();

    await screen.findByText("Failed to load stats");
    expect(screen.getByText("Timeout exceeded: elapsed 30 seconds")).toBeTruthy();
    expect(screen.queryByText("Unique Users")).toBeNull();
    expect(screen.queryByText("0")).toBeNull();

    api.overview = { ...BASE };
    fireEvent.click(screen.getByRole("button", { name: /Try Again/ }));
    await screen.findByText("100");
    expect(flashing("Unique Users")).toBe(false);
  });
});
