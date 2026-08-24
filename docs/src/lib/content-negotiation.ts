const PRODUCES = ["text/html", "text/markdown"] as const;

type ProducedType = (typeof PRODUCES)[number];

interface AcceptEntry {
  position: number;
  q: number;
  specificity: number;
  type: string;
}

function parseAccept(header: string): AcceptEntry[] {
  return header
    .split(",")
    .map((raw, position) => {
      const [rawType = "", ...rawParameters] = raw.split(";");
      const type = rawType.trim().toLowerCase();
      let q = 1;

      for (const rawParameter of rawParameters) {
        const [rawName = "", rawValue = ""] = rawParameter.split("=", 2);
        if (rawName.trim().toLowerCase() !== "q") continue;

        const value = rawValue.trim();
        q = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(value) ? Number(value) : 0;
      }

      return {
        position,
        q,
        specificity: type === "*/*" ? 0 : type.endsWith("/*") ? 1 : 2,
        type,
      };
    })
    .filter(entry => entry.type.length > 0);
}

function matches(entry: AcceptEntry, candidate: ProducedType): boolean {
  if (entry.type === "*/*") return true;
  if (entry.type.endsWith("/*")) return candidate.startsWith(entry.type.slice(0, -1));
  return entry.type === candidate;
}

/** Selects an HTTP representation according to RFC 9110 section 12.5.1. */
export function preferredType(header: string | null): ProducedType | null {
  if (!header) return PRODUCES[0];

  const entries = parseAccept(header);
  if (entries.length === 0) return PRODUCES[0];

  let best: { position: number; q: number; specificity: number; type: ProducedType } | null = null;

  for (const candidate of PRODUCES) {
    let matched: AcceptEntry | null = null;

    for (const entry of entries) {
      if (!matches(entry, candidate)) continue;
      if (
        matched === null ||
        entry.specificity > matched.specificity ||
        (entry.specificity === matched.specificity && entry.position < matched.position)
      ) {
        matched = entry;
      }
    }

    if (!matched || matched.q <= 0) continue;
    if (
      best === null ||
      matched.q > best.q ||
      (matched.q === best.q && matched.specificity > best.specificity) ||
      (matched.q === best.q && matched.specificity === best.specificity && matched.position < best.position)
    ) {
      best = {
        position: matched.position,
        q: matched.q,
        specificity: matched.specificity,
        type: candidate,
      };
    }
  }

  return best?.type ?? null;
}

export function appendVary(headers: Headers, ...names: string[]): void {
  const existing = (headers.get("Vary") ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const known = new Set(existing.map(value => value.toLowerCase()));

  for (const name of names) {
    if (!known.has(name.toLowerCase())) {
      existing.push(name);
      known.add(name.toLowerCase());
    }
  }

  headers.set("Vary", existing.join(", "));
}

export function markdownProxyTarget(requestUrl: string | URL, headers: HeadersInit) {
  const originalUrl = new URL(requestUrl);
  const rewriteUrl = new URL(originalUrl);
  const originalPath = originalUrl.pathname;
  const originalSearch = originalUrl.search;
  const requestHeaders = new Headers(headers);

  rewriteUrl.pathname = "/api/agent/markdown";
  rewriteUrl.search = "";
  rewriteUrl.searchParams.set("path", originalPath);
  if (originalSearch) rewriteUrl.searchParams.set("query", originalSearch);

  requestHeaders.set("X-Rybbit-Markdown-Path", originalPath);
  requestHeaders.set("X-Rybbit-Markdown-Query", originalSearch);

  return { rewriteUrl, requestHeaders };
}
