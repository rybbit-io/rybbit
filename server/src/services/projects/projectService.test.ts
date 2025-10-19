import { describe, expect, it } from "vitest";
import { generateProjectApiKey, hashIdentifier, hashSecret } from "./projectService.js";

describe("projectService hashing", () => {
  it("hashSecret returns deterministic sha256 hashes", () => {
    const value = "secret-value";
    const hash1 = hashSecret(value);
    const hash2 = hashSecret(value);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashIdentifier returns null for empty values", () => {
    expect(hashIdentifier(null)).toBeNull();
    expect(hashIdentifier(undefined)).toBeNull();
    expect(hashIdentifier("")).toBeNull();
  });

  it("hashIdentifier hashes non-empty identifiers", () => {
    const hashed = hashIdentifier("user-123");
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("generateProjectApiKey", () => {
  it("generates a key with rbp_ prefix", () => {
    const { apiKey, apiKeyHash } = generateProjectApiKey();
    expect(apiKey.startsWith("rbp_")).toBe(true);
    expect(apiKey.length).toBe(52);
    expect(apiKeyHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
