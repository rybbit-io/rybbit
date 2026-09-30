import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserJourneys } from "./UserJourneys";

const mocks = vi.hoisted(() => ({
  site: undefined as { siteId: number; domain: string } | undefined,
  placeholder: false,
  sankey: vi.fn(() => <div data-testid="journeys-diagram" />),
}));
vi.mock("next-intl", () => ({ useExtracted: () => (text: string) => text }));
vi.mock("@/api/admin/hooks/useSites", () => ({ useGetSite: () => ({ data: mocks.site, isLoading: false }) }));
vi.mock("@/api/analytics/hooks/useGetJourneys", () => ({
  useJourneys: () => ({
    data: { journeys: [{}] },
    isLoading: false,
    isFetching: mocks.placeholder,
    isPlaceholderData: mocks.placeholder,
  }),
}));
vi.mock("@/lib/store", () => ({ useStore: () => ({ time: { mode: "day", day: "2026-09-01" } }) }));
vi.mock("../../../journeys/components/SankeyDiagram", () => ({ SankeyDiagram: mocks.sankey }));

beforeEach(() => {
  mocks.site = { siteId: 7, domain: "example.com" };
  mocks.placeholder = false;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("UserJourneys loading states", () => {
  it("hides the previous diagram until changed controls receive fresh results", () => {
    const { rerender } = render(<UserJourneys userId="visitor" />);
    expect(screen.getByTestId("journeys-diagram")).toBeTruthy();
    mocks.placeholder = true;
    rerender(<UserJourneys userId="visitor" />);
    expect(screen.queryByTestId("journeys-diagram")).toBeNull();
    expect(screen.queryByText("No journeys in this range")).toBeNull();
    mocks.placeholder = false;
    rerender(<UserJourneys userId="visitor" />);
    expect(screen.getByTestId("journeys-diagram")).toBeTruthy();
  });
  it("waits for site metadata before showing an empty state", () => {
    mocks.site = undefined;
    render(<UserJourneys userId="visitor" />);
    expect(screen.queryByText("No journeys in this range")).toBeNull();
    expect(screen.queryByTestId("journeys-diagram")).toBeNull();
  });
});
