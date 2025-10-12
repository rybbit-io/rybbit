import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { patternToRegex, findMatchingPattern, debounce, isOutboundLink, parseJsonSafely } from "./utils.js";

describe("utils", () => {
  describe("patternToRegex", () => {
    it("should convert simple wildcards", () => {
      const regex = patternToRegex("/api/*/users");
      expect(regex.test("/api/v1/users")).toBe(true);
      expect(regex.test("/api/v2/users")).toBe(true);
      expect(regex.test("/api/v1/v2/users")).toBe(false);
    });

    it("should convert double wildcards", () => {
      const regex = patternToRegex("/api/**/users");
      expect(regex.test("/api/v1/users")).toBe(true);
      expect(regex.test("/api/v1/v2/users")).toBe(true);
      expect(regex.test("/api/users")).toBe(true); // ** can match empty path

      // Test ** at beginning
      const regex2 = patternToRegex("/**/users");
      expect(regex2.test("/users")).toBe(true);
      expect(regex2.test("/api/users")).toBe(true);
      expect(regex2.test("/api/v1/users")).toBe(true);
    });

    it("should escape special regex characters", () => {
      const regex = patternToRegex("/api/users.json");
      expect(regex.test("/api/users.json")).toBe(true);
      expect(regex.test("/api/usersXjson")).toBe(false);
    });

    it("should handle complex patterns", () => {
      const regex = patternToRegex("/api/*/users/**/*.json");
      expect(regex.test("/api/v1/users/123/profile.json")).toBe(true);
      expect(regex.test("/api/v1/users/admin/settings/config.json")).toBe(true);
      expect(regex.test("/api/v1/posts/123/data.json")).toBe(false);
    });
  });

  describe("findMatchingPattern", () => {
    const patterns = ["/api/*/users", "/admin/**", "*.json"];

    it("should find matching pattern", () => {
      expect(findMatchingPattern("/api/v1/users", patterns)).toBe("/api/*/users");
      expect(findMatchingPattern("/admin/settings/general", patterns)).toBe("/admin/**");
    });

    it("should return null for no match", () => {
      expect(findMatchingPattern("/public/images/logo.png", patterns)).toBe(null);
    });

    it("should handle invalid patterns gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const invalidPatterns = ["[invalid"];
      expect(findMatchingPattern("/test", invalidPatterns)).toBe(null);
      consoleSpy.mockRestore();
    });
  });

  describe("debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should debounce function calls", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn("a");
      debouncedFn("b");
      debouncedFn("c");

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith("c");
    });

    it("should reset timer on each call", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe("isOutboundLink", () => {
    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, "location", {
        value: {
          hostname: "example.com",
        },
        writable: true,
      });
    });

    it("should detect outbound links", () => {
      expect(isOutboundLink("https://external.com/page")).toBe(true);
      expect(isOutboundLink("http://another-site.org")).toBe(true);
    });

    it("should detect internal links", () => {
      expect(isOutboundLink("https://example.com/page")).toBe(false);
      expect(isOutboundLink("/relative/path")).toBe(false);
    });

    it("should handle invalid URLs", () => {
      expect(isOutboundLink("not-a-url")).toBe(false);
      expect(isOutboundLink("")).toBe(false);
    });
  });

  describe("parseJsonSafely", () => {
    it("should parse valid JSON", () => {
      expect(parseJsonSafely('["a", "b"]', [])).toEqual(["a", "b"]);
      expect(parseJsonSafely('{"key": "value"}', {})).toEqual({ key: "value" });
    });

    it("should return fallback for invalid JSON", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(parseJsonSafely("invalid", [])).toEqual([]);
      expect(parseJsonSafely("{invalid}", {})).toEqual({});
      consoleSpy.mockRestore();
    });

    it("should return fallback for null/empty values", () => {
      expect(parseJsonSafely(null, ["default"])).toEqual(["default"]);
      expect(parseJsonSafely("", { default: true })).toEqual({ default: true });
    });

    it("should enforce array type when fallback is array", () => {
      expect(parseJsonSafely('{"not": "array"}', [])).toEqual([]);
    });
  });
});
