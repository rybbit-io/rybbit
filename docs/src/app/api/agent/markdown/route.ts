import { getLLMText } from "@/lib/get-llm-text";
import {
  getMarkdownRepresentation,
  isSafeMarkdownPath,
  markdownResponse,
  markdownSourceUrl,
} from "@/lib/agent-markdown";
import { createApiError, jsonError } from "@/lib/api-error";
import { source } from "@/lib/source";

export const runtime = "nodejs";

const supportedLocales = new Set(["en", "de", "fr", "zh", "es", "pl", "it", "ko", "pt", "ja"]);

function validConfiguredOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function sourceOrigin(requestUrl: URL): string {
  const hostname = requestUrl.hostname.toLowerCase();
  // Self-hosted deployments can opt in to their own trusted rendering origin.
  // Unrecognised Host headers deliberately fall back to the public site.
  const configured = validConfiguredOrigin(process.env.RYBBIT_SITE_ORIGIN);
  if (configured) return configured;

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return requestUrl.origin;
  }

  if (hostname === "rybbit.com" || hostname === "www.rybbit.com") return requestUrl.origin;

  const vercelHostname = validConfiguredOrigin(process.env.VERCEL_URL);
  if (vercelHostname && hostname === new URL(vercelHostname).hostname.toLowerCase()) return requestUrl.origin;

  return "https://rybbit.com";
}

function docsSlug(pathname: string): string[] | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (supportedLocales.has(segments[0])) segments.shift();
  if (segments[0] !== "docs") return undefined;
  return segments.slice(1);
}

async function markdownRequest(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const pathname = request.headers.get("X-Rybbit-Markdown-Path") || requestUrl.searchParams.get("path") || "/";
  const originalSearch = request.headers.get("X-Rybbit-Markdown-Query") || requestUrl.searchParams.get("query") || "";
  if (!isSafeMarkdownPath(pathname)) {
    return jsonError(
      400,
      createApiError({
        code: "INVALID_MARKDOWN_PATH",
        message: "The Markdown source path is invalid.",
        resolution: "Provide a root-relative website path such as /docs.",
      })
    );
  }

  let sourceUrl: URL;
  try {
    sourceUrl = markdownSourceUrl(sourceOrigin(requestUrl), pathname, originalSearch);
  } catch {
    return jsonError(
      400,
      createApiError({
        code: "INVALID_MARKDOWN_TARGET",
        message: "The Markdown source path or query is invalid.",
        resolution: "Provide a valid root-relative website path and query.",
      })
    );
  }

  const slug = docsSlug(pathname);

  if (slug) {
    const page = source.getPage(slug);
    if (page) {
      return markdownResponse(await getLLMText(page), 200, {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Location": pathname,
      });
    }
  }

  return getMarkdownRepresentation(pathname, async () => {
    return fetch(sourceUrl, {
      headers: {
        Accept: "text/html",
        "X-Rybbit-Markdown-Source": "1",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
  });
}

export async function GET(request: Request) {
  return markdownRequest(request);
}

export async function HEAD(request: Request) {
  const response = await markdownRequest(request);
  return new Response(null, response);
}
