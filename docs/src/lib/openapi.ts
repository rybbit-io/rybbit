import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

interface OpenApiOperation {
  description: string;
  externalDocs: { url: string };
  operationId: string;
  parameters?: Array<Record<string, unknown>>;
  requestBody?: Record<string, unknown>;
  responses: Record<string, unknown>;
  security: Array<Record<string, string[]>>;
  summary: string;
  tags: string[];
}

type OpenApiPathItem = Partial<Record<Lowercase<HttpMethod>, OpenApiOperation>>;

export interface OpenApiDocument {
  components: {
    parameters: Record<string, unknown>;
    schemas: { ApiError: { required: string[]; [key: string]: unknown } };
    securitySchemes: Record<string, unknown>;
  };
  externalDocs: { description: string; url: string };
  info: Record<string, unknown>;
  jsonSchemaDialect: string;
  openapi: "3.1.1";
  paths: Record<string, OpenApiPathItem>;
  servers: Array<{ description: string; url: string }>;
  tags: Array<{ description: string; name: string }>;
}

function apiDocsRoot(): string {
  const candidates = [join(process.cwd(), "content/docs/api"), join(process.cwd(), "docs/content/docs/api")];
  const root = candidates.find(existsSync);
  if (!root) throw new Error("Could not locate content/docs/api for OpenAPI generation.");
  return root;
}

function mdxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return mdxFiles(path);
    return entry.isFile() && entry.name.endsWith(".mdx") ? [path] : [];
  });
}

function frontmatterValue(source: string, key: string): string | undefined {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
}

function canonicalParameterName(name: string): string {
  return name === "siteId" ? "site" : name;
}

function openApiPath(path: string): string {
  return path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_match, name: string) => `{${canonicalParameterName(name)}}`);
}

function operationId(method: HttpMethod, path: string): string {
  const words = `${method.toLowerCase()} ${path}`.match(/[A-Za-z0-9]+/g) ?? [];
  return words
    .map((word, index) => (index === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1)}`))
    .join("");
}

function tagFor(root: string, file: string): string {
  const [first] = relative(root, file).split(sep);
  if (first.endsWith(".mdx")) return "General";
  return first
    .split("-")
    .map(word => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function docsUrl(root: string, file: string): string {
  const slug = relative(root, file)
    .split(sep)
    .join("/")
    .replace(/\.mdx$/, "");
  return `https://rybbit.com/docs/api/${slug}`;
}

const commonParameterReferences = [
  "StartDate",
  "EndDate",
  "TimeZone",
  "StartDatetime",
  "EndDatetime",
  "PastMinutesStart",
  "PastMinutesEnd",
  "Filters",
  "SegmentId",
].map(name => ({ $ref: `#/components/parameters/${name}` }));

function pathParameters(path: string): Array<Record<string, unknown>> {
  return [...path.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(match => ({
    description: match[1] === "site" ? "Numeric Rybbit Site ID or string identifier." : `${match[1]} identifier.`,
    in: "path",
    name: match[1],
    required: true,
    schema:
      match[1] === "site"
        ? {
            oneOf: [
              { type: "integer", minimum: 1 },
              { type: "string", minLength: 1 },
            ],
          }
        : { type: "string", minLength: 1 },
  }));
}

function operationSecurity(path: string): Array<Record<string, string[]>> {
  if (path === "/api/track") return [{}, { BearerAuth: [] }, { QueryApiKey: [] }];
  if (path.startsWith("/api/auth/")) return [{ CookieSession: [] }];
  return [{ BearerAuth: [] }, { QueryApiKey: [] }, { CookieSession: [] }];
}

function successResponse(path: string): Record<string, unknown> {
  if (path.endsWith("/export/pdf")) {
    return {
      description: "PDF report.",
      content: { "application/pdf": { schema: { type: "string", contentEncoding: "base64" } } },
    };
  }
  return {
    description: "Successful response. Refer to the linked endpoint documentation for the response fields.",
    content: { "application/json": { schema: {} } },
  };
}

function errorResponses(): Record<string, unknown> {
  return Object.fromEntries(
    [
      ["400", "Invalid request"],
      ["401", "Authentication required"],
      ["403", "Insufficient permission"],
      ["404", "Resource not found"],
      ["429", "Rate limit exceeded"],
      ["500", "Unexpected server error"],
    ].map(([status, description]) => [
      status,
      {
        description,
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
      },
    ])
  );
}

export function buildOpenApiDocument(): OpenApiDocument {
  const root = apiDocsRoot();
  const paths: Record<string, OpenApiPathItem> = {};
  const tags = new Set<string>();

  for (const file of mdxFiles(root).sort()) {
    const source = readFileSync(file, "utf8");
    const route = source.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/\S+)\s*$/m);
    if (!route || !HTTP_METHODS.includes(route[1] as HttpMethod)) continue;

    const method = route[1] as HttpMethod;
    const path = openApiPath(route[2]);
    const methodKey = method.toLowerCase() as Lowercase<HttpMethod>;
    const tag = tagFor(root, file);
    const parameters = pathParameters(path);
    if (/common parameters/i.test(source)) parameters.push(...commonParameterReferences);

    const operation: OpenApiOperation = {
      summary: frontmatterValue(source, "title") ?? `${method} ${path}`,
      description: frontmatterValue(source, "description") ?? "See the endpoint documentation for details.",
      operationId: operationId(method, path),
      tags: [tag],
      security: operationSecurity(path),
      externalDocs: { url: docsUrl(root, file) },
      responses: { "200": successResponse(path), ...errorResponses() },
      ...(parameters.length === 0 ? {} : { parameters }),
      ...(["POST", "PUT", "PATCH"].includes(method)
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
          }
        : {}),
    };

    if (paths[path]?.[methodKey]) {
      throw new Error(`Duplicate OpenAPI operation ${method} ${path} while reading ${file}.`);
    }
    paths[path] = { ...paths[path], [methodKey]: operation };
    tags.add(tag);
  }

  return {
    openapi: "3.1.1",
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    info: {
      title: "Rybbit API",
      version: "2.8.0-beta",
      description:
        "REST API for Rybbit web and product analytics. The API is in beta and may introduce breaking changes.",
      termsOfService: "https://rybbit.com/terms-and-conditions",
      contact: { name: "Rybbit", url: "https://rybbit.com/contact" },
      license: {
        name: "GNU Affero General Public License v3.0",
        identifier: "AGPL-3.0-only",
      },
    },
    servers: [{ url: "https://app.rybbit.io", description: "Rybbit Cloud API" }],
    tags: [...tags].sort().map(name => ({ name, description: `${name} API operations.` })),
    paths,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Personal or organization API key sent as an Authorization Bearer token.",
        },
        QueryApiKey: {
          type: "apiKey",
          in: "query",
          name: "api_key",
          description: "Testing-only fallback. Bearer authentication is recommended.",
        },
        CookieSession: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
          description:
            "Authenticated dashboard session cookie. Secure deployments may prefix the cookie name with __Secure-.",
        },
      },
      parameters: {
        StartDate: { name: "start_date", in: "query", schema: { type: "string", format: "date" } },
        EndDate: { name: "end_date", in: "query", schema: { type: "string", format: "date" } },
        TimeZone: {
          name: "time_zone",
          in: "query",
          schema: { type: "string", example: "America/Los_Angeles" },
        },
        StartDatetime: { name: "start_datetime", in: "query", schema: { type: "string" } },
        EndDatetime: { name: "end_datetime", in: "query", schema: { type: "string" } },
        PastMinutesStart: { name: "past_minutes_start", in: "query", schema: { type: "integer", minimum: 1 } },
        PastMinutesEnd: { name: "past_minutes_end", in: "query", schema: { type: "integer", minimum: 0 } },
        Filters: {
          name: "filters",
          in: "query",
          description: "JSON-encoded array of analytics filters.",
          schema: { type: "string" },
        },
        SegmentId: {
          name: "segment_id",
          in: "query",
          description:
            "ID of a saved segment whose filters are applied server-side, ANDed with any `filters` also passed.",
          schema: { type: "integer", minimum: 1 },
        },
      },
      schemas: {
        ApiError: {
          type: "object",
          additionalProperties: true,
          required: ["error", "code", "message", "resolution"],
          properties: {
            error: { type: "string", description: "Backward-compatible human-readable error." },
            code: { type: "string", description: "Stable machine-readable error code." },
            message: { type: "string", description: "Human-readable explanation." },
            resolution: { type: "string", description: "Action the caller can take to recover." },
            details: { description: "Optional structured context for this error." },
          },
        },
      },
    },
    externalDocs: {
      description: "Rybbit API documentation",
      url: "https://rybbit.com/docs/api/getting-started",
    },
  };
}

export function openApiResponse(includeBody = true): Response {
  const serialized = `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`;
  return new Response(includeBody ? serialized : null, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Length": String(Buffer.byteLength(serialized)),
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
