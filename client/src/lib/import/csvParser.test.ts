import Papa from "papaparse";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportPlatform } from "@/types/import";

const authedFetch = vi.hoisted(() => vi.fn());
vi.mock("@/api/utils", () => ({ authedFetch }));

import { CsvParser } from "./csvParser";

// ---------------------------------------------------------------------------
// Harness
//
// startImport hands the input straight to Papa. Papa's worker path is inert
// outside a browser, and it streams a string through the same chunk/complete
// callbacks a File would take, so a plain string stands in for the upload.
// ---------------------------------------------------------------------------

const SITE_ID = 42;
const IMPORT_ID = "import-9";

interface Upload {
  events: Record<string, string>[];
  isLastBatch: boolean;
}

function uploads(): Upload[] {
  return authedFetch.mock.calls.map(call => (call[2] as { data: Upload }).data);
}

const events = () => uploads().flatMap(u => u.events);

async function runImport(
  csv: string,
  opts: { platform?: ImportPlatform; earliest?: string; latest?: string } = {}
): Promise<Upload[]> {
  authedFetch.mockClear();
  const parser = new CsvParser(
    SITE_ID,
    IMPORT_ID,
    opts.platform ?? "umami",
    opts.earliest ?? "2024-01-01",
    opts.latest ?? "2024-12-31"
  );
  parser.startImport(csv as unknown as File);
  // The chunk/complete callbacks are async and Papa does not await them.
  await new Promise(resolve => setTimeout(resolve, 0));
  return uploads();
}

const UMAMI_HEADER =
  "session_id,hostname,browser,os,device,screen,language,country,region,city," +
  "url_path,url_query,referrer_path,referrer_domain,page_title,event_type,event_name,distinct_id,created_at\n";

const UMAMI_ROW =
  "sess-1,example.com,chrome,Mac OS,desktop,1920x1080,en-US,US,US-CA,San Francisco," +
  "/pricing,?ref=hn,/post,news.ycombinator.com,Pricing,1,,user-7,2024-03-15 10:00:00\n";

const SA_HEADER =
  "added_iso,country_code,datapoint,document_referrer,hostname,lang_language,lang_region," +
  "path,query,screen_height,screen_width,session_id,user_agent,uuid\n";

const SA_ROW =
  "2024-03-15T10:00:00.000Z,US,pageview,https://news.ycombinator.com/,example.com,en,US," +
  "/pricing,?ref=hn,1080,1920,sess-1,Mozilla/5.0,uuid-1\n";

beforeEach(() => {
  authedFetch.mockReset();
  authedFetch.mockResolvedValue(undefined);
});

describe("upload envelope", () => {
  it("posts rows to the import's events endpoint and closes with an empty final batch", async () => {
    await runImport(UMAMI_HEADER + UMAMI_ROW);

    expect(authedFetch).toHaveBeenCalledTimes(2);
    expect(authedFetch.mock.calls[0][0]).toBe(`/sites/${SITE_ID}/imports/${IMPORT_ID}/events`);
    expect(authedFetch.mock.calls[0][2]).toMatchObject({ method: "POST" });
    expect(uploads().map(u => ({ n: u.events.length, last: u.isLastBatch }))).toEqual([
      { n: 1, last: false },
      { n: 0, last: true },
    ]);
  });

  it("sends only the final batch when nothing survives, never an empty data chunk", async () => {
    const sent = await runImport(UMAMI_HEADER);

    expect(sent).toEqual([{ events: [], isLastBatch: true }]);
  });
});

describe("umami rows", () => {
  it("maps every recognised column onto the wire shape", async () => {
    await runImport(UMAMI_HEADER + UMAMI_ROW);

    expect(events()[0]).toEqual({
      session_id: "sess-1",
      hostname: "example.com",
      browser: "chrome",
      os: "Mac OS",
      device: "desktop",
      screen: "1920x1080",
      language: "en-US",
      country: "US",
      region: "US-CA",
      city: "San Francisco",
      url_path: "/pricing",
      url_query: "?ref=hn",
      referrer_path: "/post",
      referrer_domain: "news.ycombinator.com",
      page_title: "Pricing",
      event_type: "1",
      event_name: "",
      distinct_id: "user-7",
      created_at: "2024-03-15 10:00:00",
    });
  });

  it("ignores columns it does not know about", async () => {
    await runImport("created_at,session_id,internal_id,tenant\n2024-03-15 10:00:00,sess-1,99,acme\n");

    expect(events()[0]).not.toHaveProperty("internal_id");
    expect(events()[0]).not.toHaveProperty("tenant");
    expect(events()[0]).toMatchObject({ session_id: "sess-1", created_at: "2024-03-15 10:00:00" });
  });

  it("drops rows with no created_at", async () => {
    const sent = await runImport("session_id,created_at\nsess-1,\nsess-2,2024-03-15 10:00:00\nsess-3,\n");

    expect(sent[0].events.map(e => e.session_id)).toEqual(["sess-2"]);
  });

  it("drops every row when the headers do not match the platform at all", async () => {
    const sent = await runImport("timestamp,page,visitor\n2024-03-15 10:00:00,/,v1\n");

    expect(sent).toEqual([{ events: [], isLastBatch: true }]);
  });
});

describe("simple analytics rows", () => {
  it("maps every recognised column onto the wire shape", async () => {
    await runImport(SA_HEADER + SA_ROW, { platform: "simple_analytics" });

    expect(events()[0]).toEqual({
      added_iso: "2024-03-15T10:00:00.000Z",
      country_code: "US",
      datapoint: "pageview",
      document_referrer: "https://news.ycombinator.com/",
      hostname: "example.com",
      lang_language: "en",
      lang_region: "US",
      path: "/pricing",
      query: "?ref=hn",
      screen_height: "1080",
      screen_width: "1920",
      session_id: "sess-1",
      user_agent: "Mozilla/5.0",
      uuid: "uuid-1",
    });
  });

  it("drops rows with no added_iso", async () => {
    const sent = await runImport("added_iso,uuid\n,uuid-1\n2024-03-15T10:00:00Z,uuid-2\n", {
      platform: "simple_analytics",
    });

    expect(sent[0].events.map(e => e.uuid)).toEqual(["uuid-2"]);
  });

  it("accepts ISO timestamps with an offset as well as Z", async () => {
    const sent = await runImport("added_iso,uuid\n2024-03-15T10:00:00+02:00,offset\n2024-03-15T10:00:00Z,zulu\n", {
      platform: "simple_analytics",
    });

    expect(sent[0].events.map(e => e.uuid)).toEqual(["offset", "zulu"]);
  });

  it("uploads no rows for plausible, which is parsed from its ZIP export instead", async () => {
    const sent = await runImport(SA_HEADER + SA_ROW, { platform: "plausible" });

    expect(sent).toEqual([{ events: [], isLastBatch: true }]);
  });
});

describe("matomo visits", () => {
  const VISIT = {
    idVisit: "4821",
    visitorId: "9dc9cf8485eecd5d",
    userId: "",
    referrerType: "search",
    referrerName: "Google",
    referrerKeyword: "",
    referrerUrl: "https://www.google.com/",
    browserName: "Chrome",
    browserVersion: "125.0",
    operatingSystemName: "Mac",
    operatingSystemVersion: "10.15",
    deviceType: "Desktop",
    languageCode: "en-us",
    countryCode: "us",
    regionCode: "CA",
    city: "San Francisco",
    latitude: "37.770000",
    longitude: "-122.420000",
    resolution: "1920x1080",
  };

  // Matomo flattens each visit's actions into actionDetails_<n>_<field> columns
  function action(index: number, fields: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(fields).map(([field, value]) => [`actionDetails_${index}_${field}`, value])
    );
  }

  function matomoCsv(...visits: Record<string, string>[]): string {
    const columns = Array.from(new Set(visits.flatMap(visit => Object.keys(visit))));
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = visits.map(visit => columns.map(column => quote(visit[column] ?? "")).join(","));
    return [columns.join(","), ...rows].join("\n") + "\n";
  }

  const pageview = (index: number, path: string, title: string, timestamp: string) =>
    action(index, { type: "action", url: `https://example.com${path}`, pageTitle: title, timestamp });

  it("unrolls a visit into one event per action, each carrying the visit's fields", async () => {
    await runImport(
      matomoCsv({
        ...VISIT,
        ...pageview(0, "/", "Home", "1718461800"),
        ...pageview(1, "/pricing", "Pricing", "1718461865"),
      }),
      { platform: "matomo" }
    );

    expect(events()).toHaveLength(2);
    expect(events()[0]).toEqual({
      idVisit: "4821",
      visitorId: "9dc9cf8485eecd5d",
      userId: "",
      type: "action",
      url: "https://example.com/",
      pageTitle: "Home",
      linkUrl: "",
      eventCategory: "",
      eventAction: "",
      eventName: "",
      eventValue: "",
      timestamp: "1718461800",
      referrerUrl: "https://www.google.com/",
      browserName: "Chrome",
      browserVersion: "125.0",
      operatingSystemName: "Mac",
      operatingSystemVersion: "10.15",
      deviceType: "Desktop",
      languageCode: "en-us",
      countryCode: "us",
      regionCode: "CA",
      city: "San Francisco",
      latitude: "37.770000",
      longitude: "-122.420000",
      resolution: "1920x1080",
    });
    expect(events()[1]).toMatchObject({ url: "https://example.com/pricing", timestamp: "1718461865" });
  });

  it("orders actions numerically, so actionDetails_10 follows actionDetails_2", async () => {
    await runImport(
      matomoCsv({
        ...VISIT,
        ...pageview(10, "/later", "Later", "1718461865"),
        ...pageview(2, "/first", "First", "1718461800"),
      }),
      { platform: "matomo" }
    );

    expect(events().map(e => e.url)).toEqual(["https://example.com/first", "https://example.com/later"]);
  });

  it("gives outlinks and downloads the page they were clicked from", async () => {
    await runImport(
      matomoCsv({
        ...VISIT,
        ...pageview(0, "/pricing", "Pricing", "1718461800"),
        ...action(1, { type: "outlink", url: "https://github.com/rybbit-io/rybbit", timestamp: "1718461810" }),
        ...action(2, { type: "download", url: "https://example.com/report.pdf", timestamp: "1718461820" }),
      }),
      { platform: "matomo" }
    );

    expect(events().slice(1)).toMatchObject([
      {
        type: "outlink",
        url: "https://example.com/pricing",
        pageTitle: "Pricing",
        linkUrl: "https://github.com/rybbit-io/rybbit",
      },
      {
        type: "download",
        url: "https://example.com/pricing",
        pageTitle: "Pricing",
        linkUrl: "https://example.com/report.pdf",
      },
    ]);
  });

  it("sends an outlink that precedes every pageview with no page", async () => {
    await runImport(
      matomoCsv({ ...VISIT, ...action(0, { type: "outlink", url: "https://github.com/", timestamp: "1718461800" }) }),
      { platform: "matomo" }
    );

    expect(events()[0]).toMatchObject({ type: "outlink", url: "", pageTitle: "", linkUrl: "https://github.com/" });
  });

  it("sends event fields only for events, on the page the event fired on", async () => {
    await runImport(
      matomoCsv({
        ...VISIT,
        ...pageview(0, "/", "Home", "1718461800"),
        ...action(1, {
          type: "event",
          url: "https://example.com/",
          eventCategory: "Videos",
          eventAction: "Play",
          eventName: "Intro",
          eventValue: "30",
          timestamp: "1718461810",
        }),
        ...action(2, {
          type: "event",
          url: "https://example.com/app",
          eventCategory: "Videos",
          eventAction: "Pause",
          timestamp: "1718461820",
        }),
      }),
      { platform: "matomo" }
    );

    expect(events()[0]).toMatchObject({ eventCategory: "", eventAction: "", eventName: "", eventValue: "" });
    expect(events().slice(1)).toMatchObject([
      {
        type: "event",
        url: "https://example.com/",
        pageTitle: "Home",
        eventCategory: "Videos",
        eventAction: "Play",
        eventName: "Intro",
        eventValue: "30",
      },
      { type: "event", url: "https://example.com/app", pageTitle: "", eventAction: "Pause" },
    ]);
  });

  it("skips goals, ecommerce and actions without a timestamp", async () => {
    await runImport(
      matomoCsv({
        ...VISIT,
        ...pageview(0, "/", "Home", "1718461800"),
        ...action(1, { type: "goal", url: "https://example.com/", timestamp: "1718461810" }),
        ...action(2, { type: "ecommerceOrder", url: "https://example.com/", timestamp: "1718461820" }),
        ...pageview(3, "/no-timestamp", "Missing", ""),
      }),
      { platform: "matomo" }
    );

    expect(events().map(e => e.type)).toEqual(["action"]);
  });

  it("falls back to the visitor and first timestamp when the export has no idVisit", async () => {
    const { idVisit: _idVisit, ...visitWithoutId } = VISIT;
    await runImport(
      matomoCsv({
        ...visitWithoutId,
        ...action(0, { type: "goal", url: "https://example.com/", timestamp: "1718461790" }),
        ...pageview(1, "/", "Home", "1718461800"),
      }),
      { platform: "matomo" }
    );

    expect(events()[0].idVisit).toBe("9dc9cf8485eecd5d-1718461790");
  });

  it("rebuilds campaign parameters on the landing page only", async () => {
    await runImport(
      matomoCsv({
        ...VISIT,
        referrerType: "campaign",
        referrerName: "spring sale",
        referrerKeyword: "analytics",
        ...action(0, {
          type: "action",
          url: "https://example.com/?ref=hn#top",
          pageTitle: "Home",
          timestamp: "1718461800",
        }),
        ...action(1, { type: "outlink", url: "https://github.com/", timestamp: "1718461805" }),
        ...pageview(2, "/pricing", "Pricing", "1718461810"),
      }),
      { platform: "matomo" }
    );

    expect(events().map(e => e.url)).toEqual([
      "https://example.com/?ref=hn&utm_campaign=spring+sale&utm_term=analytics#top",
      "https://example.com/?ref=hn#top",
      "https://example.com/pricing",
    ]);
  });

  it("keeps campaign parameters the landing page already has", async () => {
    await runImport(
      matomoCsv({
        ...VISIT,
        referrerType: "campaign",
        referrerName: "from-matomo",
        campaignSource: "newsletter",
        ...action(0, {
          type: "action",
          url: "https://example.com/?utm_campaign=original",
          pageTitle: "Home",
          timestamp: "1718461800",
        }),
      }),
      { platform: "matomo" }
    );

    expect(events()[0].url).toBe("https://example.com/?utm_campaign=original&utm_source=newsletter");
  });

  it("leaves URLs alone for visits that didn't come from a campaign", async () => {
    await runImport(matomoCsv({ ...VISIT, referrerKeyword: "analytics", ...pageview(0, "/", "Home", "1718461800") }), {
      platform: "matomo",
    });

    expect(events()[0].url).toBe("https://example.com/");
  });

  it("filters each action by its own timestamp", async () => {
    const sent = await runImport(
      matomoCsv({
        ...VISIT,
        ...pageview(0, "/last-year", "Before", "1704067199"),
        ...pageview(1, "/new-year", "After", "1704067200"),
      }),
      { platform: "matomo" }
    );

    expect(sent[0].events.map(e => e.url)).toEqual(["https://example.com/new-year"]);
  });
});

describe("posthog rows", () => {
  const SESSION_ID = "01972d6a-896e-791b-9660-9cfd4b1c886c";

  interface PostHogRow {
    event: string;
    timestamp?: string;
    properties?: Record<string, unknown> | string;
  }

  // The columns of PostHog's SQL export, in its order
  function posthogCsv(
    rows: PostHogRow[],
    columns = "uuid,event,properties,timestamp,distinct_id,$session_id,person_id"
  ) {
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = rows.map(row => {
      const values: Record<string, string> = {
        uuid: "01972d6a-97b1-72f6-b75d-b0d2d0b00a69",
        event: row.event,
        properties: typeof row.properties === "string" ? row.properties : JSON.stringify(row.properties ?? {}),
        timestamp: row.timestamp ?? "2024-06-15 14:30:00.123000+00:00",
        distinct_id: "device-1",
        $session_id: SESSION_ID,
        person_id: "0197aa00-0000-7000-8000-000000000001",
      };
      return columns
        .split(",")
        .map(column => quote(values[column]))
        .join(",");
    });
    return [columns, ...lines].join("\n") + "\n";
  }

  const runPostHogImport = (rows: PostHogRow[], opts: { columns?: string; earliest?: string; latest?: string } = {}) =>
    runImport(posthogCsv(rows, opts.columns), { platform: "posthog", earliest: opts.earliest, latest: opts.latest });

  it("uploads each row with only the properties Rybbit reads", async () => {
    await runPostHogImport([
      {
        event: "$pageview",
        properties: {
          $current_url: "https://example.com/pricing",
          title: "Pricing",
          $session_id: SESSION_ID,
          $browser: "Chrome",
          $geoip_country_code: "DE",
          token: "phc_test",
          utm_source: null,
          $lib: "web",
          $insert_id: "d57sfevi8gzj4h9b",
          $active_feature_flags: [],
        },
      },
    ]);

    expect(events()).toHaveLength(1);
    const { properties, ...columns } = events()[0];
    expect(columns).toEqual({
      event: "$pageview",
      timestamp: "2024-06-15 14:30:00.123000+00:00",
      distinct_id: "device-1",
      $session_id: SESSION_ID,
    });
    expect(JSON.parse(properties)).toEqual({
      $current_url: "https://example.com/pricing",
      title: "Pricing",
      $session_id: SESSION_ID,
      $browser: "Chrome",
      $geoip_country_code: "DE",
    });
  });

  it("keeps the developer's own properties on custom events", async () => {
    await runPostHogImport([
      { event: "signed up", properties: { plan: "pro", seats: 3, $current_url: "https://example.com/", $lib: "web" } },
    ]);

    expect(JSON.parse(events()[0].properties)).toEqual({ plan: "pro", seats: 3, $current_url: "https://example.com/" });
  });

  it("skips PostHog events Rybbit doesn't import", async () => {
    await runPostHogImport([
      { event: "$pageleave" },
      { event: "$rageclick" },
      { event: "$identify" },
      { event: "$autocapture", properties: { $el_text: "Menu" } },
      { event: "$autocapture", properties: { $external_click_url: "https://github.com/", $el_text: "GitHub" } },
      { event: "$web_vitals", properties: { $web_vitals_LCP_value: 1200 } },
      { event: "$exception", properties: { $exception_list: [] } },
    ]);

    expect(events().map(e => e.event)).toEqual(["$autocapture", "$web_vitals", "$exception"]);
    expect(JSON.parse(events()[0].properties)).toEqual({
      $external_click_url: "https://github.com/",
      $el_text: "GitHub",
    });
  });

  it("leaves the session to the properties when the export has no $session_id column", async () => {
    await runPostHogImport([{ event: "$pageview", properties: { $session_id: SESSION_ID } }], {
      columns: "event,properties,timestamp,distinct_id",
    });

    expect(events()[0].$session_id).toBe("");
    expect(JSON.parse(events()[0].properties)).toEqual({ $session_id: SESSION_ID });
  });

  it("filters by date range in UTC, reading the export's space-separated timestamps", async () => {
    await runPostHogImport(
      [
        { event: "$pageview", timestamp: "2024-02-29 23:59:59.999000+00:00" },
        { event: "$pageview", timestamp: "2024-03-01 00:00:00+00:00" },
        { event: "$pageview", timestamp: "2024-03-01 01:00:00+02:00" },
        { event: "$pageview", timestamp: "2024-03-31 23:59:59.999999+00:00" },
        { event: "$pageview", timestamp: "2024-04-01 00:00:00+00:00" },
      ],
      { earliest: "2024-03-01", latest: "2024-03-31" }
    );

    expect(events().map(e => e.timestamp)).toEqual(["2024-03-01 00:00:00+00:00", "2024-03-31 23:59:59.999999+00:00"]);
  });

  it("uploads properties that don't parse as they are, so the import counts the row as invalid", async () => {
    await runPostHogImport([
      { event: "$pageview", properties: '{"$current_url": "https://example.com/' },
      { event: "$autocapture", properties: "not json" },
    ]);

    expect(events()).toHaveLength(1);
    expect(events()[0]).toMatchObject({ event: "$pageview", properties: '{"$current_url": "https://example.com/' });
  });

  it("drops rows with no event or timestamp", async () => {
    await runPostHogImport([
      { event: "", timestamp: "2024-06-15 14:30:00+00:00" },
      { event: "$pageview", timestamp: "" },
      { event: "$pageview", timestamp: "2024-06-15 14:30:00+00:00" },
    ]);

    expect(events()).toHaveLength(1);
  });
});

describe("date range", () => {
  it("keeps rows on the boundary days and drops rows outside them", async () => {
    const sent = await runImport(
      "session_id,created_at\n" +
        "before,2024-02-29 23:59:59\n" +
        "first,2024-03-01 00:00:00\n" +
        "last,2024-03-31 23:59:59\n" +
        "after,2024-04-01 00:00:00\n",
      { earliest: "2024-03-01", latest: "2024-03-31" }
    );

    expect(sent[0].events.map(e => e.session_id)).toEqual(["first", "last"]);
  });

  it("drops rows whose timestamp matches neither the umami nor the ISO shape", async () => {
    const sent = await runImport(
      "session_id,created_at\n" +
        "slash,15/03/2024 10:00:00\n" +
        "spaced-iso,2024-03-15 10:00:00.123\n" +
        "ok,2024-03-15 10:00:00\n"
    );

    // Note: a fractional-second Umami timestamp matches neither
    // "yyyy-MM-dd HH:mm:ss" nor Luxon's ISO parser (which needs the T), so it
    // is silently discarded.
    expect(sent[0].events.map(e => e.session_id)).toEqual(["ok"]);
  });

  it("uploads nothing at all when the constructor gets an unparseable range", async () => {
    const parser = new CsvParser(SITE_ID, IMPORT_ID, "umami", "01-01-2024", "2024-12-31");
    parser.startImport((UMAMI_HEADER + UMAMI_ROW) as unknown as File);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(authedFetch).not.toHaveBeenCalled();
  });

  it("uploads nothing after cancel()", async () => {
    const parser = new CsvParser(SITE_ID, IMPORT_ID, "umami", "2024-01-01", "2024-12-31");
    parser.cancel();
    parser.startImport((UMAMI_HEADER + UMAMI_ROW) as unknown as File);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(authedFetch).not.toHaveBeenCalled();
  });
});

describe("malformed and awkward csv", () => {
  it("keeps commas, escaped quotes and newlines inside quoted fields", async () => {
    await runImport(
      "session_id,page_title,created_at\n" +
        'sess-1,"Pricing, Plans and ""Add-ons""\nsecond line",2024-03-15 10:00:00\n'
    );

    expect(events()[0].page_title).toBe('Pricing, Plans and "Add-ons"\nsecond line');
  });

  it("strips a UTF-8 byte order mark from the first header", async () => {
    await runImport("﻿session_id,created_at\nsess-1,2024-03-15 10:00:00\n");

    expect(events()).toHaveLength(1);
    expect(events()[0].session_id).toBe("sess-1");
  });

  it("handles CRLF line endings", async () => {
    await runImport("session_id,created_at\r\nsess-1,2024-03-15 10:00:00\r\n");

    expect(events()[0]).toMatchObject({ session_id: "sess-1", created_at: "2024-03-15 10:00:00" });
  });

  it("skips blank and whitespace-only lines", async () => {
    const sent = await runImport(
      "session_id,created_at\n\nsess-1,2024-03-15 10:00:00\n   \n\nsess-2,2024-03-16 10:00:00\n"
    );

    expect(sent[0].events.map(e => e.session_id)).toEqual(["sess-1", "sess-2"]);
  });

  it("tolerates rows with fewer columns than the header", async () => {
    const sent = await runImport(
      "session_id,hostname,created_at\nsess-1,example.com\nsess-2,example.com,2024-03-15 10:00:00\n"
    );

    // The short row has no created_at, so it is dropped rather than uploaded
    // with a missing timestamp.
    expect(sent[0].events.map(e => e.session_id)).toEqual(["sess-2"]);
  });

  it("tolerates rows with more columns than the header", async () => {
    await runImport("session_id,created_at\nsess-1,2024-03-15 10:00:00,extra,more\n");

    expect(events()[0]).toMatchObject({ session_id: "sess-1", created_at: "2024-03-15 10:00:00" });
  });

  it("uploads nothing for a completely empty input", async () => {
    const sent = await runImport("");

    expect(sent).toEqual([{ events: [], isLastBatch: true }]);
  });
});

describe("file encoding", () => {
  // Papa needs a browser FileReader to read a File, so stub it and inspect the
  // config it would have been given.
  async function papaConfigFor(bytes: number[]): Promise<unknown> {
    const parse = vi.spyOn(Papa, "parse").mockImplementation(() => undefined as never);
    try {
      const parser = new CsvParser(SITE_ID, IMPORT_ID, "matomo", "2024-01-01", "2024-12-31");
      await parser.startImport(new File([new Uint8Array(bytes)], "export.csv"));
      return parse.mock.calls[0][1];
    } finally {
      parse.mockRestore();
    }
  }

  it("names the encoding of a UTF-16 export so every chunk decodes alike", async () => {
    expect(await papaConfigFor([0xff, 0xfe, 0x69, 0x00])).toMatchObject({ encoding: "utf-16le" });
    expect(await papaConfigFor([0xfe, 0xff, 0x00, 0x69])).toMatchObject({ encoding: "utf-16be" });
  });

  it("leaves UTF-8 files to Papa's default decoding", async () => {
    expect(await papaConfigFor([0xef, 0xbb, 0xbf, 0x69])).toHaveProperty("encoding", undefined);
    expect(await papaConfigFor([0x69, 0x64])).toHaveProperty("encoding", undefined);
  });
});

describe("upload failures", () => {
  it("finalises the import even though the data chunk failed to upload", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    authedFetch.mockRejectedValue(new Error("network down"));

    const sent = await runImport(UMAMI_HEADER + UMAMI_ROW);

    // Current behaviour, and a bug: Papa does not await the async chunk
    // callback, so `complete` runs — and marks the import finished — before the
    // rejected upload has had a chance to set `cancelled`.
    expect(sent.map(u => ({ n: u.events.length, last: u.isLastBatch }))).toEqual([
      { n: 1, last: false },
      { n: 0, last: true },
    ]);

    vi.restoreAllMocks();
  });
});
