import { source } from "@/lib/source";
import { llms } from "fumadocs-core/source";

// cached forever
export const revalidate = false;

export function GET() {
  const navigation = `# Rybbit

> Open-source, cookieless web and product analytics.

## Machine-readable resources

- [OpenAPI specification](https://rybbit.com/openapi.json): Complete discoverable REST API surface
- [Sitemap](https://rybbit.com/sitemap.xml): Public website URL index
- [Full documentation](https://rybbit.com/llms-full.txt): Documentation in one text response
- [API getting started](https://rybbit.com/docs/api/getting-started): Authentication, time ranges, filters, and rate limits

## Documentation index

`;

  return new Response(`${navigation}${llms(source).index()}`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
