import { request } from "undici";
import { performance } from "perf_hooks";
import dns from "dns/promises";
import { HttpCheckResult } from "../types.js";

interface HttpCheckOptions {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  auth?: {
    type: "none" | "basic" | "bearer" | "api_key" | "custom_header";
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
      headerName?: string;
      headerValue?: string;
    };
  };
  followRedirects?: boolean;
  timeoutMs?: number;
  ipVersion?: "any" | "ipv4" | "ipv6";
  userAgent?: string;
}

export async function performHttpCheck(options: HttpCheckOptions): Promise<HttpCheckResult> {
  const startTime = performance.now();
  const timing = {
    dnsMs: 0,
    tcpMs: 0,
    tlsMs: 0,
    ttfbMs: 0,
    transferMs: 0,
  };

  try {
    // Parse URL
    const url = new URL(options.url);

    // DNS lookup timing
    const dnsStart = performance.now();
    try {
      const dnsOptions: any = {};
      if (options.ipVersion === "ipv4") dnsOptions.family = 4;
      if (options.ipVersion === "ipv6") dnsOptions.family = 6;

      await dns.lookup(url.hostname, dnsOptions);
      timing.dnsMs = Math.round(performance.now() - dnsStart);
    } catch (error) {
      throw {
        message: `DNS lookup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "dns_failure",
      };
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "User-Agent": options.userAgent || "Rybbit-Uptime-Monitor/1.0",
      ...options.headers,
    };

    // Add authentication
    if (options.auth && options.auth.type !== "none") {
      switch (options.auth.type) {
        case "basic":
          if (options.auth.credentials?.username && options.auth.credentials?.password) {
            const encoded = Buffer.from(
              `${options.auth.credentials.username}:${options.auth.credentials.password}`
            ).toString("base64");
            headers["Authorization"] = `Basic ${encoded}`;
          }
          break;
        case "bearer":
          if (options.auth.credentials?.token) {
            headers["Authorization"] = `Bearer ${options.auth.credentials.token}`;
          }
          break;
        case "api_key":
        case "custom_header":
          if (options.auth.credentials?.headerName && options.auth.credentials?.headerValue) {
            headers[options.auth.credentials.headerName] = options.auth.credentials.headerValue;
          }
          break;
      }
    }

    // Perform request
    const requestStart = performance.now();
    const response = await request(options.url, {
      method: options.method,
      headers,
      body: options.body,
      bodyTimeout: options.timeoutMs || 30000,
      headersTimeout: options.timeoutMs || 30000,
      // maxRedirections: options.followRedirects !== false ? 5 : 0,
    });

    // Calculate timings
    timing.ttfbMs = Math.round(performance.now() - requestStart);

    // Get response body and size
    const transferStart = performance.now();
    const bodyBuffer = await response.body.arrayBuffer();
    const bodySizeBytes = bodyBuffer.byteLength;

    timing.transferMs = Math.round(performance.now() - transferStart);

    // Estimate TCP and TLS times (these are approximations)
    timing.tcpMs = Math.round((timing.ttfbMs - timing.dnsMs) * 0.3);
    if (url.protocol === "https:") {
      timing.tlsMs = Math.round((timing.ttfbMs - timing.dnsMs - timing.tcpMs) * 0.5);
    }

    const responseTimeMs = Math.round(performance.now() - startTime);

    // Convert headers to simple object
    const responseHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) {
      responseHeaders[key] = Array.isArray(value) ? value.join(", ") : String(value);
    }

    return {
      status: "success",
      statusCode: response.statusCode,
      responseTimeMs,
      timing,
      headers: responseHeaders,
      bodySizeBytes,
      validationErrors: [],
    };
  } catch (error: any) {
    const responseTimeMs = Math.round(performance.now() - startTime);

    // Handle different error types
    let errorType = "unknown_error";
    let errorMessage = error.message || "Unknown error occurred";

    if (error.code === "UND_ERR_CONNECT_TIMEOUT") {
      errorType = "connection_timeout";
      errorMessage = "Connection timed out";
    } else if (error.code === "UND_ERR_HEADERS_TIMEOUT") {
      errorType = "headers_timeout";
      errorMessage = "Headers timeout";
    } else if (error.code === "UND_ERR_BODY_TIMEOUT") {
      errorType = "body_timeout";
      errorMessage = "Body timeout";
    } else if (error.code === "ENOTFOUND") {
      errorType = "dns_failure";
      errorMessage = "DNS lookup failed";
    } else if (error.code === "ECONNREFUSED") {
      errorType = "connection_refused";
      errorMessage = "Connection refused";
    } else if (error.message?.includes("SSL") || error.message?.includes("TLS")) {
      errorType = "ssl_error";
    } else if (error.type) {
      errorType = error.type;
      errorMessage = error.message;
    }

    return {
      status: errorType.includes("timeout") ? "timeout" : "failure",
      responseTimeMs,
      timing,
      headers: {},
      bodySizeBytes: 0,
      validationErrors: [],
      error: {
        message: errorMessage,
        type: errorType,
      },
    };
  }
}
