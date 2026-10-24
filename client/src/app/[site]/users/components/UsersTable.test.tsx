import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/lib/store";

type ListState = {
  data?: { data: never[]; totalCount: number };
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
};

const mocks = vi.hoisted(() => ({
  // The users query's state for each page; the table asks for one page at a time.
  pages: {} as Record<number, ListState>,
  requestedPage: 0,
  onPageChange: (_page: number) => {},
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@/api/analytics/hooks/useGetUsers", () => ({
  useGetUsers: ({ page }: { page: number }) => {
    mocks.requestedPage = page;
    return { ...mocks.pages[page], refetch: () => {} };
  },
}));
vi.mock("@/api/analytics/hooks/useGetUserTraits", () => ({
  useGetUserTraitKeys: () => ({ data: { keys: [] }, isError: false }),
  useGetUserTraitBreakdown: () => ({ data: undefined, isError: false, refetch: () => {} }),
}));
vi.mock("@/components/pagination", () => ({
  Pagination: ({ onPageChange }: { onPageChange: (page: number) => void }) => {
    mocks.onPageChange = onPageChange;
    return null;
  },
}));
vi.mock("./ColumnPicker", () => ({ ColumnPicker: () => null }));
vi.mock("./UserRow", () => ({ UserRow: () => null }));

import { UsersTable } from "./UsersTable";

const settled = (totalCount: number): ListState => ({
  data: { data: [], totalCount },
  isFetching: false,
  isPlaceholderData: false,
  isError: false,
});

const table = <UsersTable breakdown={null} narrowing={{}} ready comparisonEnabled={false} />;

beforeEach(() => {
  useStore.setState({ site: "1", filters: [] });
});
afterEach(cleanup);

describe("UsersTable pagination", () => {
  it("does not step back on a cached total while the page it was asked for is refetching", () => {
    // 50 users a page. Page 3 was last seen when the period had 100 users; it has 150 now.
    mocks.pages = { 1: settled(150), 3: { ...settled(100), isFetching: true } };
    const view = render(table);
    act(() => mocks.onPageChange(3));
    expect(mocks.requestedPage).toBe(3);

    mocks.pages[3] = settled(150);
    view.rerender(table);
    expect(mocks.requestedPage).toBe(3);
  });

  it("steps back to the last page with rows once the list has settled smaller", () => {
    mocks.pages = { 1: settled(150), 2: settled(100), 3: settled(100) };
    render(table);
    act(() => mocks.onPageChange(3));
    expect(mocks.requestedPage).toBe(2);
  });

  it("starts every scope on page one, including one returned to", () => {
    mocks.pages = { 1: settled(500), 4: settled(500) };
    render(table);
    act(() => mocks.onPageChange(4));
    expect(mocks.requestedPage).toBe(4);

    const chrome = { parameter: "browser" as const, type: "equals" as const, value: ["Chrome"] };
    act(() => useStore.setState({ filters: [chrome] }));
    expect(mocks.requestedPage).toBe(1);
    act(() => useStore.setState({ filters: [] }));
    expect(mocks.requestedPage).toBe(1);
  });
});
