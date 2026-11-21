import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersResponse } from "@/api/analytics/endpoints";
import { ColumnSelection, visibleColumns } from "../columns";
import { TraitGroupRows, TraitGroupView } from "./TraitGroupRows";

const mocks = vi.hoisted(() => ({
  useGetUsersInfinite: vi.fn(),
  fetchNextPage: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    Object.entries(values ?? {}).reduce((text, [key, value]) => text.replace(`{${key}}`, value), message),
}));

vi.mock("@/api/analytics/hooks/useGetUsers", () => ({
  useGetUsersInfinite: mocks.useGetUsersInfinite,
}));

vi.mock("./UserRow", () => ({
  UserRow: ({ user, indented }: { user: UsersResponse; indented?: boolean }) => (
    <tr data-testid="user-row" data-indented={String(!!indented)}>
      <td>{user.identified_user_id}</td>
    </tr>
  ),
}));

const user = (id: string) => ({ identified_user_id: id, user_id: `device-${id}` }) as UsersResponse;

const group: TraitGroupView = {
  id: "value:Pro",
  label: "Pro",
  name: "Pro",
  stats: { users: 640, sessions: 9472, pageviews: 39168, events: 11008 },
  previousUsers: 570,
  shareLabel: "13.1% of identified",
  bar: 0.4,
  selector: { key: "plan", value: "Pro" },
};

const everything: ColumnSelection = {
  builtIn: ["last_seen", "sessions", "pageviews", "events", "source", "location", "device"],
  traits: ["company", "role"],
};

function renderGroup({
  view = group,
  open = false,
  selection = everything,
  onToggle = () => {},
}: {
  view?: TraitGroupView;
  open?: boolean;
  selection?: ColumnSelection;
  onToggle?: () => void;
} = {}) {
  return render(
    <table>
      <tbody>
        <TraitGroupRows
          group={view}
          open={open}
          onToggle={onToggle}
          columns={visibleColumns(selection)}
          narrowing={{ identifiedOnly: true, search: "ma", searchField: "name" }}
          sortBy="sessions"
          sortOrder="desc"
          site="1"
          privateKey={null}
        />
      </tbody>
    </table>
  );
}

const summaryCells = () => [...document.querySelectorAll("tr")[0].querySelectorAll("td")];

beforeEach(() => {
  mocks.fetchNextPage.mockClear();
  mocks.useGetUsersInfinite.mockReset();
  mocks.useGetUsersInfinite.mockReturnValue({
    data: { pages: [{ data: [user("a"), user("b")], totalCount: 640 }] },
    isError: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: mocks.fetchNextPage,
  });
});
afterEach(cleanup);

describe("TraitGroupRows", () => {
  it("summarises the group: users, change, share and per-user averages", () => {
    renderGroup();

    expect(screen.getByText("640 users")).toBeTruthy();
    expect(screen.getByText("+12.3%")).toBeTruthy();
    expect(screen.getByText("13.1% of identified")).toBeTruthy();
    // 9,472 / 640, 39,168 / 640, 11,008 / 640
    expect(
      summaryCells()
        .slice(1, 4)
        .map(cell => cell.textContent)
    ).toEqual(["14.8", "61.2", "17.2"]);
  });

  it("lines the averages up under the count columns", () => {
    renderGroup();

    // User, two traits and Last seen before the counts; source, location and device after.
    expect(summaryCells().map(cell => cell.colSpan)).toEqual([4, 1, 1, 1, 3]);
  });

  it("follows the chosen columns", () => {
    renderGroup({ selection: { builtIn: ["pageviews", "device"], traits: [] } });
    expect(summaryCells().map(cell => cell.colSpan)).toEqual([1, 1, 1]);
    expect(summaryCells()[1].textContent).toBe("61.2");
    cleanup();

    renderGroup({ selection: { builtIn: ["last_seen", "device"], traits: ["company"] } });
    expect(summaryCells().map(cell => cell.colSpan)).toEqual([4]);
    expect(screen.queryByText("Avg / user")).toBeNull();
  });

  it("asks for nobody while closed", () => {
    const onToggle = vi.fn();
    renderGroup({ onToggle });

    expect(mocks.useGetUsersInfinite).not.toHaveBeenCalled();
    expect(screen.queryAllByTestId("user-row")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Expand Pro" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("lists the group's users with the table's narrowing and sort when open", () => {
    renderGroup({ open: true });

    expect(mocks.useGetUsersInfinite).toHaveBeenCalledWith({
      identifiedOnly: true,
      search: "ma",
      searchField: "name",
      traitGroup: { key: "plan", value: "Pro" },
      pageSize: 10,
      sortBy: "sessions",
      sortOrder: "desc",
    });
    const rows = screen.getAllByTestId("user-row");
    expect(rows).toHaveLength(2);
    expect(rows.every(row => row.dataset.indented === "true")).toBe(true);
    expect(screen.getByRole("button", { name: "Collapse Pro" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("loads the next page on demand and says how many are left", () => {
    renderGroup({ open: true });

    expect(screen.getByText("638 left")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show 10 more" }));
    expect(mocks.fetchNextPage).toHaveBeenCalledOnce();
  });

  it("offers only what is left on the last page", () => {
    mocks.useGetUsersInfinite.mockReturnValue({
      data: { pages: [{ data: [user("a"), user("b")], totalCount: 5 }] },
      isError: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mocks.fetchNextPage,
    });
    renderGroup({ open: true });

    expect(screen.getByRole("button", { name: "Show 3 more" })).toBeTruthy();
    expect(screen.queryByText("3 left")).toBeNull();
  });

  it("says so when the group's users fail to load", () => {
    mocks.useGetUsersInfinite.mockReturnValue({ data: undefined, isError: true, hasNextPage: false });
    renderGroup({ open: true });

    expect(screen.getByText("Could not load these users. Try again in a moment.")).toBeTruthy();
  });

  it("cannot be opened when it has no list to show", () => {
    renderGroup({
      view: { ...group, id: "other", label: "12 other values", name: "12 other values", selector: null },
      open: true,
    });

    expect(screen.queryByRole("button")).toBeNull();
    expect(mocks.useGetUsersInfinite).not.toHaveBeenCalled();
  });

  it("draws no change without a comparison", () => {
    renderGroup({ view: { ...group, previousUsers: undefined } });
    expect(screen.queryByText(/%$/)).toBeNull();
  });
});
