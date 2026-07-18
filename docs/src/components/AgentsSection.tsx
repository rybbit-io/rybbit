import { GridCrosses } from "@/components/GridCrosses";
import { McpTranscript } from "@/components/deco/McpTranscript";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";

/**
 * Homepage section marketing the MCP server, the REST API, and agent
 * readiness. Same instrument-sheet grammar as the rest of the page: signal
 * plate, hairline seams, one demo artifact (the replayed MCP session).
 */

// Real client guides shipped under /docs/mcp. Names are product names, not copy.
const mcpClients = [
  { name: "Claude Code", path: "/docs/mcp/claude-code" },
  { name: "Claude Desktop", path: "/docs/mcp/claude-desktop" },
  { name: "Cursor", path: "/docs/mcp/cursor" },
  { name: "Codex", path: "/docs/mcp/codex" },
  { name: "VS Code", path: "/docs/mcp/vscode" },
  { name: "opencode", path: "/docs/mcp/opencode" },
];

function ConnectSnippet() {
  const t = useExtracted();
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-1.5 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <span aria-hidden="true" className="size-2 rounded-full bg-[#ff5f57]" />
        <span aria-hidden="true" className="size-2 rounded-full bg-[#febc2e]" />
        <span aria-hidden="true" className="size-2 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">{t("terminal")}</span>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-6">
        <code className="text-neutral-500 dark:text-neutral-400">
          <span className="select-none">$ </span>
          <span className="text-neutral-700 dark:text-neutral-300">claude mcp add</span>
          {" --transport http rybbit \\"}
          {"\n    "}
          <span className="text-emerald-700 dark:text-emerald-400">https://app.rybbit.io/api/mcp</span>
        </code>
      </pre>
    </div>
  );
}

export function AgentsSection() {
  const t = useExtracted();

  const facts = [
    {
      title: t("39 tools, read and write"),
      description: t(
        "Traffic, errors, Web Vitals, funnels, goals, and session-level detail — plus site, goal, and team management, behind the same role checks as the dashboard."
      ),
      linkLabel: t("Explore the MCP server"),
      href: "/docs/mcp",
    },
    {
      title: t("A full REST API"),
      description: t(
        "Every number the dashboard shows, over plain HTTP with an in-app playground — and a read-only SQL tool for the questions we didn't predict."
      ),
      linkLabel: t("Read the API docs"),
      href: "/docs/api/getting-started",
    },
    {
      title: t("Access you can scope"),
      description: t(
        "Connect with OAuth, or hand each agent its own revocable API key scoped to exactly the resources it needs. Destructive tools are flagged so clients confirm first."
      ),
      linkLabel: t("See permissions and scopes"),
      href: "/docs/mcp#permissions-and-roles",
    },
  ];

  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agents-title">
      <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
        <GridCrosses />

        <div className="grid border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 md:py-20 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
            />
            <div className="relative">
              <SectionKicker>{t("Built for AI agents")}</SectionKicker>
              <h2
                id="agents-title"
                className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl text-balance"
              >
                {t("Every number, one tool call away.")}
              </h2>
            </div>
          </div>
          <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
            <p className="max-w-md text-lg leading-8 text-neutral-600 dark:text-neutral-400 text-pretty">
              {t(
                "Rybbit ships a hosted MCP server and a full REST API, so the agents you already run can pull the same live numbers you see — under the same roles and rate limits."
              )}
            </p>
          </div>
        </div>

        <div className="grid border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 md:py-12 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10">
            <McpTranscript />
            <p className="mt-4 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {t("A real session: four MCP tool calls, one grounded answer, no dashboard tab.")}
            </p>
          </div>

          <div className="flex flex-col gap-10 px-5 py-10 sm:px-8 md:py-12 lg:col-span-5 lg:px-10">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">{t("Connect in one command")}</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {t(
                  "Log in with OAuth — no key to paste — or use a scoped API key. Self-hosting? Point the same command at your own domain."
                )}
              </p>
              <ConnectSnippet />
            </div>

            <div>
              <h3 className="text-xl font-semibold tracking-tight">{t("Works with your client")}</h3>
              <div className="mt-4 grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800">
                {mcpClients.map(client => (
                  <Link
                    key={client.name}
                    href={client.path}
                    className="group flex items-center justify-between gap-2 bg-white px-4 py-3 text-sm font-medium transition-colors duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-950 dark:bg-neutral-950 dark:hover:bg-neutral-900 dark:focus-visible:ring-neutral-300"
                  >
                    {client.name}
                    <ArrowUpRight
                      className="size-3.5 text-neutral-400 transition-colors duration-200 group-hover:text-emerald-600 dark:text-neutral-500 dark:group-hover:text-emerald-400"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                {t("Any MCP client that speaks Streamable HTTP works. The docs are agent-readable too:")}{" "}
                <Link
                  href="/llms.txt"
                  className="font-mono text-xs text-neutral-700 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-emerald-700 hover:decoration-emerald-600 dark:text-neutral-300 dark:decoration-neutral-600 dark:hover:text-emerald-400 dark:hover:decoration-emerald-400"
                >
                  llms.txt
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3">
          {facts.map(fact => (
            <article
              key={fact.title}
              className="flex flex-col border-b border-neutral-200 px-5 py-10 last:border-b-0 dark:border-neutral-800 sm:px-8 md:border-b-0 md:border-r md:last:border-r-0 lg:px-10"
            >
              <h3 className="text-base font-semibold tracking-tight">{fact.title}</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{fact.description}</p>
              <Link
                href={fact.href}
                className="group mt-6 inline-flex items-center gap-1.5 self-start text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:text-emerald-400 dark:hover:text-emerald-300 dark:focus-visible:ring-neutral-300"
              >
                {fact.linkLabel}
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
