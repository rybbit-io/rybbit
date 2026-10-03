import { describe, it, expect, afterEach } from "vitest";
import { Settings } from "luxon";
import { PostHogImportMapper } from "./posthog.js";

const SESSION_ID = "01972d6a-896e-791b-9660-9cfd4b1c886c";
const DEVICE_ID = "01972d6a-896f-7166-ab95-f640b73af683";
const IPHONE_CHROME_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/137.0.7151.51 Mobile/15E148 Safari/604.1";
const MAC_CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SCRIPT_URL = "https://example.com/_next/static/chunks/app.js";

// The properties posthog-js records on a pageview; undefined removes one
function makeProperties(overrides: Record<string, unknown> = {}) {
  return {
    token: "phc_test",
    distinct_id: DEVICE_ID,
    $session_id: SESSION_ID,
    $device_id: DEVICE_ID,
    $is_identified: false,
    $current_url: "https://example.com/blog/post-1?utm_source=google",
    $host: "example.com",
    $pathname: "/blog/post-1",
    title: "Post 1",
    $referrer: "https://news.ycombinator.com/item",
    $raw_user_agent: IPHONE_CHROME_UA,
    $browser: "Chrome iOS",
    $browser_version: 137,
    $os: "iOS",
    $os_version: "18.5.0",
    $device_type: "Mobile",
    $screen_width: 390,
    $screen_height: 844,
    $browser_language: "de-DE",
    $geoip_country_code: "US",
    $geoip_subdivision_1_code: "CA",
    $geoip_city_name: "San Francisco",
    $geoip_latitude: 37.77,
    $geoip_longitude: -122.42,
    $geoip_time_zone: "America/Los_Angeles",
    $lib: "web",
    utm_source: "google",
    gclid: null,
    ...overrides,
  };
}

// One row of PostHog's SQL export
function makeEvent(overrides: Record<string, string> = {}, properties: Record<string, unknown> = {}) {
  return {
    event: "$pageview",
    timestamp: "2024-06-15 14:30:00.123000+00:00",
    distinct_id: DEVICE_ID,
    $session_id: SESSION_ID,
    properties: JSON.stringify(makeProperties(properties)),
    ...overrides,
  };
}

const transformOne = (overrides: Record<string, string> = {}, properties: Record<string, unknown> = {}) =>
  PostHogImportMapper.transform([makeEvent(overrides, properties)], 1, "import-1");

describe("PostHogImportMapper", () => {
  describe("transform", () => {
    afterEach(() => {
      Settings.defaultZone = "system";
    });

    it("should transform a valid pageview", () => {
      const result = transformOne();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        site_id: 1,
        timestamp: "2024-06-15 14:30:00",
        timestamp_ms: "2024-06-15 14:30:00.123",
        session_id: SESSION_ID,
        user_id: DEVICE_ID,
        identified_user_id: "",
        hostname: "example.com",
        pathname: "/blog/post-1",
        querystring: "?utm_source=google",
        url_parameters: { utm_source: "google" },
        page_title: "Post 1",
        referrer: "https://news.ycombinator.com/item",
        browser: "Mobile Chrome",
        browser_version: "137",
        operating_system: "iOS",
        operating_system_version: "18.5.0",
        language: "de-DE",
        country: "US",
        region: "US-CA",
        city: "San Francisco",
        lat: 37.77,
        lon: -122.42,
        timezone: "America/Los_Angeles",
        screen_width: 390,
        screen_height: 844,
        device_type: "Mobile",
        type: "pageview",
        event_name: "",
        props: {},
        import_id: "import-1",
      });
      expect(result[0].channel).toBeTruthy();
    });

    describe("timestamps", () => {
      it("should convert the export's offset to UTC and keep milliseconds", () => {
        const result = transformOne({ timestamp: "2024-06-15 16:30:00.5+02:00" });
        expect(result[0].timestamp).toBe("2024-06-15 14:30:00");
        expect(result[0].timestamp_ms).toBe("2024-06-15 14:30:00.500");
      });

      it("should accept whole seconds and ISO 8601 timestamps", () => {
        for (const timestamp of ["2024-06-15 14:30:00+00:00", "2024-06-15T14:30:00Z", "2024-06-15T14:30:00.000Z"]) {
          const result = transformOne({ timestamp });
          expect(result[0].timestamp_ms).toBe("2024-06-15 14:30:00.000");
        }
      });

      it("should read a timestamp without an offset as UTC whatever the server's zone", () => {
        Settings.defaultZone = "America/Los_Angeles";
        const result = transformOne({ timestamp: "2024-06-15 14:30:00" });
        expect(result[0].timestamp).toBe("2024-06-15 14:30:00");
      });

      it("should drop rows with an invalid timestamp", () => {
        for (const timestamp of [
          "",
          "2024-06-15",
          "15/06/2024 14:30:00",
          "2024-06-15 14:30:00 UTC",
          "2024-13-45 14:30:00",
        ]) {
          expect(transformOne({ timestamp })).toHaveLength(0);
        }
      });
    });

    describe("sessions and users", () => {
      it("should take the session from the properties when the export has no $session_id column", () => {
        const result = transformOne({ $session_id: "" });
        expect(result[0].session_id).toBe(SESSION_ID);
      });

      it("should drop events without a session, as server-side SDKs send them", () => {
        expect(transformOne({ $session_id: "" }, { $session_id: undefined })).toHaveLength(0);
      });

      it("should keep the device as the user and the distinct ID as the identified user", () => {
        const result = transformOne({ distinct_id: "jane@example.com" }, { $is_identified: true });
        expect(result[0].user_id).toBe(DEVICE_ID);
        expect(result[0].identified_user_id).toBe("jane@example.com");
      });

      it("should fall back to the distinct ID when there's no device ID", () => {
        const result = transformOne({ distinct_id: "anon-1" }, { $device_id: undefined });
        expect(result[0].user_id).toBe("anon-1");
        expect(result[0].identified_user_id).toBe("");
      });
    });

    describe("event types", () => {
      it("should import an autocaptured click that leaves the site as an outbound link", () => {
        const result = transformOne(
          { event: "$autocapture" },
          { title: undefined, $external_click_url: "https://github.com/rybbit-io/rybbit", $el_text: "GitHub" }
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          type: "outbound",
          event_name: "",
          props: { url: "https://github.com/rybbit-io/rybbit", text: "GitHub" },
          hostname: "example.com",
          pathname: "/blog/post-1",
        });
      });

      it("should leave text out of an outbound link without any", () => {
        const result = transformOne({ event: "$autocapture" }, { $external_click_url: "https://github.com/" });
        expect(result[0].props).toEqual({ url: "https://github.com/" });
      });

      it("should drop autocaptured clicks that stay on the site", () => {
        for (const $external_click_url of [undefined, "", "not a url"]) {
          expect(transformOne({ event: "$autocapture" }, { $external_click_url })).toHaveLength(0);
        }
      });

      it("should import web vitals as a performance event with the metrics it carries", () => {
        const result = transformOne(
          { event: "$web_vitals" },
          { $web_vitals_LCP_value: 1834.5, $web_vitals_FCP_value: 912, $web_vitals_CLS_value: 0 }
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          type: "performance",
          event_name: "web-vitals",
          props: {},
          lcp: 1834.5,
          fcp: 912,
          cls: 0,
          inp: null,
        });
      });

      it("should drop web vitals events without a usable metric", () => {
        expect(transformOne({ event: "$web_vitals" })).toHaveLength(0);
        expect(transformOne({ event: "$web_vitals" }, { $web_vitals_LCP_value: -1 })).toHaveLength(0);
      });

      it("should import a custom event with the developer's own properties", () => {
        const result = transformOne(
          { event: "signed up" },
          {
            plan: "pro",
            seats: 3,
            trial: true,
            address: { country: "DE" },
            title: "Custom title",
            $set: { email: "x" },
          }
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ type: "custom_event", event_name: "signed up", page_title: "" });
        expect(result[0].props).toEqual({
          plan: "pro",
          seats: 3,
          trial: true,
          address: { country: "DE" },
          title: "Custom title",
        });
      });

      it("should truncate custom event names to 256 characters", () => {
        const result = transformOne({ event: "a".repeat(300) });
        expect(result[0].event_name).toHaveLength(256);
      });

      it("should keep a custom event that has no page", () => {
        const result = transformOne({ event: "exported" }, { $current_url: undefined });
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ hostname: "", pathname: "", querystring: "" });
      });

      it("should drop PostHog events Rybbit has no equivalent for", () => {
        for (const event of [
          "$pageleave",
          "$rageclick",
          "$dead_click",
          "$identify",
          "$screen",
          "$feature_flag_called",
        ]) {
          expect(transformOne({ event })).toHaveLength(0);
        }
      });
    });

    describe("exceptions", () => {
      // A frame after PostHog resolved it, which keeps the raw frame aside
      const resolvedFrame = (name: string, line: number, column: number) => ({
        mangled_name: name,
        line,
        column,
        source: "/_next/static/chunks/app.js",
        resolved: false,
        junk_drawer: { raw_frame: { function: name, filename: SCRIPT_URL, lineno: line, colno: column } },
      });

      it("should rebuild the error from the exception list, innermost frame first", () => {
        const result = transformOne(
          { event: "$exception" },
          {
            $exception_list: [
              {
                type: "TypeError",
                value: "x is undefined",
                mechanism: { handled: false },
                stacktrace: {
                  type: "resolved",
                  frames: [resolvedFrame("outer", 1, 100), resolvedFrame("inner", 1, 200)],
                },
              },
            ],
          }
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ type: "error", event_name: "TypeError", pathname: "/blog/post-1" });
        expect(result[0].props).toEqual({
          message: "x is undefined",
          stack: [
            "TypeError: x is undefined",
            `    at inner (${SCRIPT_URL}:1:200)`,
            `    at outer (${SCRIPT_URL}:1:100)`,
          ].join("\n"),
          fileName: SCRIPT_URL,
          lineNumber: 1,
          columnNumber: 200,
        });
      });

      it("should read frames posthog-js sent before PostHog resolved them", () => {
        const result = transformOne(
          { event: "$exception" },
          {
            $exception_list: [
              {
                type: "Error",
                value: "boom",
                stacktrace: { type: "raw", frames: [{ filename: SCRIPT_URL, lineno: 3, colno: 7, in_app: true }] },
              },
            ],
          }
        );
        expect(result[0].props).toEqual({
          message: "boom",
          stack: `Error: boom\n    at ${SCRIPT_URL}:3:7`,
          fileName: SCRIPT_URL,
          lineNumber: 3,
          columnNumber: 7,
        });
      });

      it("should fall back to the older exception properties", () => {
        const result = transformOne(
          { event: "$exception" },
          { $exception_type: "ReferenceError", $exception_message: "foo is not defined" }
        );
        expect(result[0].event_name).toBe("ReferenceError");
        expect(result[0].props).toEqual({ message: "foo is not defined", stack: "" });
      });

      it("should name an exception without a type or message the way the tracker does", () => {
        const result = transformOne({ event: "$exception" });
        expect(result[0].event_name).toBe("Error");
        expect(result[0].props).toEqual({ message: "Unknown error", stack: "" });
      });

      it("should truncate the message and stack to the tracker's limits", () => {
        const frames = Array.from({ length: 100 }, (_, i) => resolvedFrame(`fn${i}`, 1, i + 1));
        const result = transformOne(
          { event: "$exception" },
          { $exception_list: [{ type: "Error", value: "m".repeat(600), stacktrace: { frames } }] }
        );
        expect((result[0].props.message as string).length).toBe(500);
        expect((result[0].props.stack as string).length).toBe(2000);
      });
    });

    describe("browser, OS and device", () => {
      it("should parse the user agent the way Rybbit's tracker does", () => {
        const result = transformOne(
          {},
          {
            $raw_user_agent: MAC_CHROME_UA,
            $browser: "Chrome",
            $os: "Mac OS X",
            $screen_width: 1440,
            $screen_height: 900,
          }
        );
        expect(result[0]).toMatchObject({
          browser: "Chrome",
          browser_version: "120",
          operating_system: "macOS",
          operating_system_version: "10.15.7",
          device_type: "Desktop",
        });
      });

      it("should map PostHog's own detection to Rybbit's names when there's no user agent", () => {
        const cases: Array<[Record<string, unknown>, Record<string, string>]> = [
          [{ $browser: "Chrome iOS" }, { browser: "Mobile Chrome" }],
          [{ $browser: "Microsoft Edge" }, { browser: "Edge" }],
          [{ $browser: "Facebook Mobile" }, { browser: "Facebook" }],
          [{ $browser: "Firefox" }, { browser: "Firefox" }],
          [{ $os: "Mac OS X" }, { operating_system: "macOS" }],
          [{ $os: "Windows" }, { operating_system: "Windows" }],
          [{ $device_type: "Tablet" }, { device_type: "Mobile" }],
          [{ $device_type: "Desktop" }, { device_type: "Desktop" }],
          [{ $device_type: "Console" }, { device_type: "Console" }],
        ];
        for (const [properties, expected] of cases) {
          const result = transformOne({}, { $raw_user_agent: undefined, ...properties });
          expect(result[0]).toMatchObject(expected);
        }
      });

      it("should keep only the browser's major version", () => {
        for (const [$browser_version, expected] of [
          [17.5, "17"],
          ["120.0.6099", "120"],
          [undefined, ""],
          ["unknown", ""],
        ]) {
          const result = transformOne({}, { $raw_user_agent: undefined, $browser_version });
          expect(result[0].browser_version).toBe(expected);
        }
      });

      it("should default unusable screen sizes to 0", () => {
        for (const size of [undefined, -1, 70000, 390.5, "390"]) {
          const result = transformOne({}, { $screen_width: size, $screen_height: size });
          expect(result).toHaveLength(1);
          expect(result[0].screen_width).toBe(0);
          expect(result[0].screen_height).toBe(0);
        }
      });
    });

    describe("location", () => {
      it("should prefix the region with the country", () => {
        const result = transformOne({}, { $geoip_country_code: "GB", $geoip_subdivision_1_code: "ENG" });
        expect(result[0].region).toBe("GB-ENG");
      });

      it("should blank unusable location properties without dropping the event", () => {
        const result = transformOne(
          {},
          {
            $geoip_country_code: "USA",
            $geoip_city_name: "x".repeat(61),
            $geoip_latitude: "37.77",
            $geoip_longitude: 200,
            $geoip_time_zone: "not a zone",
          }
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ country: "", region: "", city: "", lat: 0, lon: 0, timezone: "" });
      });

      it("should leave location empty when GeoIP was off", () => {
        const result = transformOne(
          {},
          {
            $geoip_country_code: undefined,
            $geoip_subdivision_1_code: undefined,
            $geoip_city_name: undefined,
            $geoip_latitude: undefined,
            $geoip_longitude: undefined,
            $geoip_time_zone: undefined,
          }
        );
        expect(result[0]).toMatchObject({ country: "", region: "", city: "", lat: 0, lon: 0, timezone: "" });
      });
    });

    describe("pages and referrers", () => {
      it("should treat PostHog's $direct referrer as no referrer", () => {
        const result = transformOne({}, { $referrer: "$direct", $current_url: "https://example.com/" });
        expect(result[0].referrer).toBe("");
        expect(result[0].channel).toBe("Direct");
      });

      it("should clear a referrer from the page's own host", () => {
        const result = transformOne(
          {},
          { $referrer: "https://example.com/docs", $current_url: "https://example.com/" }
        );
        expect(result[0].referrer).toBe("");
      });

      it("should take the hostname from the page URL without its port", () => {
        const result = transformOne({}, { $current_url: "http://localhost:3000/dashboard", $host: "localhost:3000" });
        expect(result[0].hostname).toBe("localhost");
        expect(result[0].pathname).toBe("/dashboard");
      });

      it("should read hash-routed paths like Rybbit's tracker", () => {
        const result = transformOne({}, { $current_url: "https://example.com/#/settings/billing" });
        expect(result[0].pathname).toBe("/settings/billing");
      });

      it("should truncate page titles longer than 512 characters", () => {
        const result = transformOne({}, { title: "a".repeat(600) });
        expect(result[0].page_title).toHaveLength(512);
      });

      it("should drop pageviews without a usable URL", () => {
        for (const $current_url of [undefined, "", "/relative/path"]) {
          expect(transformOne({}, { $current_url })).toHaveLength(0);
        }
      });
    });

    describe("invalid rows", () => {
      it("should drop rows whose properties aren't a JSON object", () => {
        for (const properties of ["", "not json", "[]", "null", '"text"']) {
          const result = PostHogImportMapper.transform([{ ...makeEvent(), properties }], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should drop rows without an event name or distinct ID", () => {
        expect(transformOne({ event: "" })).toHaveLength(0);
        expect(transformOne({ distinct_id: "" })).toHaveLength(0);
      });

      it("should keep valid rows when mixed with invalid ones", () => {
        const events = [
          makeEvent({}, { $current_url: "https://example.com/valid" }),
          makeEvent({ timestamp: "bad" }),
          makeEvent({}, { $current_url: "https://example.com/also-valid" }),
        ];
        const result = PostHogImportMapper.transform(events, 1, "i");
        expect(result.map(e => e.pathname)).toEqual(["/valid", "/also-valid"]);
      });
    });

    it("should return empty array for empty input", () => {
      expect(PostHogImportMapper.transform([], 1, "i")).toHaveLength(0);
    });
  });
});
