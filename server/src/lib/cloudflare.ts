import dotenv from "dotenv";
import { createServiceLogger } from "./logger/logger.js";

dotenv.config();

const logger = createServiceLogger("cloudflare");

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

/**
 * The CNAME target customers point their subdomain at (e.g. "customers.rybbit.io").
 * This is the hostname in our Cloudflare-for-SaaS zone whose record is designated the
 * fallback origin. Surfaced to customers in the DNS setup instructions.
 */
export const CLOUDFLARE_SAAS_CNAME_TARGET = process.env.CLOUDFLARE_SAAS_CNAME_TARGET || "";

/**
 * Managed proxy is only operable when we have both an API token and a zone to create
 * custom hostnames in, plus a CNAME target to hand customers. Everything that mutates
 * Cloudflare state checks this first and fails closed.
 */
export const isCloudflareConfigured = Boolean(API_TOKEN && ZONE_ID && CLOUDFLARE_SAAS_CNAME_TARGET);

const API_BASE = "https://api.cloudflare.com/client/v4";

export interface CustomHostnameSSL {
  status?: string; // "initializing" | "pending_validation" | "pending_deployment" | "active" | ...
  method?: string;
  type?: string;
  validation_records?: Array<{
    txt_name?: string;
    txt_value?: string;
    http_url?: string;
    http_body?: string;
    emails?: string[];
  }>;
  validation_errors?: Array<{ message: string }>;
}

export interface CustomHostname {
  id: string;
  hostname: string;
  status: string; // "pending" | "pending_deletion" | "active" | "blocked" | "moved" | ...
  ssl: CustomHostnameSSL;
  ownership_verification?: { type?: string; name?: string; value?: string };
  ownership_verification_http?: { http_url?: string; http_body?: string };
  created_at?: string;
}

interface CfEnvelope<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_pages: number;
    count: number;
    total_count: number;
  };
}

export class CloudflareError extends Error {
  status: number;
  code?: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = "CloudflareError";
    this.status = status;
    this.code = code;
  }
}

async function cfFetch<T>(path: string, init?: RequestInit): Promise<CfEnvelope<T>> {
  if (!isCloudflareConfigured) {
    throw new CloudflareError("Cloudflare is not configured", 500);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const body = (await res.json().catch(() => null)) as CfEnvelope<T> | null;

  if (!body || !body.success) {
    const firstError = body?.errors?.[0];
    throw new CloudflareError(
      firstError?.message || `Cloudflare API error (HTTP ${res.status})`,
      res.status,
      firstError?.code
    );
  }

  return body;
}

/**
 * Register a custom hostname with HTTP domain-control-validation. Once the customer's
 * CNAME points at our SaaS target, Cloudflare validates and issues the cert
 * automatically — no extra DNS record needed in the common case.
 */
export async function createCustomHostname(hostname: string): Promise<CustomHostname> {
  const body = await cfFetch<CustomHostname>(`/zones/${ZONE_ID}/custom_hostnames`, {
    method: "POST",
    body: JSON.stringify({
      hostname,
      ssl: {
        method: "http",
        type: "dv",
        settings: { min_tls_version: "1.2" },
      },
    }),
  });
  return body.result;
}

export async function getCustomHostname(id: string): Promise<CustomHostname> {
  const body = await cfFetch<CustomHostname>(`/zones/${ZONE_ID}/custom_hostnames/${id}`);
  return body.result;
}

export async function findCustomHostnameByName(hostname: string): Promise<CustomHostname | null> {
  const body = await cfFetch<CustomHostname[]>(
    `/zones/${ZONE_ID}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`
  );
  return body.result?.[0] ?? null;
}

/**
 * Delete a custom hostname. Idempotent: a hostname that's already gone (404) is treated
 * as success, so retries and double-fires from inline teardown + the reconcile sweep
 * never error.
 */
export async function deleteCustomHostname(id: string): Promise<void> {
  try {
    await cfFetch(`/zones/${ZONE_ID}/custom_hostnames/${id}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof CloudflareError && (err.status === 404 || err.code === 1436)) {
      logger.debug(`Custom hostname ${id} already deleted`);
      return;
    }
    throw err;
  }
}

/**
 * List every custom hostname in the zone, following pagination. Used by the daily
 * reconciliation sweep to find orphans (hostnames no live site backs).
 */
export async function listCustomHostnames(): Promise<CustomHostname[]> {
  const all: CustomHostname[] = [];
  let page = 1;
  const perPage = 50;

  // Hard cap the page count so a malformed result_info can't loop forever.
  for (let i = 0; i < 1000; i++) {
    const body = await cfFetch<CustomHostname[]>(
      `/zones/${ZONE_ID}/custom_hostnames?per_page=${perPage}&page=${page}`
    );
    all.push(...body.result);

    const info = body.result_info;
    if (!info || page >= info.total_pages || body.result.length === 0) {
      break;
    }
    page++;
  }

  return all;
}

/**
 * A hostname is ready to serve traffic only when both the hostname itself and its
 * certificate have reached "active".
 */
export function isCustomHostnameActive(ch: CustomHostname): boolean {
  return ch.status === "active" && ch.ssl?.status === "active";
}
