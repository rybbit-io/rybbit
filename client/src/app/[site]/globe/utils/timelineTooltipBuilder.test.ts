import { describe, expect, it, vi } from "vitest";

vi.mock("../3d/hooks/timelineLayer/timelineMarkerHelpers", () => ({
  renderCountryFlag: () => "",
  renderDeviceIcon: () => "",
  renderChannelIcon: () => "",
  getBrowserIconPath: () => "/browsers/x.svg",
  getOSIconPath: () => "/operating-systems/x.svg",
}));

import type { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import { escapeHtml } from "./escapeHtml";
import { buildTooltipHTML } from "./timelineTooltipBuilder";

const MARKUP = '<img src=x onerror=alert(1)>"';

function session(overrides: Partial<GetSessionsResponse[number]>): GetSessionsResponse[number] {
  return {
    session_id: "s1",
    user_id: "u1",
    country: "US",
    city: "Austin",
    browser: "Chrome",
    operating_system: "macOS",
    device_type: "Desktop",
    referrer: "",
    channel: "Direct",
    session_start: "2026-11-18 10:00:00",
    session_duration: 60,
    pageviews: 2,
    events: 1,
    ...overrides,
  } as GetSessionsResponse[number];
}

describe("escapeHtml", () => {
  it("escapes markup and both quote styles", () => {
    expect(escapeHtml(`<a href="x" title='y'>&`)).toBe("&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;");
  });

  it("renders null and undefined as empty, numbers as text", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(12)).toBe("12");
  });
});

describe("buildTooltipHTML", () => {
  // The tooltip is assigned with innerHTML / setHTML, and every one of these
  // fields is whatever a visitor's request (or an import file) said it was.
  it.each([
    ["an android-app referrer", { referrer: `android-app://${MARKUP}` }],
    ["the channel", { channel: MARKUP }],
    ["the city", { city: MARKUP }],
    ["the country", { country: MARKUP }],
    ["the browser", { browser: MARKUP }],
    ["the operating system", { operating_system: MARKUP }],
    ["the device type", { device_type: MARKUP }],
    ["the session id", { session_id: MARKUP }],
  ])("escapes markup in %s", (_label, overrides) => {
    const html = buildTooltipHTML(session(overrides), 0, 0);

    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('onerror=alert(1)>"');
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;&quot;");
  });
});
