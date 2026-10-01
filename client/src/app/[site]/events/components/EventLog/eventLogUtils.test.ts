import { describe, expect, it } from "vitest";
import { Event } from "../../../../../api/analytics/endpoints";
import { formatPropertyValue, getEventRowData, matchesEventSearch, parseEventProperties } from "./eventLogUtils";

const event = (overrides: Partial<Event> = {}): Event => ({
  timestamp: "2026-09-30 14:32:22",
  event_name: "",
  properties: "{}",
  session_id: "session-1",
  user_id: "a1d7b800719f",
  identified_user_id: "",
  hostname: "rybbit.com",
  pathname: "/pricing",
  querystring: "",
  page_title: "",
  referrer: "",
  browser: "Chrome",
  browser_version: "",
  operating_system: "macOS",
  operating_system_version: "",
  language: "en",
  country: "US",
  region: "",
  city: "",
  lat: 0,
  lon: 0,
  screen_width: 0,
  screen_height: 0,
  device_type: "Desktop",
  type: "custom_event",
  ...overrides,
});

describe("formatPropertyValue", () => {
  it("keeps strings as they are and prints everything else on one line", () => {
    expect(formatPropertyValue("google")).toBe("google");
    expect(formatPropertyValue(42)).toBe("42");
    expect(formatPropertyValue(false)).toBe("false");
    expect(formatPropertyValue(null)).toBe("null");
    expect(formatPropertyValue({ plan: "pro", seats: 3 })).toBe('{"plan":"pro","seats":3}');
    expect(formatPropertyValue(["a", "b"])).toBe('["a","b"]');
  });
});

describe("getEventRowData", () => {
  const data = (overrides: Partial<Event>) => {
    const row = event(overrides);
    return getEventRowData(row, parseEventProperties(row));
  };

  it("shows a custom event's properties as key=value tokens, in the order they were sent", () => {
    expect(
      data({ event_name: "signup", properties: JSON.stringify({ method: "google", plan_intent: "standard" }) })
    ).toEqual({
      kind: "tokens",
      tokens: [
        { key: "method", value: "google" },
        { key: "plan_intent", value: "standard" },
      ],
    });
  });

  it("shows an outbound click as its link", () => {
    expect(
      data({ type: "outbound", properties: JSON.stringify({ url: "https://github.com/rybbit-io/rybbit" }) })
    ).toEqual({ kind: "link", url: "https://github.com/rybbit-io/rybbit" });
  });

  it("shows an error as its message", () => {
    expect(
      data({ type: "error", properties: JSON.stringify({ message: "TypeError: x is undefined", stack: "at …" }) })
    ).toEqual({ kind: "message", text: "TypeError: x is undefined" });
  });

  it("falls back to tokens for an outbound click or an error without the expected property", () => {
    expect(data({ type: "outbound", properties: JSON.stringify({ text: "GitHub" }) })).toEqual({
      kind: "tokens",
      tokens: [{ key: "text", value: "GitHub" }],
    });
    expect(data({ type: "error" })).toEqual({ kind: "tokens", tokens: [] });
  });

  it("has nothing to show for a pageview", () => {
    expect(data({ type: "pageview" })).toEqual({ kind: "tokens", tokens: [] });
  });

  it("stops at the tokens one line can hold", () => {
    const properties = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`key${index}`, index]));
    const row = data({ properties: JSON.stringify(properties) });

    expect(row.kind === "tokens" && row.tokens).toHaveLength(6);
  });

  it("survives properties that are not valid JSON", () => {
    const row = event({ properties: "{not json" });

    expect(parseEventProperties(row)).toEqual({});
  });
});

describe("matchesEventSearch", () => {
  const signup = event({
    event_name: "signup",
    properties: JSON.stringify({ method: "google", referral_code: "HN-LAUNCH" }),
    identified_user_id: "usr_8f2kq1",
  });

  it("matches everything for an empty query", () => {
    expect(matchesEventSearch(signup, "", "Event", "Mara Lindqvist")).toBe(true);
  });

  it.each([
    ["the event name", "sign"],
    ["a property key", "referral_code"],
    ["a property value", "hn-launch"],
    ["the page", "/pric"],
    ["the user's name", "lindqvist"],
    ["the anonymous id", "a1d7b8"],
    ["the identified id", "usr_8f2"],
    ["the type label", "event"],
  ])("matches on %s", (_field, query) => {
    expect(matchesEventSearch(signup, query, "Event", "Mara Lindqvist")).toBe(true);
  });

  it("does not match text the event does not have", () => {
    expect(matchesEventSearch(signup, "checkout", "Event", "Mara Lindqvist")).toBe(false);
  });

  it("finds an autocaptured event by its type", () => {
    const click = event({ type: "button_click", properties: JSON.stringify({ text: "Start free trial" }) });

    expect(matchesEventSearch(click, "button", "Button click", "Apricot Viper")).toBe(true);
    expect(matchesEventSearch(click, "free trial", "Button click", "Apricot Viper")).toBe(true);
  });
});
