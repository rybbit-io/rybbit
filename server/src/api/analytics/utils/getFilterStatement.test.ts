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

  describe("Feature flag parameters", () => {
    it("should handle feature_flag:key", () => {
      expect(getSqlParam("feature_flag:new_checkout" as FilterParameter)).toBe("feature_flags['new_checkout']");
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

    it("should handle multiple not_equals values with NOT IN semantics", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "not_equals", value: ["Chrome", "Firefox"] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND (browser != 'Chrome' AND browser != 'Firefox')");
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

  describe("Channel session acquisition filter", () => {
    it("should filter by the first attributed channel in each session", () => {
      const filters = JSON.stringify([{ parameter: "channel", type: "equals", value: ["Organic Search"] }]);
      const result = getFilterStatement(filters, 123, "AND timestamp > now() - INTERVAL 1 DAY");

      expect(result).toContain("session_id IN");
      expect(result).toContain("argMinIf(channel, timestamp, channel NOT IN ('Direct', 'Internal', ''))");
      expect(result).toContain("AS session_channel");
      expect(result).toContain("site_id = 123");
      expect(result).toContain("timestamp > now() - INTERVAL 1 DAY");
      expect(result).toContain("session_channel = 'Organic Search'");
    });

    it("should allow callers to opt out of session-level channel filtering", () => {
      const filters = JSON.stringify([{ parameter: "channel", type: "equals", value: ["Organic Search"] }]);
      const result = getFilterStatement(filters, undefined, undefined, {
        sessionLevelParams: ["event_name"],
      });

      expect(result).toBe("AND channel = 'Organic Search'");
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

  describe("Null check filters on standard parameters", () => {
    it("should handle is_null on a standard column", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "is_null", value: [] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND (browser IS NULL OR browser = '')");
    });

    it("should handle is_not_null on a standard column", () => {
      const filters = JSON.stringify([{ parameter: "country", type: "is_not_null", value: [] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND (country IS NOT NULL AND country != '')");
    });

    it("should apply is_null to transformed expressions", () => {
      const filters = JSON.stringify([{ parameter: "utm_source", type: "is_null", value: [] }]);
      const result = getFilterStatement(filters);
      expect(result).toBe("AND (url_parameters['utm_source'] IS NULL OR url_parameters['utm_source'] = '')");
    });

    it("should handle is_not_null inside a session-level subquery", () => {
      const filters = JSON.stringify([{ parameter: "event_name", type: "is_not_null", value: [] }]);
      const result = getFilterStatement(filters);
      expect(result).toContain("session_id IN");
      expect(result).toContain("(event_name IS NOT NULL AND event_name != '')");
    });
  });

  describe("Starts with and ends with filters", () => {
    it("should append % for starts_with", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "starts_with", value: ["/blog"] }]);
      expect(getFilterStatement(filters)).toBe("AND pathname LIKE '/blog%'");
    });

    it("should prepend % for ends_with", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "ends_with", value: ["/checkout"] }]);
      expect(getFilterStatement(filters)).toBe("AND pathname LIKE '%/checkout'");
    });

    it("should OR-join multiple starts_with values", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "starts_with", value: ["/blog", "/docs"] }]);
      expect(getFilterStatement(filters)).toBe("AND (pathname LIKE '/blog%' OR pathname LIKE '/docs%')");
    });

    it("escapes % in user values so they match literally", () => {
      // A literal "%" in the value is escaped to \% in the LIKE pattern, so
      // starts_with "50%" only matches strings starting with the literal "50%".
      const filters = JSON.stringify([{ parameter: "pathname", type: "starts_with", value: ["50%"] }]);
      expect(getFilterStatement(filters)).toBe("AND pathname LIKE '50\\\\%%'");
    });

    it("escapes _ in user values so it matches literally", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "ends_with", value: ["a_b"] }]);
      expect(getFilterStatement(filters)).toBe("AND pathname LIKE '%a\\\\_b'");
    });

    it("escapes backslashes in user values before LIKE wrapping", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "starts_with", value: ["C:\\temp"] }]);
      // The value's backslash is LIKE-escaped to \\, then SqlString doubles
      // each backslash in the string literal.
      expect(getFilterStatement(filters)).toBe("AND pathname LIKE 'C:\\\\\\\\temp%'");
    });
  });

  describe("Greater/less than or equal filters", () => {
    it("should handle greater_than_or_equal", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "greater_than_or_equal", value: ["40.5"] }]);
      expect(getFilterStatement(filters)).toBe("AND lat >= 40.5");
    });

    it("should handle less_than_or_equal", () => {
      const filters = JSON.stringify([{ parameter: "lon", type: "less_than_or_equal", value: ["-70.25"] }]);
      expect(getFilterStatement(filters)).toBe("AND lon <= -70.25");
    });

    it("should only use the first value for numeric comparisons", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "greater_than_or_equal", value: ["10", "20"] }]);
      expect(getFilterStatement(filters)).toBe("AND lat >= 10");
    });

    it("should coerce numeric comparisons on non-numeric parameters", () => {
      // Pinned behavior: any parameter accepts numeric comparison types; the
      // value is coerced with Number() and inlined unquoted.
      const filters = JSON.stringify([{ parameter: "pathname", type: "greater_than_or_equal", value: ["10"] }]);
      expect(getFilterStatement(filters)).toBe("AND pathname >= 10");
    });

    it("should throw for non-numeric value with greater_than_or_equal", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "greater_than_or_equal", value: ["abc"] }]);
      expect(() => getFilterStatement(filters)).toThrow("Invalid numeric value");
    });
  });

  describe("Multi-value wildcard filters", () => {
    it("should OR-join multiple contains values with % wrapping", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "contains", value: ["/blog", "/docs"] }]);
      expect(getFilterStatement(filters)).toBe("AND (pathname LIKE '%/blog%' OR pathname LIKE '%/docs%')");
    });

    it("should AND-join multiple not_contains values", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "not_contains", value: ["/admin", "/internal"] }]);
      expect(getFilterStatement(filters)).toBe(
        "AND (pathname NOT LIKE '%/admin%' AND pathname NOT LIKE '%/internal%')"
      );
    });

    it("escapes % and _ in multi-value contains so they match literally", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "contains", value: ["100%", "a_b"] }]);
      expect(getFilterStatement(filters)).toBe("AND (pathname LIKE '%100\\\\%%' OR pathname LIKE '%a\\\\_b%')");
    });

    it("should OR-join multiple contains values on transformed params", () => {
      const filters = JSON.stringify([{ parameter: "utm_source", type: "contains", value: ["google", "bing"] }]);
      expect(getFilterStatement(filters)).toBe(
        "AND (url_parameters['utm_source'] LIKE '%google%' OR url_parameters['utm_source'] LIKE '%bing%')"
      );
    });
  });

  describe("Generic session-level subqueries via sessionLevelParams", () => {
    const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

    it("should route arbitrary params to a session-level subquery when configured", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "equals", value: ["/pricing"] }]);
      const result = getFilterStatement(filters, undefined, undefined, { sessionLevelParams: ["pathname"] });
      expect(normalize(result)).toBe(
        "AND session_id IN ( SELECT DISTINCT session_id FROM events WHERE pathname = '/pricing' )"
      );
    });

    it("should include siteId and time filter in the generic session subquery", () => {
      const filters = JSON.stringify([{ parameter: "hostname", type: "equals", value: ["app.example.com"] }]);
      const result = getFilterStatement(filters, 42, "AND timestamp > now() - INTERVAL 1 DAY", {
        sessionLevelParams: ["hostname"],
      });
      expect(normalize(result)).toBe(
        "AND session_id IN ( SELECT DISTINCT session_id FROM events WHERE site_id = 42 AND timestamp > now() - INTERVAL 1 DAY AND hostname = 'app.example.com' )"
      );
    });

    it("should handle negated filters inside the session subquery", () => {
      // Note the semantics: this selects sessions containing at least one event
      // whose hostname differs, not sessions with no matching event.
      const filters = JSON.stringify([{ parameter: "hostname", type: "not_equals", value: ["bad.example.com"] }]);
      const result = getFilterStatement(filters, undefined, undefined, { sessionLevelParams: ["hostname"] });
      expect(normalize(result)).toBe(
        "AND session_id IN ( SELECT DISTINCT session_id FROM events WHERE hostname != 'bad.example.com' )"
      );
    });

    it("should AND-join multi-value not_contains inside the session subquery", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "not_contains", value: ["/admin", "/debug"] }]);
      const result = getFilterStatement(filters, undefined, undefined, { sessionLevelParams: ["pathname"] });
      expect(normalize(result)).toBe(
        "AND session_id IN ( SELECT DISTINCT session_id FROM events WHERE (pathname NOT LIKE '%/admin%' AND pathname NOT LIKE '%/debug%') )"
      );
    });

    it("applies getSqlParam transforms inside generic session subqueries", () => {
      // Transformed params like city keep their concat() expression when
      // routed session-level.
      const filters = JSON.stringify([{ parameter: "city", type: "equals", value: ["CA-San Francisco"] }]);
      const result = getFilterStatement(filters, undefined, undefined, { sessionLevelParams: ["city"] });
      expect(normalize(result)).toBe(
        "AND session_id IN ( SELECT DISTINCT session_id FROM events WHERE concat(toString(region), '-', toString(city)) = 'CA-San Francisco' )"
      );
    });
  });

  describe("fieldMappings option", () => {
    it("should rewrite mapped expressions to CTE column names", () => {
      const filters = JSON.stringify([{ parameter: "utm_source", type: "equals", value: ["google"] }]);
      const result = getFilterStatement(filters, undefined, undefined, {
        fieldMappings: { "url_parameters['utm_source']": "utm_source" },
      });
      expect(result).toBe("AND utm_source = 'google'");
    });

    it("should apply multiple mappings", () => {
      const filters = JSON.stringify([
        { parameter: "utm_source", type: "equals", value: ["google"] },
        { parameter: "utm_medium", type: "contains", value: ["cpc"] },
      ]);
      const result = getFilterStatement(filters, undefined, undefined, {
        fieldMappings: {
          "url_parameters['utm_source']": "utm_source",
          "url_parameters['utm_medium']": "utm_medium",
        },
      });
      expect(result).toBe("AND utm_source = 'google' AND utm_medium LIKE '%cpc%'");
    });

    it("does not rewrite mapping tokens inside user-supplied string literals", () => {
      // Mappings are applied where column identifiers are emitted, never as a
      // rewrite over the finished SQL, so a filter VALUE that happens to equal
      // a mapped token is left untouched.
      const filters = JSON.stringify([
        { parameter: "pathname", type: "equals", value: ["/pricing"] },
        { parameter: "page_title", type: "equals", value: ["pathname"] },
      ]);
      const result = getFilterStatement(filters, undefined, undefined, {
        fieldMappings: { pathname: "page_path" },
      });
      expect(result).toBe("AND page_path = '/pricing' AND page_title = 'pathname'");
    });

    it("should apply mappings to the lat/lon tolerance branch", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "equals", value: ["40.7128"] }]);
      const result = getFilterStatement(filters, undefined, undefined, {
        fieldMappings: { lat: "latitude" },
      });
      expect(result).toContain("latitude >= 40.7118");
      expect(result).toContain("latitude <= 40.7138");
      expect(result).not.toContain("(lat >=");
    });

    it("should apply mappings to negated multi-value lat/lon filters", () => {
      const filters = JSON.stringify([{ parameter: "lon", type: "not_equals", value: ["-74.006", "-73.5"] }]);
      const result = getFilterStatement(filters, undefined, undefined, {
        fieldMappings: { lon: "longitude" },
      });
      expect(result).toContain("NOT ((longitude >= -74.007 AND longitude <= -74.005)");
      expect(result).toContain("(longitude >= -73.501 AND longitude <= -73.499)");
    });

    it("does not rewrite quote-containing mapping tokens inside values", () => {
      // Values containing a production-shaped mapping token
      // (url_parameters['x']) also survive intact.
      const filters = JSON.stringify([
        { parameter: "page_title", type: "equals", value: ["url_parameters['utm_source']"] },
      ]);
      const result = getFilterStatement(filters, undefined, undefined, {
        fieldMappings: { "url_parameters['utm_source']": "utm_source" },
      });
      expect(result).toBe("AND page_title = 'url_parameters[\\'utm_source\\']'");
    });
  });
});
