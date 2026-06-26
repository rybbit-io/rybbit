import { authedFetch } from "../../utils";

export type ProxyStatus = "pending" | "active" | "failed";

export interface ProxyDnsRecord {
  type: "CNAME" | "TXT";
  name: string;
  value: string;
  purpose: "routing" | "ssl-validation" | "ownership";
}

export interface ProxyStatusResponse {
  success?: boolean;
  // Whether managed proxy (Cloudflare for SaaS) is configured on this server.
  configured: boolean;
  enabled: boolean;
  domain: string | null;
  status?: ProxyStatus | null;
  active?: boolean;
  cnameTarget?: string;
  dnsRecords?: ProxyDnsRecord[];
  sslStatus?: string;
  validationErrors?: string[];
  scriptSnippet?: string;
  error?: string;
}

export function fetchProxyStatus(siteId: number) {
  return authedFetch<ProxyStatusResponse>(`/sites/${siteId}/proxy`);
}

export function enableProxy(siteId: number, domain: string) {
  return authedFetch<ProxyStatusResponse>(`/sites/${siteId}/proxy`, undefined, {
    method: "POST",
    data: { domain },
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function disableProxy(siteId: number) {
  return authedFetch<{ success: boolean; enabled: false }>(`/sites/${siteId}/proxy`, undefined, {
    method: "DELETE",
  });
}
