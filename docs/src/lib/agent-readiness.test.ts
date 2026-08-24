import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createApiError, jsonError } from "./api-error";
import {
  getMarkdownRepresentation,
  homepageMarkdown,
  htmlToMarkdown,
  isSafeMarkdownPath,
  markdownSourceUrl,
} from "./agent-markdown";
import { appendVary, markdownProxyTarget, preferredType } from "./content-negotiation";
import { buildOpenApiDocument } from "./openapi";

describe("agent-readable HTTP behavior", () => {
  it("honors q-values, specificity, and explicit rejection", () => {
    assert.equal(preferredType(null), "text/html");
    assert.equal(preferredType("*/*"), "text/html");
    assert.equal(preferredType("text/markdown"), "text/markdown");
    assert.equal(preferredType("text/html;q=0.8, text/markdown"), "text/markdown");
    assert.equal(preferredType("text/html, text/markdown;q=0.5"), "text/html");
    assert.equal(preferredType("text/*;q=0.8, text/html;q=0.8"), "text/html");
    assert.equal(preferredType("text/html;q=0, */*;q=1"), "text/markdown");
    assert.equal(preferredType("text/markdown;q=0, */*;q=1"), "text/html");
    assert.equal(preferredType("text/markdown;q=1.5, text/html;q=0.5"), "text/html");
    assert.equal(preferredType("text/html;q=0, text/markdown;q=0"), null);
    assert.equal(preferredType("application/pdf"), null);
  });

  it("preserves framework Vary tokens and adds negotiated request headers once", () => {
    const headers = new Headers({ Vary: "rsc, next-router-state-tree" });
    appendVary(headers, "Accept", "Accept-Encoding");
    appendVary(headers, "accept");

    assert.equal(headers.get("Vary"), "rsc, next-router-state-tree, Accept, Accept-Encoding");
  });

  it("forwards the original path and query to the Markdown renderer", () => {
    const { rewriteUrl, requestHeaders } = markdownProxyTarget(
      "https://rybbit.com/docs/api/getting-started?source=audit",
      { Accept: "text/markdown" }
    );

    assert.equal(
      rewriteUrl.toString(),
      "https://rybbit.com/api/agent/markdown?path=%2Fdocs%2Fapi%2Fgetting-started&query=%3Fsource%3Daudit"
    );
    assert.equal(requestHeaders.get("X-Rybbit-Markdown-Path"), "/docs/api/getting-started");
    assert.equal(requestHeaders.get("X-Rybbit-Markdown-Query"), "?source=audit");
  });

  it("serves substantial homepage Markdown with a real heading hierarchy", () => {
    assert.ok(homepageMarkdown.length >= 500);
    assert.match(homepageMarkdown, /^# Rybbit/m);
    assert.match(homepageMarkdown, /^## /m);
    assert.match(homepageMarkdown, /^### /m);
    assert.match(homepageMarkdown, /https:\/\/rybbit\.com\/docs/);
  });

  it("returns a recoverable Markdown 404 for an unknown page", async () => {
    const response = await getMarkdownRepresentation(
      "/definitely-not-a-real-page",
      async () =>
        new Response("<h1>Page not found</h1>", {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
    );

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("Content-Type"), "text/markdown; charset=utf-8");
    assert.match(response.headers.get("Vary") ?? "", /Accept/);

    const body = await response.text();
    assert.match(body, /^# Page not found/m);
    assert.match(body, /\[Sitemap\]\(https:\/\/rybbit\.com\/sitemap\.xml\)/);
    assert.match(body, /\[Agent index\]\(https:\/\/rybbit\.com\/llms\.txt\)/);
    assert.match(body, /\[API specification\]\(https:\/\/rybbit\.com\/openapi\.json\)/);
  });

  it("preserves upstream redirects for Markdown clients", async () => {
    const response = await getMarkdownRepresentation(
      "/retired-page",
      async () =>
        new Response(null, {
          status: 308,
          headers: { Location: "/replacement" },
        })
    );

    assert.equal(response.status, 308);
    assert.equal(response.headers.get("Location"), "/replacement");
  });

  it("rejects oversized HTML sources before converting them to Markdown", async () => {
    const response = await getMarkdownRepresentation(
      "/large-page",
      async () =>
        new Response("<main><h1>Large page</h1></main>", {
          headers: {
            "Content-Length": "2000001",
            "Content-Type": "text/html; charset=utf-8",
          },
        })
    );

    assert.equal(response.status, 502);
    assert.match(await response.text(), /exceeded the safe conversion limit/i);
  });

  it("keeps Markdown source fetches on the configured origin", () => {
    assert.equal(isSafeMarkdownPath("/docs/api/getting-started"), true);
    assert.equal(isSafeMarkdownPath("//127.0.0.1/internal"), false);
    assert.equal(isSafeMarkdownPath("/\\attacker.example/internal"), false);
    assert.equal(isSafeMarkdownPath("/bad\npath"), false);
    assert.equal(isSafeMarkdownPath("https://attacker.example/internal"), false);
    assert.equal(isSafeMarkdownPath("/api/agent/markdown"), false);
    assert.equal(isSafeMarkdownPath("/_next/image"), false);

    const source = markdownSourceUrl("https://rybbit.com", "/docs/api/getting-started", "?source=agent");
    assert.equal(source.origin, "https://rybbit.com");
    assert.equal(source.pathname, "/docs/api/getting-started");
    assert.equal(source.search, "?source=agent");
  });

  it("preserves indentation inside fenced code", () => {
    const markdown = htmlToMarkdown("<main><pre><code>if (ready) {\n  run();\n}</code></pre></main>");
    assert.match(markdown, /if \(ready\) \{\n  run\(\);\n\}/);
  });

  it("exposes stable JSON API error fields while preserving compatibility", async () => {
    const body = createApiError({
      code: "API_ROUTE_NOT_FOUND",
      message: "No API route exists at this path.",
      resolution: "Read the OpenAPI document and choose a listed operation.",
      details: { path: "/api/missing" },
    });

    assert.deepEqual(body, {
      error: "No API route exists at this path.",
      code: "API_ROUTE_NOT_FOUND",
      message: "No API route exists at this path.",
      resolution: "Read the OpenAPI document and choose a listed operation.",
      details: { path: "/api/missing" },
    });

    const response = jsonError(404, body);
    assert.equal(response.status, 404);
    assert.match(response.headers.get("Content-Type") ?? "", /^application\/json/);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(((await response.json()) as { code: string }).code, "API_ROUTE_NOT_FOUND");
  });

  it("generates OpenAPI 3.1 for the documented API and structured errors", () => {
    const document = buildOpenApiDocument();
    const operations = Object.values(document.paths).flatMap(pathItem =>
      Object.values(pathItem).filter(value => value && typeof value === "object" && "responses" in value)
    );

    assert.equal(document.openapi, "3.1.1");
    assert.equal(document.servers[0].url, "https://app.rybbit.io");
    assert.ok(Object.keys(document.paths).length >= 50);
    assert.ok(operations.length >= 60);
    assert.ok(document.paths["/api/sites/{site}/overview"]?.get);
    assert.ok(document.paths["/api/track"]?.post);
    assert.ok(document.components.schemas.ApiError.required.includes("resolution"));
    assert.ok(document.tags.every(tag => tag.description.length > 0));
    const license = document.info.license as { identifier?: string; url?: string };
    assert.ok(!(license.identifier && license.url), "OpenAPI 3.1 license identifier and URL are mutually exclusive");
    assert.deepEqual(document.paths["/api/track"]?.post?.security?.[0], {});
    assert.deepEqual(document.paths["/api/auth/api-key/list"]?.get?.security, [{ CookieSession: [] }]);
    assert.equal(
      (document.components.securitySchemes.CookieSession as { name: string }).name,
      "better-auth.session_token"
    );
    assert.deepEqual(
      (document.paths["/api/sites/{site}/retention"]?.get?.parameters?.[0] as { schema: unknown }).schema,
      {
        oneOf: [
          { type: "integer", minimum: 1 },
          { type: "string", minLength: 1 },
        ],
      }
    );
    assert.equal(new Set(operations.map(operation => operation.operationId)).size, operations.length);
    assert.doesNotThrow(() => JSON.stringify(document));
  });
});
