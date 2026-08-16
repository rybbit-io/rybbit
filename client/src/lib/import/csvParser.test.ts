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

  it("treats any platform other than umami as simple analytics", async () => {
    await runImport(SA_HEADER + SA_ROW, { platform: "plausible" });

    expect(events()[0]).toMatchObject({ added_iso: "2024-03-15T10:00:00.000Z", uuid: "uuid-1" });
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
