import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersResponse } from "@/api/analytics/endpoints";
import { visibleColumns } from "../columns";
import { UserRow } from "./UserRow";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  addFilter: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    Object.entries(values ?? {}).reduce((text, [key, value]) => text.replace(`{${key}}`, value), message),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

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
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    // jsdom cannot navigate; following the link is the router's job, not what is under test.
    <a
      href={href}
      {...props}
      onClick={event => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/lib/store", () => ({
  addFilter: mocks.addFilter,
  getTimezone: () => "UTC",
}));

vi.mock("@/hooks/useDateTimeFormat", () => ({
  useDateTimeFormat: () => ({ formatRelative: () => "2 hours ago", formatDateTime: () => "Sep 30, 10:00 AM" }),
}));

vi.mock("@/components/Avatar", () => ({
  Avatar: () => <span data-testid="avatar" />,
  generateName: (id: string) => `Visitor ${id}`,
}));
vi.mock("@/components/Favicon", () => ({ Favicon: () => <span /> }));
vi.mock("../../components/shared/icons/CountryFlag", () => ({ CountryFlag: () => <span /> }));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
}));
vi.mock("@/components/TooltipIcons/TooltipIcons", () => ({
  BrowserTooltipIcon: ({ browser, onClick }: { browser: string; onClick: (event: React.MouseEvent) => void }) => (
    <button type="button" onClick={onClick}>
      {browser}
    </button>
  ),
  OperatingSystemTooltipIcon: () => <span />,
  DeviceTypeTooltipIcon: () => <span />,
}));
// Stands in for the badge's trait editor: a dialog rendered in a portal, the way Radix does.
vi.mock("@/components/IdentifiedBadge", () => ({
  IdentifiedBadge: () => createPortal(<button type="button">Save traits</button>, document.body),
}));

const base: UsersResponse = {
  user_id: "a1d7b800719f",
  identified_user_id: "",
  traits: null,
  country: "DE",
  region: "DE-BE",
  city: "Berlin",
  language: "en",
  browser: "Firefox",
  operating_system: "Linux",
  device_type: "Desktop",
  referrer: "",
  channel: "Organic Search",
  pageviews: 1234,
  events: 5,
  sessions: 3,
  last_seen: "2026-09-30 10:00:00",
  first_seen: "2026-09-01 10:00:00",
};
const identified: UsersResponse = {
  ...base,
  identified_user_id: "usr/42",
  traits: { name: "Mara Lindqvist", email: "mara@northpine.io", plan: "Pro", seats: 12 },
};

const columns = visibleColumns({
  builtIn: ["last_seen", "sessions", "pageviews", "events", "source", "location", "device"],
  traits: ["plan", "seats", "missing"],
});

const renderRow = (user: UsersResponse, privateKey: string | null = null) =>
  render(
    <table>
      <tbody>
        <UserRow user={user} columns={columns} site="7" privateKey={privateKey} />
      </tbody>
    </table>
  );

beforeEach(() => {
  mocks.push.mockClear();
  mocks.addFilter.mockClear();
});
afterEach(cleanup);

describe("UserRow", () => {
  it("shows an identified user by name with the email under it, and their traits", () => {
    renderRow(identified);

    expect(screen.getByRole("link", { name: "Mara Lindqvist" }).getAttribute("href")).toBe("/7/user/usr%2F42");
    expect(screen.getByText("mara@northpine.io")).toBeTruthy();
    expect(screen.getByText("Pro")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("1,234")).toBeTruthy();
  });

  it("shows an anonymous user by a generated name and a short id", () => {
    renderRow(base);

    expect(screen.getByRole("link").getAttribute("href")).toBe("/7/user/a1d7b800719f");
    expect(screen.getByText("Anonymous · a1d7b8")).toBeTruthy();
  });

  it("does not repeat the name on the second line when the email is the name", () => {
    renderRow({ ...identified, traits: { email: "mara@northpine.io" } });

    expect(screen.getAllByText("mara@northpine.io")).toHaveLength(1);
    expect(screen.getByText("usr/42")).toBeTruthy();
  });

  it("opens the profile from anywhere on the row", () => {
    renderRow(identified);

    fireEvent.click(screen.getByText("1,234"));
    expect(mocks.push).toHaveBeenCalledWith("/7/user/usr%2F42");
  });

  it("stays inside a private link", () => {
    renderRow(identified, "k3y");

    fireEvent.click(screen.getByText("1,234"));
    expect(mocks.push).toHaveBeenCalledWith("/7/k3y/user/usr%2F42");
    expect(screen.getByRole("link", { name: "Mara Lindqvist" }).getAttribute("href")).toBe("/7/k3y/user/usr%2F42");
  });

  it("leaves the name link to navigate on its own", () => {
    renderRow(identified);

    fireEvent.click(screen.getByRole("link", { name: "Mara Lindqvist" }));
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it.each([
    ["Berlin", { parameter: "country", value: ["DE"], type: "equals" }],
    ["Organic Search", { parameter: "channel", value: ["Organic Search"], type: "equals" }],
    ["Firefox", { parameter: "browser", value: ["Firefox"], type: "equals" }],
  ])("filters by %s without opening the profile", (text, filter) => {
    renderRow(identified);

    fireEvent.click(screen.getByText(text));
    expect(mocks.addFilter).toHaveBeenCalledWith(filter);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("ignores clicks that reach the row from a dialog it opened", () => {
    renderRow(identified);

    fireEvent.click(screen.getByRole("button", { name: "Save traits" }));
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("does not navigate when the click ends a text selection", () => {
    renderRow(identified);
    const selection = vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "Mara" } as Selection);

    fireEvent.click(screen.getByText("1,234"));
    expect(mocks.push).not.toHaveBeenCalled();
    selection.mockRestore();
  });
});
