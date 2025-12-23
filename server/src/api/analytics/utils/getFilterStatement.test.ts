import { describe, it, expect } from "vitest";
import { getFilterStatement, getSqlParam } from "./getFilterStatement.js";
import { FilterParameter } from "../types.js";

describe("getSqlParam", () => {
  describe("UTM parameters", () => {
    it("should handle utm_source", () => {
      expect(getSqlParam("utm_source")).toBe("url_parameters['utm_source']");
    });

    it("should handle utm_medium", () => {
      expect(getSqlParam("utm_medium")).toBe("url_parameters['utm_medium']");
    });

    it("should handle utm_campaign", () => {
      expect(getSqlParam("utm_campaign")).toBe("url_parameters['utm_campaign']");
    });

    it("should handle utm_term", () => {
      expect(getSqlParam("utm_term")).toBe("url_parameters['utm_term']");
    });

    it("should handle utm_content", () => {
      expect(getSqlParam("utm_content")).toBe("url_parameters['utm_content']");
    });
  });

  describe("URL parameters with url_param: prefix", () => {
    it("should handle url_param:campaign_id", () => {
      // url_param: prefix is handled at runtime for custom URL params
      expect(getSqlParam("url_param:campaign_id" as FilterParameter)).toBe("url_parameters['campaign_id']");
    });

    it("should handle url_param:ref", () => {
      expect(getSqlParam("url_param:ref" as FilterParameter)).toBe("url_parameters['ref']");
    });
  });

  describe("Special parameters", () => {
    it("should handle referrer", () => {
      expect(getSqlParam("referrer")).toBe("domainWithoutWWW(referrer)");
    });

    it("should handle entry_page", () => {
      expect(getSqlParam("entry_page")).toBe(
        "(SELECT argMin(pathname, timestamp) FROM events WHERE session_id = events.session_id)"
      );
    });

    it("should handle exit_page", () => {
      expect(getSqlParam("exit_page")).toBe(
        "(SELECT argMax(pathname, timestamp) FROM events WHERE session_id = events.session_id)"
      );
    });

    it("should handle dimensions", () => {
      expect(getSqlParam("dimensions")).toBe("concat(toString(screen_width), 'x', toString(screen_height))");
    });

    it("should handle city", () => {
      expect(getSqlParam("city")).toBe("concat(toString(region), '-', toString(city))");
    });

    it("should handle browser_version", () => {
      expect(getSqlParam("browser_version")).toBe("concat(toString(browser), ' ', toString(browser_version))");
    });

    it("should handle operating_system_version", () => {
      const result = getSqlParam("operating_system_version");
      expect(result).toContain("CASE");
      expect(result).toContain("Windows 10/11");
    });
  });

  describe("Standard parameters", () => {
    it("should return browser as-is", () => {
      expect(getSqlParam("browser")).toBe("browser");
    });

    it("should return country as-is", () => {
      expect(getSqlParam("country")).toBe("country");
    });

    it("should return pathname as-is", () => {
      expect(getSqlParam("pathname")).toBe("pathname");
    });

    it("should return device_type as-is", () => {
      expect(getSqlParam("device_type")).toBe("device_type");
    });
  });
});

describe("getFilterStatement", () => {
  describe("Empty and invalid inputs", () => {
    it("should return empty string for empty filters", () => {
      expect(getFilterStatement("")).toBe("");
    });

    it("should return empty string for empty array", () => {
      expect(getFilterStatement("[]")).toBe("");
    });

    it("should throw for invalid JSON", () => {
      expect(() => getFilterStatement("invalid json")).toThrow("Invalid JSON format");
    });
  });

  describe("Basic equals filters", () => {
    it("should handle single value equals filter", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "equals", value: ["Chrome"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND browser = 'Chrome'");
    });

    it("should handle multiple values equals filter with OR", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "equals", value: ["Chrome", "Firefox"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND (browser = 'Chrome' OR browser = 'Firefox')");
    });

    it("should handle multiple filters with AND", () => {
      const filters = JSON.stringify([
        { parameter: "browser", type: "equals", value: ["Chrome"] },
        { parameter: "country", type: "equals", value: ["US"] },
      ]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND browser = 'Chrome' AND country = 'US'");
    });
  });

  describe("Not equals filters", () => {
    it("should handle not_equals filter", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "not_equals", value: ["Chrome"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND browser != 'Chrome'");
    });

    it("should handle multiple not_equals values", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "not_equals", value: ["Chrome", "Firefox"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND (browser != 'Chrome' OR browser != 'Firefox')");
    });
  });

  describe("Contains filters", () => {
    it("should handle contains filter with LIKE and wildcards", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "contains", value: ["/blog"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND pathname LIKE '%/blog%'");
    });

    it("should handle not_contains filter", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "not_contains", value: ["/admin"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND pathname NOT LIKE '%/admin%'");
    });
  });

  describe("Regex filters", () => {
    it("should handle regex filter", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "regex", value: ["^/blog/.*"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND match(pathname, '^/blog/.*')");
    });

    it("should handle not_regex filter", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "not_regex", value: ["^/admin/.*"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND NOT match(pathname, '^/admin/.*')");
    });

    it("should throw for empty regex pattern", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "regex", value: [""] }]);
      expect(() => getFilterStatement(filters)).toThrow("Regex pattern cannot be empty");
    });

    it("should throw for invalid regex pattern", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "regex", value: ["[invalid"] }]);
      expect(() => getFilterStatement(filters)).toThrow("Invalid regex pattern");
    });

    it("should throw for regex pattern exceeding max length", () => {
      const longPattern = "a".repeat(501);
      const filters = JSON.stringify([{ parameter: "pathname", type: "regex", value: [longPattern] }]);
      expect(() => getFilterStatement(filters)).toThrow("Regex pattern too long");
    });
  });

  describe("Numeric comparison filters", () => {
    it("should handle greater_than filter", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "greater_than", value: ["40.0"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND lat > 40");
    });

    it("should handle less_than filter", () => {
      const filters = JSON.stringify([{ parameter: "lon", type: "less_than", value: ["-70.0"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND lon < -70");
    });

    it("should throw for invalid numeric value", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "greater_than", value: ["not-a-number"] }]);
      expect(() => getFilterStatement(filters)).toThrow("Invalid numeric value");
    });
  });

  describe("Lat/Lon tolerance handling", () => {
    it("should handle lat equals with tolerance", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "equals", value: ["40.7128"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("lat >= 40.7118");
      expect(result).toContain("lat <= 40.7138");
    });

    it("should handle lon equals with multiple values", () => {
      const filters = JSON.stringify([{ parameter: "lon", type: "equals", value: ["-74.006", "-73.5"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("lon >= -74.007");
      expect(result).toContain("lon <= -74.005");
      expect(result).toContain("lon >= -73.501");
      expect(result).toContain("lon <= -73.499");
      expect(result).toContain(" OR ");
    });
  });

  describe("User ID special handling", () => {
    it("should check both user_id and identified_user_id for equals", () => {
      const filters = JSON.stringify([{ parameter: "user_id", type: "equals", value: ["user123"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND (user_id = 'user123' OR identified_user_id = 'user123')");
    });

    it("should check both user_id and identified_user_id for not_equals", () => {
      const filters = JSON.stringify([{ parameter: "user_id", type: "not_equals", value: ["user123"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND (user_id != 'user123' AND identified_user_id != 'user123')");
    });

    it("should handle multiple user IDs with equals using OR", () => {
      const filters = JSON.stringify([{ parameter: "user_id", type: "equals", value: ["user1", "user2"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("user_id = 'user1' OR identified_user_id = 'user1'");
      expect(result).toContain("user_id = 'user2' OR identified_user_id = 'user2'");
      expect(result).toContain(" OR ");
    });

    it("should handle multiple user IDs with not_equals using AND", () => {
      const filters = JSON.stringify([{ parameter: "user_id", type: "not_equals", value: ["user1", "user2"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("user_id != 'user1' AND identified_user_id != 'user1'");
      expect(result).toContain("user_id != 'user2' AND identified_user_id != 'user2'");
    });
  });

  describe("Event name session-level filter", () => {
    it("should create subquery for event_name filter", () => {
      const filters = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["click"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("session_id IN");
      expect(result).toContain("SELECT DISTINCT session_id");
      expect(result).toContain("FROM events");
      expect(result).toContain("event_name = 'click'");
    });

    it("should include siteId in event_name subquery when provided", () => {
      const filters = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["click"] }]);
      const result = getFilterStatement(filters, 123);
      expect(result).toContain("site_id = 123");
    });

    it("should include timeStatement in event_name subquery when provided", () => {
      const filters = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["click"] }]);
      const result = getFilterStatement(filters, 123, "AND timestamp > now() - INTERVAL 1 DAY");
      expect(result).toContain("timestamp > now() - INTERVAL 1 DAY");
    });
  });

  describe("Entry page filter", () => {
    it("should create subquery for entry_page filter", () => {
      const filters = JSON.stringify([{ parameter: "entry_page", type: "equals", value: ["/home"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("session_id IN");
      expect(result).toContain("argMin(pathname, timestamp) AS entry_pathname");
      expect(result).toContain("entry_pathname = '/home'");
    });

    it("should handle multiple entry_page values", () => {
      const filters = JSON.stringify([{ parameter: "entry_page", type: "equals", value: ["/home", "/landing"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("entry_pathname = '/home'");
      expect(result).toContain("entry_pathname = '/landing'");
      expect(result).toContain(" OR ");
    });

    it("should handle entry_page contains filter", () => {
      const filters = JSON.stringify([{ parameter: "entry_page", type: "contains", value: ["/blog"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("entry_pathname LIKE '%/blog%'");
    });
  });

  describe("Exit page filter", () => {
    it("should create subquery for exit_page filter", () => {
      const filters = JSON.stringify([{ parameter: "exit_page", type: "equals", value: ["/checkout"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("session_id IN");
      expect(result).toContain("argMax(pathname, timestamp) AS exit_pathname");
      expect(result).toContain("exit_pathname = '/checkout'");
    });

    it("should handle multiple exit_page values", () => {
      const filters = JSON.stringify([{ parameter: "exit_page", type: "equals", value: ["/checkout", "/thank-you"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("exit_pathname = '/checkout'");
      expect(result).toContain("exit_pathname = '/thank-you'");
      expect(result).toContain(" OR ");
    });
  });

  describe("UTM filter handling", () => {
    it("should use url_parameters map for utm_source", () => {
      const filters = JSON.stringify([{ parameter: "utm_source", type: "equals", value: ["google"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND url_parameters['utm_source'] = 'google'");
    });

    it("should use url_parameters map for utm_medium", () => {
      const filters = JSON.stringify([{ parameter: "utm_medium", type: "equals", value: ["cpc"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND url_parameters['utm_medium'] = 'cpc'");
    });
  });

  describe("SQL injection prevention", () => {
    it("should escape single quotes in values", () => {
      const filters = JSON.stringify([
        { parameter: "browser", type: "equals", value: ["Chrome'; DROP TABLE users;--"] },
      ]);
      const result = getFilterStatement(filters);
      // SqlString.escape escapes the single quote with a backslash, making the SQL safe
      expect(result).toContain("\\'");
      expect(result).toBe("AND browser = 'Chrome\\'; DROP TABLE users;--'");
    });

    it("should escape backslashes in values", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "equals", value: ["/path\\with\\backslashes"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("\\\\");
    });
  });

  describe("Special parameter transformations", () => {
    it("should use domainWithoutWWW for referrer", () => {
      const filters = JSON.stringify([{ parameter: "referrer", type: "equals", value: ["google.com"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND domainWithoutWWW(referrer) = 'google.com'");
    });

    it("should use dimensions concat for dimensions filter", () => {
      const filters = JSON.stringify([{ parameter: "dimensions", type: "equals", value: ["1920x1080"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("concat(toString(screen_width), 'x', toString(screen_height))");
      expect(result).toContain("= '1920x1080'");
    });

    it("should use city concat for city filter", () => {
      const filters = JSON.stringify([{ parameter: "city", type: "equals", value: ["CA-San Francisco"] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("concat(toString(region), '-', toString(city))");
      expect(result).toContain("= 'CA-San Francisco'");
    });
  });

  describe("Complex multi-filter scenarios", () => {
    it("should handle multiple different filter types together", () => {
      const filters = JSON.stringify([
        { parameter: "browser", type: "equals", value: ["Chrome"] },
        { parameter: "pathname", type: "contains", value: ["/blog"] },
        { parameter: "country", type: "not_equals", value: ["CN"] },
      ]);
      const result = getFilterStatement(filters);
      expect(result).toContain("browser = 'Chrome'");
      expect(result).toContain("pathname LIKE '%/blog%'");
      expect(result).toContain("country != 'CN'");
      // 1 at start + 2 between 3 filters = 3 ANDs total
      expect(result.match(/AND/g)?.length).toBe(3);
    });
  });
});
