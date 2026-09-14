import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authedFetch = vi.hoisted(() => vi.fn());
vi.mock("@/api/utils", () => ({ authedFetch }));

import { PlausibleCsvParser } from "./plausibleParser";

// ---------------------------------------------------------------------------
// Harness
//
// Only the class is exported, so every helper (file identification, dimension
// normalisation, session synthesis, chunking) is exercised through a real ZIP
// fed to startImport, with the upload seam mocked. JSZip accepts a Uint8Array,
// so no browser File is needed.
// ---------------------------------------------------------------------------

const SITE_ID = 7;
const IMPORT_ID = "import-1";

type Csvs = Record<string, string>;

interface Upload {
  events: SyntheticEvent[];
  isLastBatch: boolean;
}

interface SyntheticEvent {
  timestamp: string;
  session_id: string;
  user_id: string;
  hostname: string;
  pathname: string;
  querystring: string;
  referrer: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  device_type: string;
  country: string;
  region: string;
  city: string;
  type: string;
  event_name: string;
  props: string;
}

async function zipOf(files: Csvs): Promise<File> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return bytes as unknown as File;
}

async function runImport(
  files: Csvs,
  range: { earliest?: string; latest?: string } = {}
): Promise<{ uploads: Upload[]; events: SyntheticEvent[] }> {
  // Recorded calls, but not the mock implementation — a test may have armed a
  // rejection before calling in.
  authedFetch.mockClear();
  const parser = new PlausibleCsvParser(
    SITE_ID,
    IMPORT_ID,
    range.earliest ?? "2024-01-01",
    range.latest ?? "2024-12-31"
  );
  await parser.startImport(await zipOf(files));
  return { uploads: uploads(), events: uploads().flatMap(u => u.events) };
}

function uploads(): Upload[] {
  return authedFetch.mock.calls.map(call => (call[2] as { data: Upload }).data);
}

// A two-page day with no visitors.csv. The pages totals alone (4 pageviews
// across 3 visits) size the session pool, which makes every downstream number
// in these tests hand-checkable.
const BASIC_PAGES =
  "date,page,hostname,visitors,pageviews,visits\n" +
  "2024-03-01,/,example.com,3,3,2\n" +
  "2024-03-01,/about,example.com,1,1,1\n";

beforeEach(() => {
  authedFetch.mockReset();
  authedFetch.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("upload envelope", () => {
  it("posts each chunk to the import's events endpoint and closes with an empty final batch", async () => {
    await runImport({ "pages.csv": BASIC_PAGES });

    expect(authedFetch).toHaveBeenCalledTimes(2);
    expect(authedFetch.mock.calls[0][0]).toBe(`/sites/${SITE_ID}/imports/${IMPORT_ID}/events`);
    expect(authedFetch.mock.calls[0][2]).toMatchObject({ method: "POST" });
    expect(uploads().map(u => ({ n: u.events.length, last: u.isLastBatch }))).toEqual([
      { n: 4, last: false },
      { n: 0, last: true },
    ]);
  });
});

describe("file identification", () => {
  it("finalises without events when the zip has no pages.csv", async () => {
    const { uploads } = await runImport({
      "browsers.csv": "date,browser,browser_version,visitors,pageviews\n2024-03-01,Chrome,120,5,5\n",
    });

    expect(uploads).toEqual([{ events: [], isLastBatch: true }]);
  });

  it("finalises without events when pages.csv has a header but no rows", async () => {
    const { uploads } = await runImport({ "pages.csv": "date,page,hostname,visitors,pageviews,visits\n" });

    expect(uploads).toEqual([{ events: [], isLastBatch: true }]);
  });

  it("ignores non-csv entries and csvs with unrecognised headers", async () => {
    const { events } = await runImport({
      "README.txt": "not a csv at all",
      "mystery.csv": "alpha,beta\n1,2\n",
      "nested/pages.csv": BASIC_PAGES,
    });

    expect(events).toHaveLength(4);
  });
});

describe("pageview synthesis", () => {
  it("spreads pageviews over a session pool sized by the pages totals", async () => {
    const { events } = await runImport({ "pages.csv": BASIC_PAGES });

    // 3 visits => 3 sessions, starting at even thirds of the day. 4 pageviews
    // are dealt round-robin, so the fourth lands back on the first session,
    // one page-gap (30s) after its first pageview.
    expect(events.map(e => ({ timestamp: e.timestamp, pathname: e.pathname }))).toEqual([
      { timestamp: "2024-03-01 00:00:00", pathname: "/" },
      { timestamp: "2024-03-01 08:00:00", pathname: "/" },
      { timestamp: "2024-03-01 16:00:00", pathname: "/" },
      { timestamp: "2024-03-01 00:00:30", pathname: "/about" },
    ]);
    expect(new Set(events.map(e => e.session_id)).size).toBe(3);
    expect(events[0].session_id).toBe(events[3].session_id);
    expect(events[0].user_id).toBe(events[3].user_id);
  });

  it("stamps every pageview with type pageview, no event name and empty props", async () => {
    const { events } = await runImport({ "pages.csv": BASIC_PAGES });

    expect(events.every(e => e.type === "pageview" && e.event_name === "" && e.props === "{}")).toBe(true);
  });

  it("takes hostname and pathname from the page row, defaulting a blank page to /", async () => {
    const { events } = await runImport({
      "pages.csv": "date,page,hostname,visitors,pageviews,visits\n2024-03-01,,blog.example.com,1,1,1\n",
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ hostname: "blog.example.com", pathname: "/" });
  });

  it("skips rows with no date, no pageviews or a non-numeric pageview count", async () => {
    const { events } = await runImport({
      "pages.csv":
        "date,page,hostname,visitors,pageviews,visits\n" +
        ",/orphan,example.com,1,5,1\n" +
        "2024-03-01,/zero,example.com,0,0,1\n" +
        "2024-03-01,/junk,example.com,1,abc,1\n" +
        "2024-03-01,/real,example.com,1,1,1\n",
    });

    expect(events.map(e => e.pathname)).toEqual(["/real"]);
  });

  it("gives bounced sessions exactly one pageview when visitors.csv reports bounces", async () => {
    const { events } = await runImport({
      "pages.csv":
        "date,page,hostname,visitors,pageviews,visits\n" +
        "2024-03-01,/,example.com,2,3,2\n" +
        "2024-03-01,/about,example.com,1,1,1\n",
      "visitors.csv": "date,visitors,pageviews,bounces,visits,visit_duration\n2024-03-01,2,4,1,2,120\n",
    });

    // visitors.csv wins over the pages totals: 2 visits => 2 sessions, 1 of
    // which bounced and therefore gets a single pageview.
    const perSession = new Map<string, number>();
    for (const e of events) perSession.set(e.session_id, (perSession.get(e.session_id) ?? 0) + 1);
    expect([...perSession.values()].sort()).toEqual([1, 3]);
    expect(events).toHaveLength(4);
  });

  it("is deterministic — the same zip twice yields byte-identical events", async () => {
    const files = {
      "pages.csv": BASIC_PAGES,
      "browsers.csv":
        "date,browser,browser_version,visitors,pageviews\n2024-03-01,Chrome,120,2,2\n2024-03-01,Firefox,124,1,1\n",
      "locations.csv":
        "date,country,region,city,visitors,pageviews\n2024-03-01,US,US-CA,5391959,2,2\n2024-03-01,DE,DE-BE,2950159,1,1\n",
    };

    const first = await runImport(files);
    const second = await runImport(files);

    expect(second.events).toEqual(first.events);
  });

  it("assigns pages by entry weight when entry_pages.csv is present", async () => {
    const withoutEntryPages = await runImport({ "pages.csv": BASIC_PAGES });
    const withEntryPages = await runImport({
      "pages.csv": BASIC_PAGES,
      "entry_pages.csv": "date,entry_page,visitors,entrances\n2024-03-01,/about,50,50\n2024-03-01,/,1,1\n",
    });

    // Same events, but /about is dealt first so it starts a session instead of
    // continuing one.
    expect(withEntryPages.events).toHaveLength(4);
    expect(withEntryPages.events.map(e => e.pathname)).toEqual(["/about", "/", "/", "/"]);
    expect(withoutEntryPages.events.map(e => e.pathname)).toEqual(["/", "/", "/", "/about"]);
    expect(withEntryPages.events[0].timestamp).toBe("2024-03-01 00:00:00");
  });
});

describe("date range", () => {
  it("drops dates outside the allowed window, inclusive of both ends", async () => {
    const { events } = await runImport(
      {
        "pages.csv":
          "date,page,hostname,visitors,pageviews,visits\n" +
          "2024-02-28,/early,example.com,1,1,1\n" +
          "2024-03-01,/first,example.com,1,1,1\n" +
          "2024-03-02,/last,example.com,1,1,1\n" +
          "2024-03-03,/late,example.com,1,1,1\n",
      },
      { earliest: "2024-03-01", latest: "2024-03-02" }
    );

    expect(events.map(e => e.pathname)).toEqual(["/first", "/last"]);
  });

  it("drops rows whose date is not yyyy-MM-dd", async () => {
    const { events } = await runImport({
      "pages.csv":
        "date,page,hostname,visitors,pageviews,visits\n" +
        "03/01/2024,/us-format,example.com,1,1,1\n" +
        "2024-03-01,/iso,example.com,1,1,1\n",
    });

    expect(events.map(e => e.pathname)).toEqual(["/iso"]);
  });

  it("uploads nothing at all when the constructor gets an unparseable range", async () => {
    const parser = new PlausibleCsvParser(SITE_ID, IMPORT_ID, "not-a-date", "2024-12-31");
    await parser.startImport(await zipOf({ "pages.csv": BASIC_PAGES }));

    expect(authedFetch).not.toHaveBeenCalled();
  });

  it("uploads nothing after cancel()", async () => {
    const parser = new PlausibleCsvParser(SITE_ID, IMPORT_ID, "2024-01-01", "2024-12-31");
    parser.cancel();
    await parser.startImport(await zipOf({ "pages.csv": BASIC_PAGES }));

    expect(authedFetch).not.toHaveBeenCalled();
  });
});

describe("dimension normalisation", () => {
  const single = (extra: Csvs) => ({
    "pages.csv": "date,page,hostname,visitors,pageviews,visits\n2024-03-01,/,example.com,1,1,1\n",
    ...extra,
  });

  it("maps Plausible's browser, os and device names onto Rybbit's", async () => {
    const { events } = await runImport(
      single({
        "browsers.csv": "date,browser,browser_version,visitors,pageviews\n2024-03-01,Microsoft Edge,120.0,1,1\n",
        "operating_systems.csv":
          "date,operating_system,operating_system_version,visitors,pageviews\n2024-03-01,GNU/Linux,6.5,1,1\n",
        "devices.csv": "date,device,visitors,pageviews\n2024-03-01,laptop,1,1\n",
      })
    );

    expect(events[0]).toMatchObject({
      browser: "Edge",
      browser_version: "120.0",
      operating_system: "Linux",
      operating_system_version: "6.5",
      device_type: "Desktop",
    });
  });

  it.each([
    ["Microsoft Edge", "Edge"],
    ["Samsung Browser", "Samsung Internet"],
    ["Yandex Browser", "Yandex"],
    ["MICROSOFT EDGE", "Edge"],
    ["Firefox", "Firefox"],
    ["", ""],
  ])("normalises browser %s to %s", async (input, expected) => {
    const { events } = await runImport(
      single({ "browsers.csv": `date,browser,browser_version,visitors,pageviews\n2024-03-01,${input},1.0,1,1\n` })
    );
    expect(events[0].browser).toBe(expected);
  });

  it.each([
    ["GNU/Linux", "Linux"],
    ["Ubuntu", "Linux"],
    ["Mac", "macOS"],
    ["Mac OS X", "macOS"],
    ["iOS", "iOS"],
    ["iPadOS", "iOS"],
    ["Android", "Android"],
    ["Windows", "Windows"],
    ["ChromeOS", "Chrome OS"],
    ["Chrome OS", "Chrome OS"],
    ["FreeBSD", "FreeBSD"],
  ])("normalises operating system %s to %s", async (input, expected) => {
    const { events } = await runImport(
      single({
        "operating_systems.csv": `date,operating_system,operating_system_version,visitors,pageviews\n2024-03-01,${input},1,1,1\n`,
      })
    );
    expect(events[0].operating_system).toBe(expected);
  });

  it.each([
    ["desktop", "Desktop"],
    ["laptop", "Desktop"],
    ["Desktop", "Desktop"],
    ["mobile", "Mobile"],
    ["tablet", "Mobile"],
    ["wearable", "wearable"],
  ])("normalises device %s to %s", async (input, expected) => {
    const { events } = await runImport(
      single({ "devices.csv": `date,device,visitors,pageviews\n2024-03-01,${input},1,1\n` })
    );
    expect(events[0].device_type).toBe(expected);
  });

  it("keeps country and region but drops Plausible's numeric city id", async () => {
    const { events } = await runImport(
      single({ "locations.csv": "date,country,region,city,visitors,pageviews\n2024-03-01,US,US-CA,5391959,1,1\n" })
    );

    expect(events[0]).toMatchObject({ country: "US", region: "US-CA", city: "" });
  });

  it("leaves every dimension blank when the zip carries only pages.csv", async () => {
    const { events } = await runImport(single({}));

    expect(events[0]).toMatchObject({
      browser: "",
      browser_version: "",
      operating_system: "",
      operating_system_version: "",
      device_type: "",
      country: "",
      region: "",
      city: "",
      referrer: "",
      querystring: "",
    });
  });
});

describe("referrers and utm parameters", () => {
  const withSource = async (row: string) => {
    const { events } = await runImport({
      "pages.csv": "date,page,hostname,visitors,pageviews,visits\n2024-03-01,/,example.com,1,1,1\n",
      "sources.csv":
        "date,source,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,visitors,pageviews\n" + row,
    });
    return events[0];
  };

  it("promotes a bare referrer host to https", async () => {
    const event = await withSource("2024-03-01,Google,google.com/search,,,,,,1,1\n");
    expect(event.referrer).toBe("https://google.com/search");
  });

  it("falls back to the source when there is no referrer", async () => {
    expect((await withSource("2024-03-01,t.co,,,,,,,1,1\n")).referrer).toBe("https://t.co");
  });

  it("drops friendly source names that cannot become urls", async () => {
    expect((await withSource("2024-03-01,Brave,,,,,,,1,1\n")).referrer).toBe("");
    expect((await withSource("2024-03-01,Direct / None,,,,,,,1,1\n")).referrer).toBe("https://Direct / None");
  });

  it("keeps a value that already has a scheme", async () => {
    expect((await withSource("2024-03-01,android-app://com.linkedin.android,,,,,,,1,1\n")).referrer).toBe(
      "android-app://com.linkedin.android"
    );
  });

  it("rebuilds a querystring from the utm columns in a fixed order", async () => {
    const event = await withSource("2024-03-01,newsletter,,spring,email,launch,banner,shoes,1,1\n");

    expect(event.querystring).toBe(
      "?utm_source=spring&utm_medium=email&utm_campaign=launch&utm_content=banner&utm_term=shoes"
    );
  });

  it("omits empty utm columns and url-encodes the rest", async () => {
    const event = await withSource("2024-03-01,newsletter,,spring sale,,,,,1,1\n");

    expect(event.querystring).toBe("?utm_source=spring+sale");
  });

  it("leaves the querystring empty when no utm columns are set", async () => {
    expect((await withSource("2024-03-01,Google,google.com,,,,,,1,1\n")).querystring).toBe("");
  });
});

describe("custom events", () => {
  it("attaches custom events to the day's sessions, spread across the day", async () => {
    const { events } = await runImport({
      "pages.csv": BASIC_PAGES,
      "custom_events.csv": "date,name,visitors,events,path,link_url\n2024-03-01,Signup,2,2,/signup,\n",
    });

    const custom = events.filter(e => e.type === "custom_event");
    expect(custom).toHaveLength(2);
    expect(
      custom.map(e => ({ timestamp: e.timestamp, event_name: e.event_name, pathname: e.pathname, props: e.props }))
    ).toEqual([
      { timestamp: "2024-03-01 00:00:00", event_name: "Signup", pathname: "/signup", props: "{}" },
      { timestamp: "2024-03-01 12:00:00", event_name: "Signup", pathname: "/signup", props: "{}" },
    ]);

    // They reuse pageview sessions, so the day's user ids do not multiply.
    const pageviewSessions = new Set(events.filter(e => e.type === "pageview").map(e => e.session_id));
    expect(custom.every(e => pageviewSessions.has(e.session_id))).toBe(true);
  });

  it("carries link_url through as a url prop", async () => {
    const { events } = await runImport({
      "pages.csv": BASIC_PAGES,
      "custom_events.csv":
        "date,name,visitors,events,path,link_url\n2024-03-01,Outbound Link: Click,1,1,/,https://x.com/rybbit\n",
    });

    expect(events.filter(e => e.type === "custom_event")[0].props).toBe('{"url":"https://x.com/rybbit"}');
  });

  it("uses the session hostname rather than a per-row one", async () => {
    const { events } = await runImport({
      "pages.csv": BASIC_PAGES,
      "custom_events.csv": "date,name,visitors,events,path,link_url\n2024-03-01,Signup,1,1,/signup,\n",
    });

    expect(events.filter(e => e.type === "custom_event")[0].hostname).toBe("example.com");
  });

  it("defaults a blank path to /", async () => {
    const { events } = await runImport({
      "pages.csv": BASIC_PAGES,
      "custom_events.csv": "date,name,visitors,events,path,link_url\n2024-03-01,Signup,1,1,,\n",
    });

    expect(events.filter(e => e.type === "custom_event")[0].pathname).toBe("/");
  });

  it("skips rows with no name, no events or a date that has no pageviews", async () => {
    const { events } = await runImport({
      "pages.csv": BASIC_PAGES,
      "custom_events.csv":
        "date,name,visitors,events,path,link_url\n" +
        "2024-03-01,,1,5,/anon,\n" +
        "2024-03-01,ZeroEvents,1,0,/zero,\n" +
        "2024-03-09,OtherDay,1,3,/other,\n" +
        "2024-03-01,Kept,1,1,/kept,\n",
    });

    expect(events.filter(e => e.type === "custom_event").map(e => e.pathname)).toEqual(["/kept"]);
  });
});

describe("chunking and timestamp clamping", () => {
  it("uploads in 5000-event chunks and clamps timestamps to the end of the day", async () => {
    const { uploads, events } = await runImport({
      "pages.csv": "date,page,hostname,visitors,pageviews,visits\n2024-03-01,/,example.com,1,12000,1\n",
    });

    expect(uploads.map(u => ({ n: u.events.length, last: u.isLastBatch }))).toEqual([
      { n: 5000, last: false },
      { n: 5000, last: false },
      { n: 2000, last: false },
      { n: 0, last: true },
    ]);

    // One session, 30s between pages: everything past 23:59:59 is pinned there
    // rather than spilling into the next day.
    expect(events[0].timestamp).toBe("2024-03-01 00:00:00");
    expect(events[2879].timestamp).toBe("2024-03-01 23:59:30");
    expect(events[2880].timestamp).toBe("2024-03-01 23:59:59");
    expect(events.at(-1)!.timestamp).toBe("2024-03-01 23:59:59");
  });
});

describe("upload failures", () => {
  it("swallows the error and still attempts to finalise the import", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    authedFetch.mockRejectedValue(new Error("network down"));

    await expect(runImport({ "pages.csv": BASIC_PAGES })).resolves.toBeDefined();

    expect(authedFetch).toHaveBeenCalledTimes(2);
    expect(uploads()[1]).toEqual({ events: [], isLastBatch: true });
  });
});
