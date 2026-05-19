import { isDatacenterAsn } from "./datacenterAsns.js";

export type BotAsnSource = "ipverse_hosting" | "curated_bot_provider";
export type CuratedBotProviderCategory = "ai" | "security_scanner" | "internet_measurement";

interface CuratedBotProviderAsnEntry {
  asn: number;
  provider: string;
  category: CuratedBotProviderCategory;
  note: string;
}

export interface BotAsnMatch {
  isBotInfrastructure: boolean;
  source?: BotAsnSource;
  provider?: string;
  category?: CuratedBotProviderCategory;
  note?: string;
}

/**
 * Explicit non-hosting ASNs for providers that generate bot, crawler, scanner,
 * or AI agent traffic but are not always categorized as `hosting` by ipverse.
 *
 * Keep this list tight. Do not add broad consumer ISP, corporate, or CDN ASNs
 * unless the ASN is dedicated to bot/scanner infrastructure.
 */
export const CURATED_BOT_PROVIDER_ASNS: readonly CuratedBotProviderAsnEntry[] = [
  // AI crawler / agent providers. ipverse currently marks some of these as
  // business or leaves category unset, so `metadata.category === "hosting"` alone misses them.
  { asn: 4167, provider: "Anthropic", category: "ai", note: "ipverse category missing" },
  { asn: 60808, provider: "Anthropic", category: "ai", note: "known AI provider ASN" },
  { asn: 399358, provider: "Anthropic", category: "ai", note: "ipverse category business" },
  { asn: 400243, provider: "Anthropic", category: "ai", note: "ipverse category missing" },
  { asn: 401551, provider: "Anthropic", category: "ai", note: "ipverse category missing" },
  { asn: 401518, provider: "OpenAI", category: "ai", note: "ipverse category business" },
  { asn: 401864, provider: "OpenAI", category: "ai", note: "ipverse category business" },

  // Internet-wide scanner / recon providers commonly visible as automated traffic.
  { asn: 27385, provider: "Qualys", category: "security_scanner", note: "vulnerability scanner provider" },
  { asn: 211607, provider: "SecurityTrails", category: "security_scanner", note: "recon scanner provider" },
  { asn: 398324, provider: "Censys", category: "security_scanner", note: "internet scanner provider" },
  { asn: 398705, provider: "Censys", category: "security_scanner", note: "internet scanner provider" },
  { asn: 398722, provider: "Censys", category: "security_scanner", note: "internet scanner provider" },
  { asn: 395213, provider: "Rapid7", category: "security_scanner", note: "internet scanner provider" },
  {
    asn: 399628,
    provider: "Internet Measurement Research",
    category: "internet_measurement",
    note: "internet measurement scanner provider",
  },
];

export const CURATED_BOT_PROVIDER_ASN_COUNT = CURATED_BOT_PROVIDER_ASNS.length;

const CURATED_BOT_PROVIDER_ASN_MAP: ReadonlyMap<number, CuratedBotProviderAsnEntry> = new Map(
  CURATED_BOT_PROVIDER_ASNS.map(entry => [entry.asn, entry])
);

export function classifyBotAsn(asn: number | null | undefined): BotAsnMatch {
  if (typeof asn !== "number") {
    return { isBotInfrastructure: false };
  }

  const curatedMatch = CURATED_BOT_PROVIDER_ASN_MAP.get(asn);
  if (curatedMatch) {
    return {
      isBotInfrastructure: true,
      source: "curated_bot_provider",
      provider: curatedMatch.provider,
      category: curatedMatch.category,
      note: curatedMatch.note,
    };
  }

  if (isDatacenterAsn(asn)) {
    return {
      isBotInfrastructure: true,
      source: "ipverse_hosting",
    };
  }

  return { isBotInfrastructure: false };
}
