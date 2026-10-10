import { describe, it, expect } from "vitest";
import { FastifyRequest } from "fastify";
import { UAParser } from "ua-parser-js";
import { getDeviceType, getIpAddress, normalizeOrigin } from "./utils.js";

function requestWithHeaders(headers: Record<string, string | string[]>, ip = "198.51.100.10"): FastifyRequest {
  return { headers, ip } as unknown as FastifyRequest;
}

describe("getIpAddress", () => {
  it("uses X-Real-IP before all other headers", () => {
    const request = requestWithHeaders({
      "cf-connecting-ip": "198.51.100.20",
      "x-forwarded-for": "203.0.113.10, 198.51.100.20",
      "x-real-ip": "192.0.2.10",
    });

    expect(getIpAddress(request)).toBe("192.0.2.10");
  });

  it("uses the first X-Forwarded-For IP before Cloudflare's connecting IP", () => {
    // The proxied case: a first-party proxy (e.g. CloudFront) forwards the visitor
    // in X-Forwarded-For, while CF-Connecting-IP is our Cloudflare edge seeing the
    // proxy's egress node. The visitor must win.
    const request = requestWithHeaders({
      "cf-connecting-ip": "198.51.100.20",
      "x-forwarded-for": "203.0.113.10, 198.51.100.20",
    });

    expect(getIpAddress(request)).toBe("203.0.113.10");
  });

  it("falls back to Cloudflare's connecting IP when no forwarded headers are present", () => {
    expect(getIpAddress(requestWithHeaders({ "cf-connecting-ip": "203.0.113.10" }))).toBe("203.0.113.10");
  });

  it("falls back to the request IP", () => {
    expect(getIpAddress(requestWithHeaders({}))).toBe("198.51.100.10");
  });
});

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

describe("getDeviceType", () => {
  const deviceType = (userAgent: string, width: number, height: number) =>
    getDeviceType(width, height, UAParser(userAgent));

  it("uses ua-parser's device type to tell tablets and TVs from phones", () => {
    const androidTablet =
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
    const androidPhone =
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
    const iPadChrome =
      "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1";
    const tizenTv =
      "Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0) AppleWebKit/537.36 (KHTML, like Gecko) 120.0.6099.5/8.0 TV Safari/537.36";
    const quest =
      "Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/38.0.0.0 SamsungBrowser/4.0 Chrome/132.0.0.0 VR Safari/537.36";

    expect(deviceType(androidTablet, 800, 1280)).toBe("Tablet");
    expect(deviceType(androidPhone, 412, 915)).toBe("Mobile");
    expect(deviceType(iPadChrome, 820, 1180)).toBe("Tablet");
    expect(deviceType(tizenTv, 1920, 1080)).toBe("TV");
    expect(deviceType(quest, 1680, 1760)).toBe("XR");
  });

  it("falls back to the OS when ua-parser has no device type", () => {
    const windows =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
    expect(deviceType(windows, 1920, 1080)).toBe("Desktop");
  });

  it("falls back to screen size when neither the device nor the OS is known", () => {
    expect(deviceType("", 1920, 1080)).toBe("Desktop");
    expect(deviceType("", 768, 1024)).toBe("Tablet");
    expect(deviceType("", 390, 844)).toBe("Mobile");
    expect(deviceType("", 0, 0)).toBe("Mobile");
  });
});

describe("ua-parser-js", () => {
  it("reports the real iOS version behind Safari 26's frozen user agent", () => {
    // Since iOS 26, Safari reports the OS as 18_x; ua-parser-js >= 2.0.5 corrects it
    const ios26Safari =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
    expect(UAParser(ios26Safari).os.version).toBe("26.0");
  });
});
