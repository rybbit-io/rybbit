import { isDatacenterAsn } from "./datacenterAsns.js";

export type BotAsnSource = "ipverse_hosting" | "curated_bot_provider" | "curated_hosting";
export type CuratedBotProviderCategory = "ai" | "security_scanner" | "internet_measurement" | "scraping_infrastructure";

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

  // Crawler infrastructure ipverse does not categorize as hosting. Each was
  // added from measured traffic shape, not from the organization name: over
  // three days each reached hundreds of distinct sites while producing at most
  // a handful of interaction events in total, which no access network does.
  {
    asn: 64267,
    provider: "Sprious",
    category: "scraping_infrastructure",
    note: "710 sites / 1203 visitors / 4 interaction events in 3d; desktop Linux Chrome",
  },
  {
    asn: 64286,
    provider: "LogicWeb",
    category: "scraping_infrastructure",
    note: "1001 sites / 774 visitors / 4 interaction events in 3d; desktop Linux Chrome",
  },
  {
    asn: 398464,
    provider: "Buddy Software",
    category: "scraping_infrastructure",
    note: "175 sites / 166 visitors / 0 interaction events in 3d; web vitals on 0.1% of events",
  },
];

/**
 * Hosting/proxy networks missing from the ipverse `hosting` category. These
 * carry the same weight as an ipverse hosting match — corroborating only, never
 * convicting — because unlike the curated list above they are general-purpose
 * networks a real visitor could plausibly sit behind (corporate VPN, browser
 * isolation, mobile proxy). Their traffic here is bot-shaped, but the shape is
 * evidence, not proof of what the ASN is for.
 */
export const EXTRA_DATACENTER_ASNS: readonly number[] = [
  30236, // Cronomagic Canada Inc. — 103 sites / 168 visitors / 0 interactions in 3d
  50077, // SYN LTD — 141 sites / 691 visitors / 0 interactions in 3d
  64445, // NetJoin srl — 117 sites / 458 visitors / 0 interactions in 3d
  134756, // CHINANET Nanjing Jishan IDC network — 295 sites / 204 visitors / 0 interactions in 3d
  209372, // WS Telecom Inc — 384 sites / 1286 visitors / 1 interaction in 3d
  213541, // WS Telecom Inc — 166 sites / 311 visitors / 0 interactions in 3d
];

const EXTRA_DATACENTER_ASN_SET: ReadonlySet<number> = new Set(EXTRA_DATACENTER_ASNS);

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

  if (EXTRA_DATACENTER_ASN_SET.has(asn)) {
    return {
      isBotInfrastructure: true,
      source: "curated_hosting",
    };
  }

  return { isBotInfrastructure: false };
}
