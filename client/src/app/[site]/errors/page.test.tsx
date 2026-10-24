import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ErrorNameItem, ErrorNamesPaginatedResponse } from "@/api/analytics/endpoints";
import { useStore } from "@/lib/store";

type QueryState = {
  data?: ErrorNamesPaginatedResponse;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;
};

const mocks = vi.hoisted(() => ({
  query: {} as QueryState,
  page: 0,
  setPageIndex: (_index: number) => {},
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@/api/analytics/hooks/errors/useGetErrorNames", () => ({
  useGetErrorNamesPaginated: ({ page }: { page: number }) => {
    mocks.page = page;
    return mocks.query;
  },
}));
vi.mock("@/hooks/useSetPageTitle", () => ({ useSetPageTitle: () => {} }));
vi.mock("@/components/DisabledOverlay", () => ({
  DisabledOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/pagination", () => ({
  Pagination: ({ isLoading, table }: { isLoading?: boolean; table: { setPageIndex: (index: number) => void } }) => {
    mocks.setPageIndex = table.setPageIndex;
    return <div data-testid="pagination">{isLoading ? "pagination loading" : "pagination idle"}</div>;
  },
}));
vi.mock("../components/SubHeader/SubHeader", () => ({ SubHeader: () => null }));
vi.mock("./components/EnableErrorTracking", () => ({ EnableErrorTracking: () => null }));
vi.mock("./components/ErrorListSkeleton", () => ({ ErrorListSkeleton: () => <div data-testid="skeleton" /> }));
vi.mock("./components/ErrorListItem", () => ({
  ErrorListItem: ({ errorData }: { errorData: ErrorNameItem }) => <div data-testid="error-item">{errorData.value}</div>,
}));

import Errors from "./page";

const response = (values: string[]): ErrorNamesPaginatedResponse => ({
  data: values.map(value => ({ value, errorName: "TypeError", count: 3, sessionCount: 2, percentage: 50 })),
  totalCount: 25,
});

const settled: QueryState = {
  data: response(["a is undefined", "b is not a function"]),
  isLoading: false,
  isFetching: false,
  isPlaceholderData: false,
  isError: false,
  error: null,
};

// Load the first page, then switch the query into a refetch state.
function renderThenRefetch(refetch: Partial<QueryState>) {
  mocks.query = settled;
  const view = render(<Errors />);
  mocks.query = { ...settled, ...refetch };
  view.rerender(<Errors />);
  return view;
}

const list = () => screen.getAllByTestId("error-item")[0].parentElement!;

beforeEach(() => {
  useStore.setState({ site: "1" });
});
afterEach(cleanup);

describe("Errors page loading states", () => {
  it("shows the skeleton only while there is nothing to show yet", () => {
    mocks.query = { ...settled, data: undefined, isLoading: true, isFetching: true };
    render(<Errors />);
    expect(screen.getByTestId("skeleton")).toBeTruthy();
    expect(screen.queryAllByTestId("error-item")).toHaveLength(0);
  });

  it("keeps the previous list on screen, dimmed, while a new page or filter loads", () => {
    renderThenRefetch({ isFetching: true, isPlaceholderData: true });
    expect(screen.queryByTestId("skeleton")).toBeNull();
    expect(screen.getAllByTestId("error-item")).toHaveLength(2);
    expect(list().getAttribute("aria-busy")).toBe("true");
    expect(list().className).toContain("opacity-60");
    expect(screen.getByTestId("pagination").textContent).toBe("pagination loading");
  });

  it("leaves current data untouched during a background refetch", () => {
    renderThenRefetch({ isFetching: true });
    expect(screen.queryByTestId("skeleton")).toBeNull();
    expect(list().className).not.toContain("opacity-60");
    expect(screen.getByTestId("pagination").textContent).toBe("pagination idle");
  });

  it("keeps the empty state instead of blanking while an empty result refetches", () => {
    renderThenRefetch({ data: response([]), isFetching: true, isPlaceholderData: true });
    expect(screen.getByText("No error events found")).toBeTruthy();
  });
});

describe("Errors page pagination", () => {
  it("starts every scope on page one, including one returned to", () => {
    mocks.query = { ...settled, data: { ...response(["a is undefined"]), totalCount: 100 } };
    render(<Errors />);
    act(() => mocks.setPageIndex(3));
    expect(mocks.page).toBe(4);

    const chrome = { parameter: "browser" as const, type: "equals" as const, value: ["Chrome"] };
    act(() => useStore.setState({ filters: [chrome] }));
    expect(mocks.page).toBe(1);
    act(() => useStore.setState({ filters: [] }));
    expect(mocks.page).toBe(1);
  });
});
