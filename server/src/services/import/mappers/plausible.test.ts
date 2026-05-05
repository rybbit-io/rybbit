import { describe, it, expect } from "vitest";
import { PlausibleImportMapper } from "./plausible.js";

const TEST_SESSION_ID = "9e3779b1-3c6e-4362-da4f-81b88c81f013";
const TEST_USER_ID = "12345678-90ab-cdef-1234-567890abcdef";

function makeEvent(overrides: Record<string, string> = {}) {
  return {
    timestamp: "2024-06-15 14:30:00",
    session_id: TEST_SESSION_ID,
    user_id: TEST_USER_ID,
    hostname: "example.com",
    pathname: "/blog/post-1",
    querystring: "?utm_source=google",
    referrer: "https://google.com",
    browser: "Chrome",
    browser_version: "125",
    operating_system: "Windows",
    operating_system_version: "10",
    device_type: "Desktop",
    country: "US",
    region: "US-CA",
    city: "San Francisco",
    type: "pageview",
    event_name: "",
    props: "{}",
    ...overrides,
  };
}

describe("PlausibleImportMapper", () => {
  describe("transform", () => {
    it("should transform a valid pageview event", () => {
      const events = [makeEvent()];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        site_id: 1,
        timestamp: "2024-06-15 14:30:00",
        session_id: TEST_SESSION_ID,
        user_id: TEST_USER_ID,
        hostname: "example.com",
        pathname: "/blog/post-1",
        querystring: "?utm_source=google",
        referrer: "https://google.com",
        browser: "Chrome",
        browser_version: "125",
        operating_system: "Windows",
        operating_system_version: "10",
        device_type: "Desktop",
        country: "US",
        region: "US-CA",
        city: "San Francisco",
        type: "pageview",
        event_name: "",
        props: {},
        import_id: "import-1",
        language: "",
        page_title: "",
        lat: 0,
        lon: 0,
        screen_width: 0,
        screen_height: 0,
      });
    });

    it("should transform a custom event", () => {
      const events = [
        makeEvent({
          type: "custom_event",
          event_name: "SignUp",
          props: '{"plan":"pro"}',
        }),
      ];
      const result = PlausibleImportMapper.transform(events, 2, "import-2");

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("custom_event");
      expect(result[0].event_name).toBe("SignUp");
      expect(result[0].props).toEqual({ plan: "pro" });
    });

    it("should skip events with invalid timestamps", () => {
      const events = [makeEvent({ timestamp: "not-a-date" })];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(0);
    });

    it("should skip events with invalid type", () => {
      const events = [makeEvent({ type: "unknown_type" })];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(0);
    });

    it("should handle empty props gracefully", () => {
      const events = [makeEvent({ props: "" })];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(1);
      expect(result[0].props).toEqual({});
    });

    it("should handle invalid JSON in props", () => {
      const events = [makeEvent({ props: "{bad json" })];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(1);
      expect(result[0].props).toEqual({});
    });

    it("should transform multiple events", () => {
      const events = [
        makeEvent({ pathname: "/page-1" }),
        makeEvent({ pathname: "/page-2" }),
        makeEvent({ pathname: "/page-3" }),
      ];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(3);
      expect(result.map((e) => e.pathname)).toEqual([
        "/page-1",
        "/page-2",
        "/page-3",
      ]);
    });

    it("should skip events with hostname exceeding max length", () => {
      const events = [makeEvent({ hostname: "a".repeat(254) })];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(0);
    });

    it("should handle empty optional fields", () => {
      const events = [
        makeEvent({
          referrer: "",
          browser_version: "",
          operating_system_version: "",
          country: "",
          region: "",
          city: "",
          querystring: "",
        }),
      ];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(1);
      expect(result[0].referrer).toBe("");
      expect(result[0].country).toBe("");
    });

    it("should compute channel from referrer", () => {
      const events = [
        makeEvent({ referrer: "https://google.com", querystring: "" }),
      ];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(1);
      // getChannel should classify google.com as organic search
      expect(result[0].channel).toBeTruthy();
    });

    it("should return empty array for empty input", () => {
      const result = PlausibleImportMapper.transform([], 1, "import-1");
      expect(result).toHaveLength(0);
    });

    it("should filter out invalid events and keep valid ones", () => {
      const events = [
        makeEvent({ pathname: "/valid" }),
        makeEvent({ timestamp: "bad" }),
        makeEvent({ pathname: "/also-valid" }),
      ];
      const result = PlausibleImportMapper.transform(events, 1, "import-1");
      expect(result).toHaveLength(2);
      expect(result[0].pathname).toBe("/valid");
      expect(result[1].pathname).toBe("/also-valid");
    });
  });
});
