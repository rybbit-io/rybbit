import { describe, expect, it } from "vitest";
import { classifyBotAsn, CURATED_BOT_PROVIDER_ASN_COUNT } from "./botProviderAsns.js";

describe("bot ASN classification", () => {
  it("matches ipverse hosting ASNs", () => {
    expect(classifyBotAsn(16509)).toMatchObject({
      isBotInfrastructure: true,
      source: "ipverse_hosting",
    });
  });

  it("matches curated AI provider ASNs that are not reliably categorized as hosting", () => {
    expect(classifyBotAsn(401518)).toMatchObject({
      isBotInfrastructure: true,
      source: "curated_bot_provider",
      provider: "OpenAI",
      category: "ai",
    });
    expect(classifyBotAsn(4167)).toMatchObject({
      isBotInfrastructure: true,
      source: "curated_bot_provider",
      provider: "Anthropic",
      category: "ai",
    });
  });

  it("matches curated security scanner ASNs", () => {
    expect(classifyBotAsn(398324)).toMatchObject({
      isBotInfrastructure: true,
      source: "curated_bot_provider",
      provider: "Censys",
      category: "security_scanner",
    });
  });

  it("does not match arbitrary business ASNs", () => {
    expect(classifyBotAsn(13949)).toEqual({ isBotInfrastructure: false });
    expect(CURATED_BOT_PROVIDER_ASN_COUNT).toBeGreaterThan(0);
  });
});
