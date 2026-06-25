import {
  CLOUDFLARE_SAAS_CNAME_TARGET,
  CustomHostname,
  isCustomHostnameActive,
} from "../../../lib/cloudflare.js";

export type ProxyStatus = "pending" | "active" | "failed";

export interface ProxyDnsRecord {
  type: "CNAME" | "TXT";
  name: string;
  value: string;
  purpose: "routing" | "ssl-validation" | "ownership";
}

export interface ProxyStatusResponse {
  enabled: boolean;
  domain: string | null;
  status: ProxyStatus | null;
  active: boolean;
  cnameTarget: string;
  dnsRecords: ProxyDnsRecord[];
  sslStatus?: string;
  validationErrors?: string[];
  scriptSnippet?: string;
}

/**
 * A first-party hostname under the customer's own domain. Requires at least one dot
 * (it must be a subdomain/host, not a bare label) and stays within DNS length limits.
 */
const HOSTNAME_REGEX = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63})+$/;

/**
 * Subdomains ad blockers explicitly target. We warn but don't hard-block, mirroring
 * how other managed-proxy providers steer customers toward neutral names.
 */
const DISCOURAGED_LABELS = ["analytics", "tracking", "track", "metrics", "stats", "rybbit"];

export function normalizeProxyDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/\.$/, "");
}

export function isValidProxyDomain(domain: string): boolean {
  return HOSTNAME_REGEX.test(domain);
}

export function isDiscouragedProxyDomain(domain: string): boolean {
  const firstLabel = domain.split(".")[0];
  return DISCOURAGED_LABELS.includes(firstLabel);
}

export function mapCloudflareStatus(ch: CustomHostname): ProxyStatus {
  if (isCustomHostnameActive(ch)) return "active";

  const sslErrors = ch.ssl?.validation_errors?.length ?? 0;
  if (ch.status === "blocked" || ch.status === "moved" || sslErrors > 0) {
    return "failed";
  }
  return "pending";
}

/**
 * Build the DNS records the customer must add. In the common case that's a single CNAME;
 * if Cloudflare returns SSL/ownership validation records (e.g. it fell back to TXT
 * validation) we surface those too.
 */
export function buildDnsRecords(domain: string, ch?: CustomHostname): ProxyDnsRecord[] {
  const records: ProxyDnsRecord[] = [
    {
      type: "CNAME",
      name: domain,
      value: CLOUDFLARE_SAAS_CNAME_TARGET,
      purpose: "routing",
    },
  ];

  for (const record of ch?.ssl?.validation_records ?? []) {
    if (record.txt_name && record.txt_value) {
      records.push({
        type: "TXT",
        name: record.txt_name,
        value: record.txt_value,
        purpose: "ssl-validation",
      });
    }
  }

  if (ch?.ownership_verification?.type === "txt" && ch.ownership_verification.name && ch.ownership_verification.value) {
    records.push({
      type: "TXT",
      name: ch.ownership_verification.name,
      value: ch.ownership_verification.value,
      purpose: "ownership",
    });
  }

  return records;
}

export function buildScriptSnippet(domain: string, siteId: number): string {
  return `<script src="https://${domain}/script.js" data-site-id="${siteId}" defer></script>`;
}

export function buildProxyResponse(domain: string, siteId: number, ch?: CustomHostname): ProxyStatusResponse {
  const status = ch ? mapCloudflareStatus(ch) : "pending";
  return {
    enabled: true,
    domain,
    status,
    active: ch ? isCustomHostnameActive(ch) : false,
    cnameTarget: CLOUDFLARE_SAAS_CNAME_TARGET,
    dnsRecords: buildDnsRecords(domain, ch),
    sslStatus: ch?.ssl?.status,
    validationErrors: ch?.ssl?.validation_errors?.map(e => e.message),
    scriptSnippet: buildScriptSnippet(domain, siteId),
  };
}
