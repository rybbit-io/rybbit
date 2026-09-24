import { describe, it, expect } from "vitest";
import { UmamiImportMapper } from "./umami.js";

// Valid RFC4122 v4 UUID (variant nibble 8) — zod v3's .uuid() is lax, but
// stricter validators must still accept the happy-path fixtures.
const TEST_SESSION_ID = "9e3779b1-3c6e-4362-8a4f-81b88c81f013";

function makeEvent(overrides: Record<string, string> = {}) {
  return {
    session_id: TEST_SESSION_ID,
    hostname: "example.com",
    browser: "chrome",
    os: "Windows 10",
    device: "desktop",
    screen: "1920x1080",
    language: "en-US",
    country: "US",
    region: "US-CA",
    city: "San Francisco",
    url_path: "/blog/post-1",
    url_query: "utm_source=google",
    referrer_path: "/search",
    referrer_domain: "google.com",
    page_title: "Post 1",
    event_type: "1",
    event_name: "",
    distinct_id: "visitor-1",
    created_at: "2024-06-15 14:30:00",
    ...overrides,
  };
}

describe("UmamiImportMapper", () => {
  describe("transform", () => {
    it("should transform a valid pageview event", () => {
      const events = [makeEvent()];
      const result = UmamiImportMapper.transform(events, 1, "import-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        site_id: 1,
        timestamp: "2024-06-15 14:30:00",
        session_id: TEST_SESSION_ID,
        user_id: "visitor-1",
        hostname: "example.com",
        pathname: "/blog/post-1",
        querystring: "?utm_source=google",
        url_parameters: { utm_source: "google" },
        page_title: "Post 1",
        referrer: "https://google.com/search",
        browser: "Chrome",
        browser_version: "",
        operating_system: "Windows",
        operating_system_version: "10",
        language: "en-US",
        country: "US",
        region: "US-CA",
        city: "San Francisco",
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

    it("should transform a custom event", () => {
      const events = [makeEvent({ event_type: "2", event_name: "SignUp" })];
      const result = UmamiImportMapper.transform(events, 2, "import-2");

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("custom_event");
      expect(result[0].event_name).toBe("SignUp");
    });

    it("should clear the event name for pageviews", () => {
      const events = [makeEvent({ event_type: "1", event_name: "ShouldBeDropped" })];
      const result = UmamiImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(1);
      expect(result[0].event_name).toBe("");
    });

    describe("browser/os/device normalization", () => {
      it("should map known browser keys case-insensitively", () => {
        const cases: Array<[string, string]> = [
          ["chrome", "Chrome"],
          ["Chrome", "Chrome"],
          ["crios", "Mobile Chrome"],
          ["edge-chromium", "Edge"],
          ["ios", "Mobile Safari"],
          ["samsung", "Samsung Internet"],
        ];
        for (const [input, expected] of cases) {
          const result = UmamiImportMapper.transform([makeEvent({ browser: input })], 1, "i");
          expect(result[0].browser).toBe(expected);
        }
      });

      it("should pass through unknown browsers unchanged", () => {
        const result = UmamiImportMapper.transform([makeEvent({ browser: "brave" })], 1, "i");
        expect(result[0].browser).toBe("brave");
      });

      it("should map known operating systems", () => {
        const cases: Array<[string, string]> = [
          ["Windows 10", "Windows"],
          ["Mac OS", "macOS"],
          ["iOS", "iOS"],
          ["Android OS", "Android"],
          ["Linux", "Linux"],
          ["Chrome OS", "Chrome OS"],
        ];
        for (const [input, expected] of cases) {
          const result = UmamiImportMapper.transform([makeEvent({ os: input })], 1, "i");
          expect(result[0].operating_system).toBe(expected);
        }
      });

      it("should map device types to Desktop/Mobile", () => {
        const cases: Array<[string, string]> = [
          ["desktop", "Desktop"],
          ["laptop", "Desktop"],
          ["mobile", "Mobile"],
          ["tablet", "Mobile"],
        ];
        for (const [input, expected] of cases) {
          const result = UmamiImportMapper.transform([makeEvent({ device: input })], 1, "i");
          expect(result[0].device_type).toBe(expected);
        }
      });
    });

    describe("operating_system_version derivation", () => {
      // Regression test: deriveOsVersion must match case-insensitively like the
      // os map does — raw umami exports vary in casing.
      it("should derive version 10 from any casing of Windows 10", () => {
        for (const os of ["Windows 10", "windows 10", "WINDOWS 10"]) {
          const result = UmamiImportMapper.transform([makeEvent({ os })], 1, "i");
          expect(result).toHaveLength(1);
          expect(result[0].operating_system_version).toBe("10");
          expect(result[0].operating_system).toBe("Windows");
        }
      });

      it("should derive version 7 from any casing of Windows 7", () => {
        for (const os of ["Windows 7", "windows 7", "wInDoWs 7"]) {
          const result = UmamiImportMapper.transform([makeEvent({ os })], 1, "i");
          expect(result).toHaveLength(1);
          expect(result[0].operating_system_version).toBe("7");
        }
      });

      it("should derive an empty version for all other operating systems", () => {
        for (const os of ["Mac OS", "Linux", "Android OS", "Windows Server 2003", "iOS"]) {
          const result = UmamiImportMapper.transform([makeEvent({ os })], 1, "i");
          expect(result[0].operating_system_version).toBe("");
        }
      });
    });

    describe("screen parsing", () => {
      it("should split screen into width and height", () => {
        const result = UmamiImportMapper.transform([makeEvent({ screen: "390x844" })], 1, "i");
        expect(result[0].screen_width).toBe(390);
        expect(result[0].screen_height).toBe(844);
      });

      it("should default to 0x0 for an empty screen", () => {
        const result = UmamiImportMapper.transform([makeEvent({ screen: "" })], 1, "i");
        expect(result[0].screen_width).toBe(0);
        expect(result[0].screen_height).toBe(0);
      });
    });

    describe("querystring handling", () => {
      it("should prefix a non-empty url_query with ?", () => {
        const result = UmamiImportMapper.transform([makeEvent({ url_query: "a=1&b=2" })], 1, "i");
        expect(result[0].querystring).toBe("?a=1&b=2");
        expect(result[0].url_parameters).toEqual({ a: "1", b: "2" });
      });

      it("should leave an empty url_query empty", () => {
        const result = UmamiImportMapper.transform([makeEvent({ url_query: "" })], 1, "i");
        expect(result[0].querystring).toBe("");
        expect(result[0].url_parameters).toEqual({});
      });
    });

    describe("referrer handling", () => {
      it("should prefix the referrer domain with https:// and append the path", () => {
        const result = UmamiImportMapper.transform(
          [makeEvent({ referrer_domain: "news.ycombinator.com", referrer_path: "/item" })],
          1,
          "i"
        );
        expect(result[0].referrer).toBe("https://news.ycombinator.com/item");
      });

      it("should clear self-referrers", () => {
        const result = UmamiImportMapper.transform(
          [makeEvent({ referrer_domain: "example.com", referrer_path: "/previous" })],
          1,
          "i"
        );
        expect(result[0].referrer).toBe("");
      });

      it("should clear self-referrers when the hostname has a www prefix", () => {
        const result = UmamiImportMapper.transform(
          [
            makeEvent({
              hostname: "www.example.com",
              referrer_domain: "example.com",
              referrer_path: "/previous",
            }),
          ],
          1,
          "i"
        );
        expect(result[0].referrer).toBe("");
      });

      it("should leave the referrer empty when domain and path are empty", () => {
        const result = UmamiImportMapper.transform([makeEvent({ referrer_domain: "", referrer_path: "" })], 1, "i");
        expect(result[0].referrer).toBe("");
      });
    });

    describe("invalid rows", () => {
      it("should drop rows with an invalid session uuid", () => {
        const result = UmamiImportMapper.transform([makeEvent({ session_id: "not-a-uuid" })], 1, "i");
        expect(result).toHaveLength(0);
      });

      it("should drop rows with an invalid country code", () => {
        for (const country of ["USA", "us", "1A"]) {
          const result = UmamiImportMapper.transform([makeEvent({ country })], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should allow an empty country code", () => {
        const result = UmamiImportMapper.transform([makeEvent({ country: "" })], 1, "i");
        expect(result).toHaveLength(1);
        expect(result[0].country).toBe("");
      });

      it("should drop rows with an invalid timestamp format", () => {
        for (const created_at of [
          "2024-06-15T14:30:00", // ISO "T" separator
          "2024-13-01 10:00:00", // invalid month
          "2024-06-15 24:30:00", // invalid hour
          "not-a-date",
          "",
        ]) {
          const result = UmamiImportMapper.transform([makeEvent({ created_at })], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should drop rows with a malformed screen value", () => {
        const result = UmamiImportMapper.transform([makeEvent({ screen: "1920*1080" })], 1, "i");
        expect(result).toHaveLength(0);
      });

      it("should keep valid rows when mixed with invalid ones", () => {
        const events = [
          makeEvent({ url_path: "/valid" }),
          makeEvent({ session_id: "bad" }),
          makeEvent({ url_path: "/also-valid" }),
        ];
        const result = UmamiImportMapper.transform(events, 1, "i");
        expect(result).toHaveLength(2);
        expect(result.map(e => e.pathname)).toEqual(["/valid", "/also-valid"]);
      });
    });

    it("should return empty array for empty input", () => {
      expect(UmamiImportMapper.transform([], 1, "i")).toHaveLength(0);
    });
  });
});
