import { describe, expect, it } from "vitest";
import {
  earliestSession,
  type FirstPageviewPhase,
  isSiteAnalyticsQueryKey,
  nextFirstPageviewPhase,
} from "./firstPageview";

const hasData = (value: boolean | undefined) => ({ type: "has-data", hasData: value }) as const;

describe("nextFirstPageviewPhase", () => {
  it("waits when has-data first answers false, and stays quiet when it first answers true", () => {
    expect(nextFirstPageviewPhase("unknown", hasData(false))).toBe("waiting");
    expect(nextFirstPageviewPhase("unknown", hasData(true))).toBe("none");
    expect(nextFirstPageviewPhase("unknown", hasData(undefined))).toBe("unknown");
  });

  it("celebrates only a false → true flip, then settles and dismisses", () => {
    let phase: FirstPageviewPhase = "unknown";
    phase = nextFirstPageviewPhase(phase, hasData(false));
    phase = nextFirstPageviewPhase(phase, hasData(undefined));
    expect(phase).toBe("waiting");
    phase = nextFirstPageviewPhase(phase, hasData(true));
    expect(phase).toBe("filling");
    expect(nextFirstPageviewPhase(phase, hasData(true))).toBe("filling");
    phase = nextFirstPageviewPhase(phase, { type: "settled" });
    expect(phase).toBe("ready");
    phase = nextFirstPageviewPhase(phase, { type: "dismiss" });
    expect(phase).toBe("dismissed");
    expect(nextFirstPageviewPhase(phase, hasData(false))).toBe("dismissed");
  });

  it("can be dismissed while the dashboard is still filling, and ignores stray events", () => {
    expect(nextFirstPageviewPhase("filling", { type: "dismiss" })).toBe("dismissed");
    expect(nextFirstPageviewPhase("waiting", { type: "dismiss" })).toBe("waiting");
    expect(nextFirstPageviewPhase("waiting", { type: "settled" })).toBe("waiting");
    expect(nextFirstPageviewPhase("none", hasData(false))).toBe("none");
  });
});

describe("isSiteAnalyticsQueryKey", () => {
  const params = { time_zone: "UTC" };

  it("matches useAnalyticsQuery keys for the site, whatever the key prefix", () => {
    expect(isSiteAnalyticsQueryKey(["overview", "7", "overview", params, undefined], "7")).toBe(true);
    expect(isSiteAnalyticsQueryKey(["user-info", "u1", "7", "users/u1", params, undefined], "7")).toBe(true);
    expect(isSiteAnalyticsQueryKey(["pathname", 7, "metric", params, undefined], "7")).toBe(true);
    expect(isSiteAnalyticsQueryKey(["sessions-infinite", "7", "sessions", params, undefined, "infinite"], "7")).toBe(
      true
    );
  });

  it("leaves other sites, organization scopes and non-analytics keys alone", () => {
    expect(isSiteAnalyticsQueryKey(["overview", "8", "overview", params, undefined], "7")).toBe(false);
    expect(isSiteAnalyticsQueryKey(["site-cards", "organization:org", "site-cards", params, {}], "7")).toBe(false);
    expect(isSiteAnalyticsQueryKey(["get-site", "7"], "7")).toBe(false);
    expect(isSiteAnalyticsQueryKey(["site-has-data", "7"], "7")).toBe(false);
    expect(isSiteAnalyticsQueryKey(["gsc-data", "pages", "7", "2026-09-01", "2026-09-28", "UTC"], "7")).toBe(false);
    expect(isSiteAnalyticsQueryKey(["site-event-count-range", 7, "2026-09-01", "2026-09-28", "UTC"], "7")).toBe(false);
  });
});

describe("earliestSession", () => {
  const session = (id: string, start: string) => ({ session_id: id, session_start: start }) as never;

  it("picks the earliest session across every cached page and query", () => {
    const live = { pages: [[session("b", "2026-09-28 10:05:00")], null], pageParams: [1, 2] };
    const other = { pages: [[session("a", "2026-09-28 10:01:00"), session("c", "2026-09-28 10:09:00")]] };
    expect(earliestSession([live, undefined, other])?.session_id).toBe("a");
  });

  it("is undefined when nothing has been fetched", () => {
    expect(earliestSession([])).toBeUndefined();
    expect(earliestSession([undefined, { pages: [[]] }])).toBeUndefined();
  });
});
