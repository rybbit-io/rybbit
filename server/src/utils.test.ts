import { describe, it, expect } from "vitest";
import { normalizeOrigin } from "./utils.js";

describe("normalizeOrigin", () => {
  describe("Basic subdomain removal", () => {
    it("should remove www subdomain", () => {
      expect(normalizeOrigin("www.example.com")).toBe("example.com");
      expect(normalizeOrigin("https://www.example.com")).toBe("example.com");
    });

    it("should remove single-level subdomains", () => {
      expect(normalizeOrigin("api.example.com")).toBe("example.com");
      expect(normalizeOrigin("blog.example.com")).toBe("example.com");
      expect(normalizeOrigin("cdn.example.com")).toBe("example.com");
      expect(normalizeOrigin("https://api.example.com")).toBe("example.com");
    });

    it("should remove multi-level subdomains", () => {
      expect(normalizeOrigin("api.v1.example.com")).toBe("example.com");
      expect(normalizeOrigin("www.blog.example.com")).toBe("example.com");
      expect(normalizeOrigin("https://api.v2.staging.example.com")).toBe("example.com");
    });
  });

  describe("Multi-level TLD handling", () => {
    it("should handle .co.uk domains correctly", () => {
      expect(normalizeOrigin("www.example.co.uk")).toBe("example.co.uk");
      expect(normalizeOrigin("api.example.co.uk")).toBe("example.co.uk");
      expect(normalizeOrigin("https://subdomain.example.co.uk")).toBe("example.co.uk");
    });

    it("should handle .com.au domains correctly", () => {
      expect(normalizeOrigin("www.example.com.au")).toBe("example.com.au");
      expect(normalizeOrigin("blog.example.com.au")).toBe("example.com.au");
    });

    it("should handle .org.uk domains correctly", () => {
      expect(normalizeOrigin("www.charity.org.uk")).toBe("charity.org.uk");
      expect(normalizeOrigin("subdomain.charity.org.uk")).toBe("charity.org.uk");
    });

    it("should handle .gov.uk domains correctly", () => {
      expect(normalizeOrigin("www.agency.gov.uk")).toBe("agency.gov.uk");
      expect(normalizeOrigin("portal.agency.gov.uk")).toBe("agency.gov.uk");
    });

    it("should handle .edu.au domains correctly", () => {
      expect(normalizeOrigin("www.university.edu.au")).toBe("university.edu.au");
      expect(normalizeOrigin("library.university.edu.au")).toBe("university.edu.au");
    });
  });

  describe("URL vs hostname input handling", () => {
    it("should handle full URLs with protocols", () => {
      expect(normalizeOrigin("https://www.example.com")).toBe("example.com");
      expect(normalizeOrigin("http://api.example.com")).toBe("example.com");
      expect(normalizeOrigin("https://subdomain.example.co.uk")).toBe("example.co.uk");
    });

    it("should handle URLs with paths", () => {
      expect(normalizeOrigin("https://www.example.com/path/to/page")).toBe("example.com");
      expect(normalizeOrigin("https://api.example.com/v1/users")).toBe("example.com");
    });

    it("should handle URLs with query parameters", () => {
      expect(normalizeOrigin("https://www.example.com?param=value")).toBe("example.com");
      expect(normalizeOrigin("https://api.example.com/search?q=test")).toBe("example.com");
    });

    it("should handle URLs with fragments", () => {
      expect(normalizeOrigin("https://www.example.com#section")).toBe("example.com");
      expect(normalizeOrigin("https://blog.example.com/post#comments")).toBe("example.com");
    });

    it("should handle URLs with ports", () => {
      expect(normalizeOrigin("https://www.example.com:8080")).toBe("example.com");
      expect(normalizeOrigin("http://api.example.com:3000")).toBe("example.com");
    });

    it("should handle plain hostnames without protocol", () => {
      expect(normalizeOrigin("www.example.com")).toBe("example.com");
      expect(normalizeOrigin("api.example.com")).toBe("example.com");
      expect(normalizeOrigin("subdomain.example.co.uk")).toBe("example.co.uk");
    });
  });

  describe("Edge cases", () => {
    it("should handle localhost", () => {
      expect(normalizeOrigin("localhost")).toBe("localhost");
      expect(normalizeOrigin("http://localhost")).toBe("localhost");
      expect(normalizeOrigin("https://localhost:3000")).toBe("localhost");
    });

    it("should handle IP addresses", () => {
      expect(normalizeOrigin("192.168.1.1")).toBe("192.168.1.1");
      expect(normalizeOrigin("http://192.168.1.1")).toBe("192.168.1.1");
      expect(normalizeOrigin("https://10.0.0.1:8080")).toBe("10.0.0.1");
    });

    it("should handle domains that are already root domains", () => {
      expect(normalizeOrigin("example.com")).toBe("example.com");
      expect(normalizeOrigin("https://example.com")).toBe("example.com");
      expect(normalizeOrigin("example.co.uk")).toBe("example.co.uk");
    });

    it("should handle single-word domains", () => {
      expect(normalizeOrigin("localhost")).toBe("localhost");
      expect(normalizeOrigin("intranet")).toBe("intranet");
    });

    it("should handle domains with hyphens", () => {
      expect(normalizeOrigin("www.my-site.com")).toBe("my-site.com");
      expect(normalizeOrigin("api.my-awesome-site.co.uk")).toBe("my-awesome-site.co.uk");
    });

    it("should handle domains with numbers", () => {
      expect(normalizeOrigin("www.site123.com")).toBe("site123.com");
      expect(normalizeOrigin("api.123site.com")).toBe("123site.com");
    });
  });

  describe("Error handling", () => {
    it("should handle empty strings", () => {
      expect(normalizeOrigin("")).toBe("");
    });

    it("should handle invalid URLs gracefully", () => {
      // These should not throw errors and should return reasonable results
      expect(normalizeOrigin("not-a-valid-url")).toBe("not-a-valid-url");
      expect(normalizeOrigin("://invalid")).toBe("://invalid");
    });

    it("should handle URLs with invalid characters", () => {
      // PSL should handle these gracefully
      expect(normalizeOrigin("www.example_.com")).toBe("example_.com");
    });
  });

  describe("Real-world examples", () => {
    it("should handle common website patterns", () => {
      // E-commerce sites
      expect(normalizeOrigin("shop.example.com")).toBe("example.com");
      expect(normalizeOrigin("store.example.com")).toBe("example.com");

      // API endpoints
      expect(normalizeOrigin("api.v1.example.com")).toBe("example.com");
      expect(normalizeOrigin("rest.api.example.com")).toBe("example.com");

      // CDN patterns
      expect(normalizeOrigin("cdn.assets.example.com")).toBe("example.com");
      expect(normalizeOrigin("static.example.com")).toBe("example.com");

      // Regional subdomains
      expect(normalizeOrigin("us.example.com")).toBe("example.com");
      expect(normalizeOrigin("eu.example.com")).toBe("example.com");
    });

    it("should handle staging and development environments", () => {
      expect(normalizeOrigin("staging.example.com")).toBe("example.com");
      expect(normalizeOrigin("dev.example.com")).toBe("example.com");
      expect(normalizeOrigin("test.api.example.com")).toBe("example.com");
    });

    it("should handle international domains", () => {
      expect(normalizeOrigin("www.example.de")).toBe("example.de");
      expect(normalizeOrigin("api.example.fr")).toBe("example.fr");
      expect(normalizeOrigin("subdomain.example.jp")).toBe("example.jp");
    });
  });

  describe("Performance considerations", () => {
    it("should handle multiple calls efficiently", () => {
      // Test that the function can handle multiple calls without issues
      const domains = [
        "www.example.com",
        "api.example.com",
        "blog.example.co.uk",
        "cdn.assets.example.org",
        "https://shop.example.net",
      ];

      const results = domains.map(domain => normalizeOrigin(domain));

      expect(results).toEqual(["example.com", "example.com", "example.co.uk", "example.org", "example.net"]);
    });
  });
});
