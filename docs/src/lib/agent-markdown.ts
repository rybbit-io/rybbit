import { parse, type DefaultTreeAdapterMap } from "parse5";

import { appendVary } from "./content-negotiation";

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];

const SITE_ORIGIN = "https://rybbit.com";
const MAX_MARKDOWN_SOURCE_BYTES = 2_000_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const homepageMarkdown = `# Rybbit

Rybbit is an open-source, cookieless web and product analytics platform. It replaces Google Analytics with one readable dashboard and a lightweight 18 KB tracking script. Rybbit is designed for privacy-conscious teams: no cookies, no consent banner, GDPR and CCPA compliant, and available as managed EU-hosted cloud or a self-hosted deployment.

## What Rybbit helps you understand

### Web and product analytics

Measure pageviews, sessions, users, bounce rate, traffic sources, campaigns, countries, devices, and live visitors. Autocapture can record clicks, form submissions, copied text, outbound links, and browser errors without requiring separate instrumentation for every interaction.

### Behavior and conversion

Use session replay to watch the visits behind the numbers, user journeys to see common navigation paths, funnels to locate conversion drop-off, goals to track outcomes, and retention reports to understand whether people return. User profiles connect identified users with their sessions and events.

### Performance and reliability

Rybbit records Core Web Vitals from real visits and breaks performance down by route, country, browser, operating system, and device. Error tracking connects JavaScript failures to affected sessions so teams can move from a trend to the visits that explain it.

## Built for people and agents

Rybbit exposes a REST API and a hosted MCP server. Agents can read analytics, investigate errors and funnels, and manage goals with the same permissions as a teammate. API requests use a Bearer token, and the published OpenAPI document describes the available operations.

## Start here

- [Documentation](${SITE_ORIGIN}/docs)
- [API documentation](${SITE_ORIGIN}/docs/api/getting-started)
- [OpenAPI specification](${SITE_ORIGIN}/openapi.json)
- [MCP setup](${SITE_ORIGIN}/docs/mcp)
- [Pricing](${SITE_ORIGIN}/pricing)
- [Live demo](https://demo.rybbit.com)
- [Source code](https://github.com/rybbit-io/rybbit)
- [Sitemap](${SITE_ORIGIN}/sitemap.xml)
- [Full agent documentation](${SITE_ORIGIN}/llms-full.txt)
`;

const notFoundMarkdown = `# Page not found

The requested path does not exist on Rybbit.

## Where to look next

- [Rybbit home](${SITE_ORIGIN}/)
- [Documentation](${SITE_ORIGIN}/docs)
- [Sitemap](${SITE_ORIGIN}/sitemap.xml)
- [Agent index](${SITE_ORIGIN}/llms.txt)
- [API specification](${SITE_ORIGIN}/openapi.json)
`;

function isElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node;
}

function textContent(node: HtmlNode): string {
  if ("value" in node) return node.value;
  if (!("childNodes" in node)) return "";
  return node.childNodes.map(textContent).join("");
}

function attribute(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find(item => item.name === name)?.value;
}

function absoluteUrl(value: string): string {
  try {
    return new URL(value, SITE_ORIGIN).toString();
  } catch {
    return value;
  }
}

function renderChildren(node: HtmlNode): string {
  if (!("childNodes" in node)) return "";
  return node.childNodes.map(renderNode).join("");
}

function renderNode(node: HtmlNode): string {
  if ("value" in node) return node.value;
  if (!isElement(node)) return renderChildren(node);

  const tag = node.tagName;
  if (
    ["script", "style", "svg", "template"].includes(tag) ||
    attribute(node, "hidden") !== undefined ||
    attribute(node, "aria-hidden") === "true"
  ) {
    return "";
  }

  const children = renderChildren(node);
  if (/^h[1-6]$/.test(tag)) return `\n\n${"#".repeat(Number(tag[1]))} ${children.trim()}\n\n`;
  if (tag === "p") return `\n\n${children.trim()}\n\n`;
  if (tag === "br") return "\n";
  if (tag === "hr") return "\n\n---\n\n";
  if (tag === "strong" || tag === "b") return children.trim() ? `**${children.trim()}**` : "";
  if (tag === "em" || tag === "i") return children.trim() ? `_${children.trim()}_` : "";
  if (tag === "code" && node.parentNode && isElement(node.parentNode) && node.parentNode.tagName === "pre") {
    return children;
  }
  if (tag === "code") return children.trim() ? `\`${children.trim().replaceAll("`", "\\`")}\`` : "";
  if (tag === "pre") return `\n\n\`\`\`\n${textContent(node).trim()}\n\`\`\`\n\n`;
  if (tag === "blockquote")
    return `\n\n${children
      .trim()
      .split("\n")
      .map(line => `> ${line}`)
      .join("\n")}\n\n`;
  if (tag === "li") {
    const parent = node.parentNode;
    if (parent && isElement(parent) && parent.tagName === "ol") {
      const siblings = parent.childNodes.filter(isElement).filter(child => child.tagName === "li");
      return `\n${siblings.indexOf(node) + 1}. ${children.trim()}`;
    }
    return `\n- ${children.trim()}`;
  }
  if (tag === "ul" || tag === "ol") return `\n${children.trim()}\n`;
  if (tag === "a") {
    const href = attribute(node, "href");
    const label = children.trim();
    return href && label ? `[${label}](${absoluteUrl(href)})` : label;
  }
  if (tag === "img") {
    const source = attribute(node, "src");
    const alt = attribute(node, "alt")?.trim();
    return source && alt ? `![${alt}](${absoluteUrl(source)})` : "";
  }
  if (["article", "aside", "div", "main", "nav", "section"].includes(tag)) return `\n${children}\n`;
  return children;
}

function findMain(node: HtmlNode): HtmlNode | undefined {
  if (isElement(node) && node.tagName === "main") return node;
  if (!("childNodes" in node)) return undefined;
  for (const child of node.childNodes) {
    const match = findMain(child);
    if (match) return match;
  }
  return undefined;
}

export function htmlToMarkdown(html: string): string {
  const document = parse(html) as HtmlNode;
  const root = findMain(document) ?? document;
  return renderNode(root)
    .split(/(```[\s\S]*?```)/g)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part
            .replace(/[ \t]+/g, " ")
            .replace(/ *\n */g, "\n")
            .replace(/\n{3,}/g, "\n\n")
    )
    .join("")
    .trim();
}

function hasUnsafePathCharacters(value: string): boolean {
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return true;
  try {
    const decoded = decodeURIComponent(value);
    return decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith("//");
  } catch {
    return true;
  }
}

export function isSafeMarkdownPath(pathname: string): boolean {
  return (
    pathname.length > 0 &&
    pathname.length <= 2_048 &&
    pathname.startsWith("/") &&
    !pathname.startsWith("//") &&
    pathname !== "/api" &&
    !pathname.startsWith("/api/") &&
    pathname !== "/_next" &&
    !pathname.startsWith("/_next/") &&
    !hasUnsafePathCharacters(pathname)
  );
}

export function markdownSourceUrl(origin: string, pathname: string, search: string): URL {
  if (!isSafeMarkdownPath(pathname)) throw new TypeError("Invalid Markdown source path.");
  if (search && (!search.startsWith("?") || search.length > 8_192 || hasUnsafePathCharacters(search))) {
    throw new TypeError("Invalid Markdown source query.");
  }

  const source = new URL(origin);
  source.pathname = pathname;
  source.search = search;
  return source;
}

async function readLimitedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MARKDOWN_SOURCE_BYTES) {
    throw new RangeError("Markdown source response is too large.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_MARKDOWN_SOURCE_BYTES) {
      await reader.cancel();
      throw new RangeError("Markdown source response is too large.");
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

export function markdownResponse(body: string, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "text/markdown; charset=utf-8");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  appendVary(responseHeaders, "Accept", "Accept-Encoding");

  return new Response(`${body.trim()}\n`, { status, headers: responseHeaders });
}

export async function getMarkdownRepresentation(
  pathname: string,
  fetchHtml: () => Promise<Response>
): Promise<Response> {
  if (pathname === "/") {
    return markdownResponse(homepageMarkdown, 200, {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
      "Content-Location": "/",
    });
  }

  let source: Response;
  try {
    source = await fetchHtml();
  } catch {
    return markdownResponse(
      "# Upstream page unavailable\n\nThe HTML representation could not be rendered. Try the [documentation](https://rybbit.com/docs) or retry this request.",
      502,
      { "Cache-Control": "no-store" }
    );
  }

  if (source.status === 404) {
    return markdownResponse(notFoundMarkdown, 404, { "Cache-Control": "public, s-maxage=60" });
  }

  if (REDIRECT_STATUSES.has(source.status)) {
    const location = source.headers.get("Location");
    if (!location) {
      return markdownResponse("# Invalid redirect\n\nThe upstream response did not include a destination.", 502, {
        "Cache-Control": "no-store",
      });
    }
    return markdownResponse(`# Redirect\n\nContinue at: ${location}`, source.status, {
      "Cache-Control": "no-store",
      "Content-Location": pathname,
      Location: location,
    });
  }

  const contentType = source.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    return markdownResponse("# Not acceptable\n\nA Markdown representation is not available for this resource.", 406, {
      "Cache-Control": "no-store",
    });
  }

  let markdown: string;
  try {
    markdown = htmlToMarkdown(await readLimitedText(source));
  } catch {
    return markdownResponse(
      "# Representation unavailable\n\nThe rendered page exceeded the safe conversion limit. See the [agent index](https://rybbit.com/llms.txt).",
      502,
      { "Cache-Control": "no-store" }
    );
  }
  if (!markdown) {
    return markdownResponse(
      "# Representation unavailable\n\nThe page did not contain readable main content. See the [agent index](https://rybbit.com/llms.txt).",
      502,
      { "Cache-Control": "no-store" }
    );
  }

  return markdownResponse(markdown, source.status, {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    "Content-Location": pathname,
  });
}
