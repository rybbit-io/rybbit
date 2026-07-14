import { describe, expect, it, vi } from "vitest";

import { createMcpAuthenticator, extractBearerToken, McpAuthenticationError } from "./auth.js";

function request(authorization?: string) {
  return {
    headers: authorization ? { authorization } : {},
  } as any;
}

describe("MCP API-key authentication", () => {
  it("extracts case-insensitive Bearer tokens and rejects other schemes", () => {
    expect(extractBearerToken("Bearer rb_secret")).toBe("rb_secret");
    expect(extractBearerToken("bearer   rb_secret  ")).toBe("rb_secret");
    expect(extractBearerToken("Basic abc")).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it("maps a valid key to the user's current accessible sites", async () => {
    const verifyApiKey = vi.fn(async () => ({
      valid: true,
      key: { referenceId: "user_1" },
    }));
    const resolveSites = vi.fn(async (req: any) => {
      expect(req.user).toEqual({ id: "user_1" });
      return [
        {
          siteId: 9,
          organizationId: "org_1",
          name: "Docs",
          domain: "docs.example.com",
          type: "web",
          excludedIPs: ["should-not-leak"],
        },
      ];
    });
    const authenticate = createMcpAuthenticator({ verifyApiKey, resolveSites });

    await expect(authenticate(request("Bearer rb_secret"))).resolves.toEqual({
      userId: "user_1",
      sites: [
        {
          siteId: 9,
          organizationId: "org_1",
          name: "Docs",
          domain: "docs.example.com",
          type: "web",
        },
      ],
    });
    expect(verifyApiKey).toHaveBeenCalledWith("rb_secret");
  });

  it("returns a specific rate-limit error", async () => {
    const authenticate = createMcpAuthenticator({
      verifyApiKey: async () => ({ valid: false, error: { code: "RATE_LIMITED" } }),
      resolveSites: async () => [],
    });

    await expect(authenticate(request("Bearer rb_limited"))).rejects.toEqual(
      expect.objectContaining<McpAuthenticationError>({
        name: "McpAuthenticationError",
        statusCode: 429,
        message: "API key rate limit exceeded",
      })
    );
  });

  it("rejects missing and invalid keys", async () => {
    const authenticate = createMcpAuthenticator({
      verifyApiKey: async () => ({ valid: false }),
      resolveSites: async () => [],
    });

    await expect(authenticate(request())).rejects.toEqual(expect.objectContaining({ statusCode: 401 }));
    await expect(authenticate(request("Bearer invalid"))).rejects.toEqual(expect.objectContaining({ statusCode: 401 }));
  });

  it("distinguishes authentication service failures from invalid keys", async () => {
    const authenticate = createMcpAuthenticator({
      verifyApiKey: async () => {
        throw new Error("database unavailable");
      },
      resolveSites: async () => [],
    });

    await expect(authenticate(request("Bearer rb_valid_shape"))).rejects.toEqual(
      expect.objectContaining({ statusCode: 503, message: "Rybbit could not verify the API key" })
    );
  });
});
