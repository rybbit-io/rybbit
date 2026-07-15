import { z } from "zod";
import { hasScope, type ScopeAction, type ScopeResource, type ScopeStatements } from "../../lib/scopes.js";
import { RybbitApiError } from "../apiClient.js";
import { toFiltersQuery, ToolInputError, toTimeQuery, type FilterArgs, type TimeArgs } from "../inputs.js";

export interface ToolRegistrationConfig {
  /** Sink for unexpected (non-API) tool errors; details are logged here, never returned to the client. */
  log?: (message: string) => void;
  /** The credential's scope statements; null/undefined = unrestricted. Tools outside the scopes are not registered. */
  scopes?: ScopeStatements | null;
}

export type ScopeCheck = (resource: ScopeResource, action: ScopeAction) => boolean;

/**
 * tools/list filtering is UX, not enforcement: tool calls proxy through the
 * REST guards, which enforce the same scopes authoritatively.
 */
export function createScopeCheck(scopes: ScopeStatements | null | undefined): ScopeCheck {
  return (resource, action) => hasScope(scopes ?? null, { resource, action });
}

export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

// Analytics labels (titles, paths, referrers, event names, traits) originate in
// tracked traffic and are untrusted. Strip control and bidi-override characters
// that could be used to disguise instructions to an AI client; keep tab/newline
// so legitimate multi-line values stay readable.
const UNSAFE_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(UNSAFE_CHARS, " ");
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = sanitizeValue(entry);
    }
    return result;
  }
  return value;
}

export function ok(data: unknown): ToolResult {
  if (typeof data === "string") {
    return { content: [{ type: "text", text: data }] };
  }
  const sanitized = sanitizeValue(data);
  const structured =
    sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
      ? (sanitized as Record<string, unknown>)
      : { data: sanitized };
  return { content: [{ type: "text", text: JSON.stringify(structured) }], structuredContent: structured };
}

export function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message.replace(UNSAFE_CHARS, " ") }], isError: true };
}

const ERROR_HINTS: Record<number, string> = {
  401: "The API key is missing or invalid. Create one under Settings > Account > API Keys and send it as 'Authorization: Bearer <key>'.",
  403: "The API key's user does not have access to this site or organization, or the tool requires an org admin/owner role for the key's user. Check the site_id with list_sites; its role field shows the key's role per organization. If the message says 'Insufficient scope', the credential was created without the scope this tool needs — use a key or OAuth grant that has it.",
  429: "Rate limited. Wait before retrying, and prefer fewer, more aggregated queries.",
};

export type ToolGuard = <Args>(handler: (args: Args) => Promise<ToolResult>) => (args: Args) => Promise<ToolResult>;

export function createGuard(log?: (message: string) => void): ToolGuard {
  return handler => async args => {
    try {
      return await handler(args);
    } catch (error) {
      if (error instanceof RybbitApiError) {
        const hint = ERROR_HINTS[error.status];
        return fail(`Rybbit API error ${error.status}: ${error.message}${hint ? ` — ${hint}` : ""}`);
      }
      // Argument problems the caller can correct — surface the message so the
      // model can fix its next call.
      if (error instanceof ToolInputError) {
        return fail(error.message);
      }
      // Unexpected errors may carry internals (stack traces, hostnames); log
      // them server-side and return a generic message.
      log?.(`MCP tool failed: ${error instanceof Error ? error.stack || error.message : String(error)}`);
      return fail("Rybbit could not complete the request");
    }
  };
}

// MCP tool annotations. The spec defaults destructiveHint/openWorldHint to true
// when omitted, so every hint is set explicitly.
export const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export const writeTool = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
export const idempotentWrite = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export const destructiveTool = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };

export function siteQuery(args: TimeArgs & { filters?: FilterArgs }) {
  return { ...toTimeQuery(args), ...toFiltersQuery(args.filters) };
}

// Output schemas document structure for MCP clients. The SDK validates
// structuredContent against them on every call, and REST response shapes are
// owned by the dashboard endpoints, so schemas pin only the top-level shape
// and stay tolerant below it: known fields are partial, objects passthrough,
// and wide/dynamic rows are records.
export const looseRow = z.record(z.unknown());
export const looseRows = z.array(looseRow);
export const successOutput = z.object({ success: z.boolean() }).partial().passthrough();
