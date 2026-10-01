import { describe, expect, it } from "vitest";
import type { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import type { GeoBreakdownResponse, GeoBreakdownRow } from "../../../../api/analytics/hooks/useGetGeoBreakdown";
import {
  aggregateSessions,
  buildPlaceEntries,
  countDelta,
  countryStats,
  parseCityKey,
  placeCountryCode,
  placeFilter,
} from "./places";

const row = (value: string, sessions: number, extra: Partial<GeoBreakdownRow> = {}): GeoBreakdownRow => ({
  value,
  sessions,
  users: sessions,
  pageviews: sessions * 2,
  bounce_rate: 40,
  ...extra,
});

const breakdown = (rows: GeoBreakdownRow[], places = rows.length): GeoBreakdownResponse => ({
  rows,
  totals: {
    sessions: rows.reduce((sum, r) => sum + r.sessions, 0),
    users: rows.reduce((sum, r) => sum + r.users, 0),
    pageviews: rows.reduce((sum, r) => sum + r.pageviews, 0),
    bounce_rate: 40,
    places,
  },
});

const session = (overrides: Partial<GetSessionsResponse[number]>) =>
  ({
    session_id: "s",
    user_id: "u",
    identified_user_id: "",
    country: "US",
    region: "US-CA",
    city: "San Francisco",
    pageviews: 2,
    lat: 37.77,
    lon: -122.42,
    ...overrides,
  }) as GetSessionsResponse[number];

describe("parseCityKey", () => {
  it("splits a region-qualified city", () => {
    expect(parseCityKey("US-CA-San Francisco")).toEqual({ country: "US", region: "US-CA", city: "San Francisco" });
  });

  it("keeps hyphens that belong to the city name", () => {
    expect(parseCityKey("US-NC-Winston-Salem")).toEqual({ country: "US", region: "US-NC", city: "Winston-Salem" });
  });

  it("reads a city without a region", () => {
    expect(parseCityKey("-Singapore")).toEqual({ country: "", region: "", city: "Singapore" });
  });
});

describe("placeCountryCode and placeFilter", () => {
  it("finds the country of each level's key", () => {
    expect(placeCountryCode("country", "BR")).toBe("BR");
    expect(placeCountryCode("region", "BR-SP")).toBe("BR");
    expect(placeCountryCode("city", "BR-SP-São Paulo")).toBe("BR");
    expect(placeCountryCode("city", "-Singapore")).toBe("");
  });

  it("filters on the level's own parameter with the key as the value", () => {
    expect(placeFilter("city", "BR-SP-São Paulo")).toEqual({
      parameter: "city",
      type: "equals",
      value: ["BR-SP-São Paulo"],
    });
  });
});

describe("aggregateSessions", () => {
  const sessions = [
    session({ session_id: "1", user_id: "a", pageviews: 1 }),
    session({ session_id: "2", user_id: "a", pageviews: 3 }),
    session({
      session_id: "3",
      user_id: "b",
      identified_user_id: "ada",
      pageviews: 1,
      country: "DE",
      region: "DE-BE",
      city: "Berlin",
    }),
    session({
      session_id: "4",
      user_id: "c",
      identified_user_id: "ada",
      pageviews: 4,
      country: "DE",
      region: "DE-BE",
      city: "Berlin",
    }),
    session({ session_id: "5", user_id: "d", country: "", region: "", city: "" }),
  ] as GetSessionsResponse;

  it("counts sessions, users, pageviews and bounces per country", () => {
    const { rows, totals } = aggregateSessions(sessions, "country");

    expect(rows).toEqual([
      { value: "DE", sessions: 2, users: 1, pageviews: 5, bounce_rate: 50 },
      { value: "US", sessions: 2, users: 1, pageviews: 4, bounce_rate: 50 },
    ]);
    expect(totals).toEqual({ sessions: 4, users: 2, pageviews: 9, bounce_rate: 50, places: 2 });
  });

  it("counts an identified user once across devices", () => {
    const { rows } = aggregateSessions(sessions, "country");
    expect(rows.find(r => r.value === "DE")?.users).toBe(1);
  });

  it("leaves out sessions without a place at the level", () => {
    expect(aggregateSessions(sessions, "country").totals.sessions).toBe(4);
    expect(aggregateSessions([session({ city: "" })] as GetSessionsResponse, "city").rows).toEqual([]);
  });

  it("keys cities the way the city filter expects, with coordinates", () => {
    const { rows } = aggregateSessions(sessions, "city");
    expect(rows.map(r => r.value)).toEqual(["DE-BE-Berlin", "US-CA-San Francisco"]);
    expect(rows[1]).toMatchObject({ lat: 37.77, lon: -122.42 });
  });

  it("reports no bounce rate for an empty window", () => {
    expect(aggregateSessions([], "country").totals).toEqual({
      sessions: 0,
      users: 0,
      pageviews: 0,
      bounce_rate: null,
      places: 0,
    });
  });
});

describe("buildPlaceEntries", () => {
  const current = breakdown([row("US", 600, { users: 400 }), row("DE", 300, { users: 450 }), row("BR", 100)]);

  it("ranks by the chosen metric and states each place's share of the total", () => {
    const bySessions = buildPlaceEntries(current, undefined, "sessions");
    expect(bySessions.map(e => [e.key, e.rank, e.share])).toEqual([
      ["US", 1, 60],
      ["DE", 2, 30],
      ["BR", 3, 10],
    ]);

    expect(buildPlaceEntries(current, undefined, "users").map(e => e.key)).toEqual(["DE", "US", "BR"]);
  });

  it("has no delta without a comparison period", () => {
    expect(buildPlaceEntries(current, undefined, "sessions").every(e => e.delta === null && e.previous === null)).toBe(
      true
    );
  });

  it("compares each place with itself in the comparison period", () => {
    const previous = breakdown([row("US", 500), row("DE", 400)]);
    const [us, de, br] = buildPlaceEntries(current, previous, "sessions");

    expect(us.delta).toMatchObject({ direction: "up", text: "20.0%" });
    expect(de.delta).toMatchObject({ direction: "down", text: "25.0%" });
    // Brazil is absent from a complete comparison list: it had no sessions then.
    expect(br.previous).toBe(0);
    expect(br.delta?.direction).toBe("none");
  });

  it("does not invent a zero for a place the comparison's row limit may have cut", () => {
    const previous = breakdown([row("US", 500), row("DE", 400)], 40);
    const br = buildPlaceEntries(current, previous, "sessions")[2];

    expect(br.previous).toBeNull();
    expect(br.delta).toBeNull();
  });

  it("keeps the order by sessions for bounce rate and compares in percentage points", () => {
    const rates = breakdown([
      row("US", 600, { bounce_rate: 35 }),
      row("DE", 300, { bounce_rate: 80 }),
      row("BR", 100, { bounce_rate: 100 }),
    ]);
    const previous = breakdown([row("US", 500, { bounce_rate: 40 })]);
    const entries = buildPlaceEntries(rates, previous, "bounce_rate");

    expect(entries.map(e => e.key)).toEqual(["US", "DE", "BR"]);
    expect(entries[0]).toMatchObject({ value: 35, share: 60, previous: 40 });
    expect(entries[0].delta).toMatchObject({ direction: "down", text: "5.0 pp" });
    // No previous rate to compare with is not a rate of zero.
    expect(entries[1].delta).toBeNull();
  });

  it("returns nothing while the breakdown is loading", () => {
    expect(buildPlaceEntries(undefined, undefined, "sessions")).toEqual([]);
  });
});

describe("countDelta", () => {
  it("states the change as a count", () => {
    expect(countDelta(148, 142)).toEqual({ direction: "up", text: "6", signed: "+6" });
    expect(countDelta(140, 142)).toEqual({ direction: "down", text: "2", signed: "-2" });
    expect(countDelta(142, 142)).toEqual({ direction: "flat", text: "0", signed: "0" });
  });

  it("is absent without a comparison", () => {
    expect(countDelta(148, null)).toBeNull();
  });
});

describe("countryStats", () => {
  const current = breakdown(
    [row("US", 500), row("DE", 200), row("GB", 120), row("IN", 80), row("FR", 60), row("BR", 30), row("AU", 10)],
    12
  );

  it("states how concentrated the traffic is", () => {
    const stats = countryStats(current, undefined);

    expect(stats?.countries).toBe(12);
    expect(stats?.top).toEqual({ key: "US", share: 50, previousShare: null });
    expect(stats?.topFive).toEqual({ keys: ["US", "DE", "GB", "IN", "FR"], share: 96, previousShare: null });
    expect(stats?.fastest).toBeNull();
  });

  it("compares shares for the same countries", () => {
    const previous = breakdown([row("US", 400), row("DE", 300), row("GB", 100), row("JP", 200)], 9);
    const stats = countryStats(current, previous);

    expect(stats?.previousCountries).toBe(9);
    expect(stats?.top?.previousShare).toBe(40);
    // US + DE + GB of the previous 1,000; IN and FR had none, JP is not one of today's five.
    expect(stats?.topFive?.previousShare).toBe(80);
  });

  it("names the largest rise among countries with enough traffic", () => {
    const previous = breakdown([row("US", 400), row("DE", 100), row("BR", 10), row("AU", 1)]);
    const stats = countryStats(current, previous);

    // BR tripled and AU grew tenfold, but AU started from a single session.
    expect(stats?.fastest).toEqual({ key: "BR", sessions: 30, previousSessions: 10, share: 3 });
  });

  it("names no fastest-growing country when none grew", () => {
    const previous = breakdown([row("US", 900), row("DE", 400)]);
    expect(countryStats(current, previous)?.fastest).toBeNull();
  });

  it("is absent while loading and empty without data", () => {
    expect(countryStats(undefined, undefined)).toBeNull();
    expect(countryStats(breakdown([]), undefined)).toMatchObject({ countries: 0, top: null, topFive: null });
  });
});
