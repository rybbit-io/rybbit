import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Settings } from "luxon";
import { SimpleAnalyticsImportMapper } from "./simpleAnalytics.js";

// Valid RFC4122 v4 UUIDs (variant nibble 8/9) — zod v3's .uuid() is lax, but
// stricter validators must still accept the happy-path fixtures.
const TEST_SESSION_ID = "9e3779b1-3c6e-4362-8a4f-81b88c81f013";
const TEST_UUID = "12345678-90ab-4def-9234-567890abcdef";

const CHROME_WINDOWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

function makeEvent(overrides: Record<string, string> = {}) {
  return {
    added_iso: "2024-06-15T14:30:00Z",
    country_code: "US",
    datapoint: "pageview",
    document_referrer: "https://google.com/search",
    hostname: "example.com",
    lang_language: "en",
    lang_region: "us",
    path: "/blog/post-1",
    query: "utm_source=google",
    screen_height: "1080",
    screen_width: "1920",
    session_id: TEST_SESSION_ID,
    user_agent: CHROME_WINDOWS_UA,
    uuid: TEST_UUID,
    ...overrides,
  };
}

describe("SimpleAnalyticsImportMapper", () => {
  // The mapper reformats added_iso via DateTime.fromISO, which uses the system
  // zone; pin it to UTC so the expected timestamps are deterministic.
  let previousZone: typeof Settings.defaultZone;

  beforeAll(() => {
    previousZone = Settings.defaultZone;
    Settings.defaultZone = "utc";
  });

  afterAll(() => {
    Settings.defaultZone = previousZone;
  });

  describe("transform", () => {
    it("should transform a valid pageview event", () => {
      const events = [makeEvent()];
      const result = SimpleAnalyticsImportMapper.transform(events, 1, "import-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        site_id: 1,
        timestamp: "2024-06-15 14:30:00",
        session_id: TEST_SESSION_ID,
        user_id: TEST_UUID,
        hostname: "example.com",
        pathname: "/blog/post-1",
        querystring: "?utm_source=google",
        url_parameters: { utm_source: "google" },
        page_title: "",
        referrer: "https://google.com/search",
        browser: "Chrome",
        browser_version: "125",
        operating_system: "Windows",
        operating_system_version: "10",
        language: "en-US",
        country: "US",
        region: "",
        city: "",
        lat: 0,
        lon: 0,
        screen_width: 1920,
        screen_height: 1080,
        device_type: "Desktop",
        type: "pageview",
        event_name: "",
        props: {},
        import_id: "import-1",
      });
      expect(result[0].channel).toBeTruthy();
    });

    it("should transform a non-pageview datapoint into a custom event", () => {
      const events = [makeEvent({ datapoint: "signup_click" })];
      const result = SimpleAnalyticsImportMapper.transform(events, 2, "import-2");

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("custom_event");
      expect(result[0].event_name).toBe("signup_click");
    });

    describe("timestamp reformatting", () => {
      it("should reformat the ISO timestamp to ClickHouse format", () => {
        const result = SimpleAnalyticsImportMapper.transform(
          [makeEvent({ added_iso: "2023-01-05T09:07:03Z" })],
          1,
          "i"
        );
        expect(result[0].timestamp).toBe("2023-01-05 09:07:03");
      });

      it("should drop fractional seconds", () => {
        const result = SimpleAnalyticsImportMapper.transform(
          [makeEvent({ added_iso: "2024-06-15T14:30:00.123Z" })],
          1,
          "i"
        );
        expect(result).toHaveLength(1);
        expect(result[0].timestamp).toBe("2024-06-15 14:30:00");
      });

      it("should drop rows with non-ISO timestamps", () => {
        for (const added_iso of [
          "2024-06-15 14:30:00", // space separator
          "2024-06-15T14:30:00", // missing Z
          "2024-06-15T14:30:00+02:00", // offsets rejected by z.string().datetime()
          "not-a-date",
          "",
        ]) {
          const result = SimpleAnalyticsImportMapper.transform([makeEvent({ added_iso })], 1, "i");
          expect(result).toHaveLength(0);
        }
      });
    });

    describe("user agent parsing", () => {
      it("should classify an iPhone user agent as Mobile on iOS", () => {
        const result = SimpleAnalyticsImportMapper.transform(
          [makeEvent({ user_agent: IPHONE_UA, screen_width: "390", screen_height: "844" })],
          1,
          "i"
        );
        expect(result).toHaveLength(1);
        expect(result[0].operating_system).toBe("iOS");
        expect(result[0].device_type).toBe("Mobile");
      });

      it("should fall back to screen dimensions when the user agent is empty", () => {
        const result = SimpleAnalyticsImportMapper.transform([makeEvent({ user_agent: "" })], 1, "i");
        expect(result).toHaveLength(1);
        expect(result[0].browser).toBe("");
        expect(result[0].browser_version).toBe("");
        expect(result[0].operating_system).toBe("");
        expect(result[0].operating_system_version).toBe("");
        // 1920x1080 screen -> larger dimension > 1024 -> Desktop
        expect(result[0].device_type).toBe("Desktop");
      });
    });

    describe("language handling", () => {
      it("should combine language and uppercased region", () => {
        const result = SimpleAnalyticsImportMapper.transform(
          [makeEvent({ lang_language: "pt", lang_region: "br" })],
          1,
          "i"
        );
        expect(result[0].language).toBe("pt-BR");
      });

      it("should use the bare language when the region is empty", () => {
        const result = SimpleAnalyticsImportMapper.transform(
          [makeEvent({ lang_language: "de", lang_region: "" })],
          1,
          "i"
        );
        expect(result[0].language).toBe("de");
      });
    });

    describe("querystring handling", () => {
      it("should prefix a non-empty query with ?", () => {
        const result = SimpleAnalyticsImportMapper.transform([makeEvent({ query: "a=1&b=2" })], 1, "i");
        expect(result[0].querystring).toBe("?a=1&b=2");
        expect(result[0].url_parameters).toEqual({ a: "1", b: "2" });
      });

      it("should leave an empty query empty", () => {
        const result = SimpleAnalyticsImportMapper.transform([makeEvent({ query: "" })], 1, "i");
        expect(result[0].querystring).toBe("");
        expect(result[0].url_parameters).toEqual({});
      });
    });

    describe("referrer handling", () => {
      it("should clear self-referrers", () => {
        const result = SimpleAnalyticsImportMapper.transform(
          [makeEvent({ document_referrer: "https://example.com/previous" })],
          1,
          "i"
        );
        expect(result[0].referrer).toBe("");
      });

      it("should keep external referrers", () => {
        const result = SimpleAnalyticsImportMapper.transform(
          [makeEvent({ document_referrer: "https://news.ycombinator.com/item" })],
          1,
          "i"
        );
        expect(result[0].referrer).toBe("https://news.ycombinator.com/item");
      });

      it("should leave an empty referrer empty", () => {
        const result = SimpleAnalyticsImportMapper.transform([makeEvent({ document_referrer: "" })], 1, "i");
        expect(result[0].referrer).toBe("");
      });
    });

    describe("schema edge cases", () => {
      it("should drop rows with non-numeric screen dimensions", () => {
        const invalidScreens: Array<Record<string, string>> = [
          { screen_width: "abc" },
          { screen_width: "" },
          { screen_height: "1080.5" },
          { screen_height: "" },
        ];
        for (const overrides of invalidScreens) {
          const result = SimpleAnalyticsImportMapper.transform([makeEvent(overrides)], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should drop rows with an invalid country code", () => {
        for (const country_code of ["USA", "us", "1A"]) {
          const result = SimpleAnalyticsImportMapper.transform([makeEvent({ country_code })], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should allow an empty country code", () => {
        const result = SimpleAnalyticsImportMapper.transform([makeEvent({ country_code: "" })], 1, "i");
        expect(result).toHaveLength(1);
        expect(result[0].country).toBe("");
      });

      it("should drop rows with an invalid session uuid", () => {
        const result = SimpleAnalyticsImportMapper.transform([makeEvent({ session_id: "not-a-uuid" })], 1, "i");
        expect(result).toHaveLength(0);
      });

      it("should drop rows with an invalid user uuid", () => {
        const result = SimpleAnalyticsImportMapper.transform([makeEvent({ uuid: "not-a-uuid" })], 1, "i");
        expect(result).toHaveLength(0);
      });
    });

    it("should keep valid rows when mixed with invalid ones", () => {
      const events = [
        makeEvent({ path: "/valid" }),
        makeEvent({ added_iso: "bad" }),
        makeEvent({ path: "/also-valid" }),
      ];
      const result = SimpleAnalyticsImportMapper.transform(events, 1, "i");
      expect(result).toHaveLength(2);
      expect(result.map(e => e.pathname)).toEqual(["/valid", "/also-valid"]);
    });

    it("should return empty array for empty input", () => {
      expect(SimpleAnalyticsImportMapper.transform([], 1, "i")).toHaveLength(0);
    });
  });
});
