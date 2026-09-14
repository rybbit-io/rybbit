import { describe, expect, it } from "vitest";
import { classifyBotAsn, CURATED_BOT_PROVIDER_ASN_COUNT, EXTRA_DATACENTER_ASNS } from "./botProviderAsns.js";

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

  it("matches curated scraping infrastructure ipverse does not categorize as hosting", () => {
    expect(classifyBotAsn(64267)).toMatchObject({
      isBotInfrastructure: true,
      source: "curated_bot_provider",
      provider: "Sprious",
      category: "scraping_infrastructure",
    });
    expect(classifyBotAsn(64286)).toMatchObject({
      isBotInfrastructure: true,
      source: "curated_bot_provider",
      provider: "LogicWeb",
    });
  });

  it("treats curated hosting ASNs as corroborating, like an ipverse hosting match", () => {
    // These are general-purpose networks a real visitor could sit behind, so
    // they carry hosting weight rather than the convicting curated-provider
    // source — checkBotBlocking blocks only on "curated_bot_provider".
    for (const asn of EXTRA_DATACENTER_ASNS) {
      expect(classifyBotAsn(asn), String(asn)).toMatchObject({
        isBotInfrastructure: true,
        source: "curated_hosting",
      });
    }
  });

  it("does not match arbitrary business ASNs", () => {
    expect(classifyBotAsn(13949)).toEqual({ isBotInfrastructure: false });
    expect(CURATED_BOT_PROVIDER_ASN_COUNT).toBeGreaterThan(0);
  });
});
