import { describe, it, expect, afterEach } from "vitest";
import { Settings } from "luxon";
import { MatomoImportMapper } from "./matomo.js";

const VISITOR_ID = "9dc9cf8485eecd5d";

// One action as the client unrolls it from a Matomo visit row
function makeEvent(overrides: Record<string, string> = {}) {
  return {
    idVisit: "4821",
    visitorId: VISITOR_ID,
    userId: "",
    type: "action",
    url: "https://example.com/blog/post-1?utm_source=google",
    pageTitle: "Post 1",
    linkUrl: "",
    eventCategory: "",
    eventAction: "",
    eventName: "",
    eventValue: "",
    timestamp: "1718461800",
    referrerUrl: "https://news.ycombinator.com/item",
    browserName: "Chrome Mobile",
    browserVersion: "125.0",
    operatingSystemName: "Android",
    operatingSystemVersion: "14",
    deviceType: "Smartphone",
    languageCode: "en-us",
    countryCode: "us",
    regionCode: "CA",
    city: "San Francisco",
    latitude: "37.770000",
    longitude: "-122.420000",
    resolution: "390x844",
    ...overrides,
  };
}

describe("MatomoImportMapper", () => {
  describe("transform", () => {
    afterEach(() => {
      Settings.defaultZone = "system";
    });

    it("should transform a valid pageview", () => {
      const result = MatomoImportMapper.transform([makeEvent()], 1, "import-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        site_id: 1,
        timestamp: "2024-06-15 14:30:00",
        session_id: "4821",
        user_id: VISITOR_ID,
        identified_user_id: "",
        hostname: "example.com",
        pathname: "/blog/post-1",
        querystring: "?utm_source=google",
        url_parameters: { utm_source: "google" },
        page_title: "Post 1",
        referrer: "https://news.ycombinator.com/item",
        browser: "Mobile Chrome",
        browser_version: "125",
        operating_system: "Android",
        operating_system_version: "14",
        language: "en-US",
        country: "US",
        region: "US-CA",
        city: "San Francisco",
        lat: 37.77,
        lon: -122.42,
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

    it("should read the unix timestamp as UTC whatever the server's zone", () => {
      Settings.defaultZone = "America/Los_Angeles";
      const result = MatomoImportMapper.transform([makeEvent({ timestamp: "1718461865" })], 1, "i");
      expect(result[0].timestamp).toBe("2024-06-15 14:31:05");
    });

    it("should import a site search as a pageview", () => {
      const result = MatomoImportMapper.transform(
        [makeEvent({ type: "search", url: "https://example.com/search", pageTitle: "Search" })],
        1,
        "i"
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ type: "pageview", pathname: "/search", page_title: "Search", props: {} });
    });

    it("should store Matomo's user ID as the identified user", () => {
      const result = MatomoImportMapper.transform([makeEvent({ userId: " jane@example.com " })], 1, "i");
      expect(result[0].identified_user_id).toBe("jane@example.com");
      expect(result[0].user_id).toBe(VISITOR_ID);
    });

    describe("outlinks, downloads and events", () => {
      it("should import an outlink as an outbound event on the page it was clicked from", () => {
        const result = MatomoImportMapper.transform(
          [makeEvent({ type: "outlink", linkUrl: "https://github.com/rybbit-io/rybbit" })],
          1,
          "i"
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          type: "outbound",
          event_name: "",
          props: { url: "https://github.com/rybbit-io/rybbit" },
          hostname: "example.com",
          pathname: "/blog/post-1",
          page_title: "Post 1",
        });
      });

      it("should keep an outlink that came before any pageview, with no page", () => {
        const result = MatomoImportMapper.transform(
          [makeEvent({ type: "outlink", url: "", pageTitle: "", linkUrl: "https://github.com/" })],
          1,
          "i"
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ type: "outbound", hostname: "", pathname: "", querystring: "" });
      });

      it("should import a download as a File Download custom event", () => {
        const result = MatomoImportMapper.transform(
          [makeEvent({ type: "download", linkUrl: "https://example.com/files/report.pdf" })],
          1,
          "i"
        );
        expect(result[0]).toMatchObject({
          type: "custom_event",
          event_name: "File Download",
          props: { url: "https://example.com/files/report.pdf" },
        });
      });

      it("should name an event by its category and keep the rest as properties", () => {
        const result = MatomoImportMapper.transform(
          [
            makeEvent({
              type: "event",
              eventCategory: "Videos",
              eventAction: "Play",
              eventName: "Intro",
              eventValue: "30.5",
            }),
          ],
          1,
          "i"
        );
        expect(result[0].type).toBe("custom_event");
        expect(result[0].event_name).toBe("Videos");
        expect(result[0].props).toEqual({ action: "Play", name: "Intro", value: 30.5 });
      });

      it("should fall back to the action when an event has no category", () => {
        const result = MatomoImportMapper.transform(
          [makeEvent({ type: "event", eventAction: "Play", eventValue: "not-a-number" })],
          1,
          "i"
        );
        expect(result[0].event_name).toBe("Play");
        expect(result[0].props).toEqual({});
      });
    });

    describe("browser/os/device normalization", () => {
      it("should map Matomo browser names to Rybbit's", () => {
        const cases: Array<[string, string]> = [
          ["Chrome", "Chrome"],
          ["Chrome Mobile iOS", "Mobile Chrome"],
          ["Microsoft Edge", "Edge"],
          ["Samsung Browser", "Samsung Internet"],
          ["Headless Chrome", "Chrome Headless"],
          ["Unknown", ""],
        ];
        for (const [input, expected] of cases) {
          const result = MatomoImportMapper.transform([makeEvent({ browserName: input })], 1, "i");
          expect(result[0].browser).toBe(expected);
        }
      });

      it("should map Matomo operating systems to Rybbit's", () => {
        const cases: Array<[string, string]> = [
          ["Mac", "macOS"],
          ["GNU/Linux", "Linux"],
          ["Windows", "Windows"],
          ["iOS", "iOS"],
          ["Unknown", ""],
        ];
        for (const [input, expected] of cases) {
          const result = MatomoImportMapper.transform([makeEvent({ operatingSystemName: input })], 1, "i");
          expect(result[0].operating_system).toBe(expected);
        }
      });

      it("should map Matomo device types to Rybbit's", () => {
        const cases: Array<[string, string]> = [
          ["Desktop", "Desktop"],
          ["Smartphone", "Mobile"],
          ["Phablet", "Mobile"],
          ["Tablet", "Mobile"],
          ["TV", "TV"],
          ["Console", "Console"],
          ["Car browser", "Embedded"],
          ["Unknown", ""],
        ];
        for (const [input, expected] of cases) {
          const result = MatomoImportMapper.transform([makeEvent({ deviceType: input })], 1, "i");
          expect(result[0].device_type).toBe(expected);
        }
      });

      it("should keep only the browser's major version", () => {
        for (const [input, expected] of [
          ["145.0", "145"],
          ["26", "26"],
          ["", ""],
          ["UNK", ""],
        ]) {
          const result = MatomoImportMapper.transform([makeEvent({ browserVersion: input })], 1, "i");
          expect(result[0].browser_version).toBe(expected);
        }
      });
    });

    describe("language and location", () => {
      it("should normalize language codes and blank unusable ones", () => {
        const cases: Array<[string, string]> = [
          ["en-us", "en-US"],
          ["de", "de"],
          ["es-419", "es-419"],
          ["fil", "fil"],
          ["xx", ""],
          ["en_US", ""],
          ["", ""],
        ];
        for (const [input, expected] of cases) {
          const result = MatomoImportMapper.transform([makeEvent({ languageCode: input })], 1, "i");
          expect(result).toHaveLength(1);
          expect(result[0].language).toBe(expected);
        }
      });

      it("should blank Matomo's unknown country and drop its region", () => {
        const result = MatomoImportMapper.transform([makeEvent({ countryCode: "xx", regionCode: "CA" })], 1, "i");
        expect(result).toHaveLength(1);
        expect(result[0].country).toBe("");
        expect(result[0].region).toBe("");
      });

      it("should blank country codes that aren't two letters", () => {
        for (const countryCode of ["a1", "usa", ""]) {
          const result = MatomoImportMapper.transform([makeEvent({ countryCode })], 1, "i");
          expect(result).toHaveLength(1);
          expect(result[0].country).toBe("");
        }
      });

      it("should prefix the region with the country", () => {
        const result = MatomoImportMapper.transform([makeEvent({ countryCode: "ar", regionCode: "j" })], 1, "i");
        expect(result[0].region).toBe("AR-J");
      });

      it("should default missing coordinates to 0", () => {
        const result = MatomoImportMapper.transform([makeEvent({ latitude: "", longitude: "n/a" })], 1, "i");
        expect(result[0].lat).toBe(0);
        expect(result[0].lon).toBe(0);
      });
    });

    describe("screen resolution", () => {
      it("should default an unknown or oversized resolution to 0x0", () => {
        for (const resolution of ["unknown", "", "99999x1080"]) {
          const result = MatomoImportMapper.transform([makeEvent({ resolution })], 1, "i");
          expect(result).toHaveLength(1);
          expect(result[0].screen_width).toBe(0);
          expect(result[0].screen_height).toBe(0);
        }
      });
    });

    describe("referrer handling", () => {
      it("should clear a referrer from the page's own host", () => {
        const result = MatomoImportMapper.transform(
          [makeEvent({ url: "https://example.com/pricing", referrerUrl: "https://example.com/docs/intro" })],
          1,
          "i"
        );
        expect(result[0].referrer).toBe("");
        expect(result[0].channel).toBe("Direct");
      });

      it("should derive the hostname from the page rather than Matomo's site name", () => {
        const result = MatomoImportMapper.transform(
          [makeEvent({ url: "https://docs.example.com/start", referrerUrl: "https://example.com/" })],
          1,
          "i"
        );
        expect(result[0].hostname).toBe("docs.example.com");
        expect(result[0].referrer).toBe("https://example.com/");
      });

      it("should leave the referrer empty for direct visits", () => {
        const result = MatomoImportMapper.transform(
          [makeEvent({ referrerUrl: "", url: "https://example.com/" })],
          1,
          "i"
        );
        expect(result[0].referrer).toBe("");
        expect(result[0].channel).toBe("Direct");
      });
    });

    it("should truncate page titles longer than 512 characters", () => {
      const result = MatomoImportMapper.transform([makeEvent({ pageTitle: "a".repeat(600) })], 1, "i");
      expect(result).toHaveLength(1);
      expect(result[0].page_title).toHaveLength(512);
    });

    describe("invalid rows", () => {
      it("should drop rows with an invalid timestamp", () => {
        for (const timestamp of ["", "2024-06-15 14:30:00", "1718461800.5"]) {
          const result = MatomoImportMapper.transform([makeEvent({ timestamp })], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should drop rows without a valid visitor ID or visit", () => {
        const cases: Record<string, string>[] = [{ visitorId: "" }, { visitorId: "not-hex-at-all!!" }, { idVisit: "" }];
        for (const overrides of cases) {
          const result = MatomoImportMapper.transform([makeEvent(overrides)], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should drop action types Rybbit can't represent", () => {
        for (const type of ["goal", "ecommerceOrder", ""]) {
          const result = MatomoImportMapper.transform([makeEvent({ type })], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should drop pageviews without a usable URL", () => {
        for (const url of ["", "/relative/path"]) {
          const result = MatomoImportMapper.transform([makeEvent({ url })], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should drop outlinks and downloads without a target", () => {
        for (const type of ["outlink", "download"]) {
          const result = MatomoImportMapper.transform([makeEvent({ type, linkUrl: "" })], 1, "i");
          expect(result).toHaveLength(0);
        }
      });

      it("should drop events with neither a category nor an action", () => {
        const result = MatomoImportMapper.transform([makeEvent({ type: "event", eventName: "Intro" })], 1, "i");
        expect(result).toHaveLength(0);
      });

      it("should keep valid rows when mixed with invalid ones", () => {
        const events = [
          makeEvent({ url: "https://example.com/valid" }),
          makeEvent({ timestamp: "bad" }),
          makeEvent({ url: "https://example.com/also-valid" }),
        ];
        const result = MatomoImportMapper.transform(events, 1, "i");
        expect(result.map(e => e.pathname)).toEqual(["/valid", "/also-valid"]);
      });
    });

    it("should return empty array for empty input", () => {
      expect(MatomoImportMapper.transform([], 1, "i")).toHaveLength(0);
    });
  });
});
