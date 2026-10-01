import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserInfo } from "@/api/analytics/endpoints";
import type { UserSegments } from "@/api/analytics/endpoints/userProfile";

const mocks = vi.hoisted(() => ({
  segments: undefined as UserSegments | undefined,
  canEdit: false,
  href: vi.fn((route: string) => `/1/${route}`),
}));

vi.mock("next-intl", () => ({
  // Fill {placeholders} so assertions read like the rendered sentence.
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? `{${key}}`),
  useLocale: () => "en-US",
}));
vi.mock("@/lib/configs", () => ({ useConfigs: () => ({ configs: {} }) }));
vi.mock("@/hooks/usePermissions", () => ({ useCanOnSite: () => mocks.canEdit }));
vi.mock("@/components/EditTraitsDialog", () => ({ EditTraitsDialog: () => null }));
vi.mock("@/components/Favicon", () => ({ Favicon: () => null }));
vi.mock("@/api/analytics/hooks/useUserProfile", () => ({ useUserSegments: () => ({ data: mocks.segments }) }));
vi.mock("./UserLocationMap", () => ({ UserLocationMap: () => null }));
vi.mock("./profileLinks", async importOriginal => ({
  ...(await importOriginal<typeof import("./profileLinks")>()),
  useProfileHref: () => mocks.href,
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { UserSidebar } from "./UserSidebar";

const base = {
  identified_user_id: "usr_8f2kq1",
  user_id: "5be2c07f41d9",
  country: "SE",
  region: "SE-AB",
  city: "Stockholm",
  language: "sv",
  timezone: "Europe/Stockholm",
  device_type: "Desktop",
  browser: "Chrome",
  operating_system: "macOS",
  // The selected period's own first session: a later, different touch.
  first_seen: "2026-09-01 08:00:00",
  first_channel: "Direct",
  first_referrer: "",
  first_entry_page: "/login",
  last_channel: "Direct",
  traits: { name: "Mara Lindqvist", email: "mara@northpine.io", plan: "Pro", company: "Northpine" },
  linked_devices: [
    { anonymous_id: "5be2c07f41d9", created_at: "2026-08-14 09:12:00.123" },
    { anonymous_id: "c84a19e6d370", created_at: "2026-08-19T18:40:00.000Z" },
  ],
  vitals: { lcp_p75: 1420, cls_p75: 0.03, inp_p75: 96, fcp_p75: 880, ttfb_p75: 212, performance_events: 12 },
  locations: [],
  devices: [],
} as unknown as UserInfo;

const firstDay = {
  ...base,
  first_seen: "2026-08-12 10:15:00",
  first_channel: "Organic Search",
  first_referrer: "https://google.com/",
  first_entry_page: "/blog/google-analytics-alternatives",
} as UserInfo;

function showSidebar(props: Partial<Parameters<typeof UserSidebar>[0]> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <UserSidebar
          userId="usr_8f2kq1"
          data={base}
          isLoading={false}
          firstTouch={firstDay}
          isLoadingFirstTouch={false}
          getRegionName={() => "Stockholm County"}
          {...props}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const sectionTitles = () => screen.getAllByRole("heading", { level: 3 }).map(heading => heading.textContent);
const section = (title: string) => screen.getByRole("heading", { level: 3, name: title }).closest("section")!;

afterEach(() => {
  cleanup();
  mocks.segments = undefined;
  mocks.canEdit = false;
  mocks.href.mockClear();
});

describe("UserSidebar", () => {
  it("is one ledger with traits first and web vitals last", () => {
    showSidebar();

    expect(sectionTitles()).toEqual(["Traits", "Acquisition", "Location & device", "Linked devices", "Web vitals"]);
  });

  it("lists custom traits and leaves out the ones the header shows as identity", () => {
    showSidebar();

    const traits = within(section("Traits"));
    expect(traits.getByText("Pro")).toBeTruthy();
    expect(traits.getByText("Northpine")).toBeTruthy();
    expect(traits.queryByText("mara@northpine.io")).toBeNull();
  });

  it("draws the linked devices the API returns, with the day each was linked", () => {
    showSidebar();

    const linked = within(section("Linked devices"));
    expect(linked.getByText("5be2c07f41d9")).toBeTruthy();
    expect(linked.getByText("linked Aug 14")).toBeTruthy();
    expect(linked.getByText("c84a19e6d370")).toBeTruthy();
    expect(linked.getByText("linked Aug 19")).toBeTruthy();
  });

  it("takes first-touch facts from the user's first day, not from the selected period", () => {
    showSidebar();

    const acquisition = within(section("Acquisition"));
    expect(acquisition.getByText("Organic Search")).toBeTruthy();
    expect(acquisition.getByText("/blog/google-analytics-alternatives")).toBeTruthy();
    expect(acquisition.getByText(/Aug 12, 2026/)).toBeTruthy();
    expect(acquisition.queryByText("/login")).toBeNull();
    // The period's channel differs from the first one, so it is shown as the latest.
    expect(acquisition.getByText("Latest channel")).toBeTruthy();
  });

  it("does not present the period's first session as the day the user was first seen", () => {
    showSidebar({ firstTouch: undefined });

    const acquisition = within(section("Acquisition"));
    expect(acquisition.queryByText("First seen")).toBeNull();
    expect(acquisition.getByText("/login")).toBeTruthy();
  });

  it("lists the segments the user's sessions match, each linking to those sessions", () => {
    mocks.segments = {
      segments: [
        {
          segmentId: 4,
          name: "Docs readers",
          filters: [{ parameter: "pathname", type: "contains", value: ["/docs"] }],
          sessions: 34,
        },
      ],
      total_sessions: 42,
      truncated: false,
    };
    showSidebar();

    expect(sectionTitles().slice(0, 2)).toEqual(["Traits", "Segments"]);
    const segments = within(section("Segments"));
    expect(segments.getByText("34")).toBeTruthy();
    expect(segments.getByText("of 42")).toBeTruthy();
    expect(segments.getByRole("link", { name: /Docs readers/ }).getAttribute("href")).toBe("/1/sessions");
    expect(mocks.href).toHaveBeenCalledWith("sessions", [
      { parameter: "pathname", type: "contains", value: ["/docs"] },
      { parameter: "user_id", type: "equals", value: ["usr_8f2kq1"] },
    ]);
  });

  it("keeps a segment the Sessions list cannot filter by as plain text", () => {
    mocks.segments = {
      segments: [
        {
          segmentId: 9,
          name: "Stockholm time",
          filters: [{ parameter: "timezone", type: "equals", value: ["Europe/Stockholm"] }],
          sessions: 3,
        },
      ],
      total_sessions: 42,
      truncated: false,
    };
    showSidebar();

    const segments = within(section("Segments"));
    expect(segments.getByText("Stockholm time")).toBeTruthy();
    expect(segments.queryByRole("link")).toBeNull();
  });

  it("shows no traits or linked devices for an anonymous visitor", () => {
    showSidebar({ data: { ...base, identified_user_id: "", traits: null } as UserInfo });

    expect(sectionTitles()).toEqual(["Acquisition", "Location & device", "Web vitals"]);
  });

  it("offers trait editing only to someone who may write users", () => {
    showSidebar();
    expect(screen.queryByRole("button", { name: "Edit traits" })).toBeNull();
    cleanup();

    mocks.canEdit = true;
    showSidebar();
    expect(screen.getByRole("button", { name: "Edit traits" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add trait" })).toBeTruthy();
  });
});
