import { AgentConsole } from "@/components/Cards/AgentConsole";
import { GridCrosses } from "@/components/GridCrosses";
import { McpConfigSnippet } from "@/components/deco/McpConfigSnippet";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";

const mcpClients = [
  { name: "Claude Code", href: "/docs/mcp/claude-code" },
  { name: "Codex", href: "/docs/mcp/codex" },
  { name: "Claude Desktop", href: "/docs/mcp/claude-desktop" },
  { name: "Cursor", href: "/docs/mcp/cursor" },
  { name: "VS Code", href: "/docs/mcp/vscode" },
  { name: "opencode", href: "/docs/mcp/opencode" },
];

export function AgentsSection() {
  const t = useExtracted();

  const toolFamilies = [
    { name: t("Analytics & Web Vitals"), count: 9 },
    { name: t("Goals & funnels"), count: 8 },
    { name: t("Organizations & teams"), count: 7 },
    { name: t("Sites"), count: 5 },
    { name: t("People & traits"), count: 5 },
    { name: t("Sessions, events & SQL"), count: 5 },
  ];

  const docLinks = [
    { label: t("Set up MCP"), href: "/docs/mcp" },
    { label: t("API reference"), href: "/docs/api/getting-started" },
    { label: t("Agent-readable docs"), href: "/llms.txt" },
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
              <SectionKicker>{t("MCP + API")}</SectionKicker>
              <h2
                id="agents-title"
                className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl text-balance"
              >
                {t("Analytics your AI agents can actually use.")}
              </h2>
            </div>
          </div>
          <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
            <p className="max-w-md text-lg leading-8 text-neutral-600 dark:text-neutral-400 text-pretty">
              {t(
                "Rybbit ships a hosted MCP server on top of its full REST API. Connect the client you already work in, and your assistant reads live traffic, debugs errors, and manages goals — with the same permissions as a teammate."
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 dark:border-neutral-800 lg:col-span-7 lg:border-b-0 lg:border-r">
            <AgentConsole />
          </div>

          <div className="px-5 py-10 sm:px-8 lg:col-span-5 lg:px-10">
            <h3 className="text-xl font-semibold tracking-tight">{t("One URL to connect")}</h3>
            <McpConfigSnippet className="mt-5 max-w-sm" />
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {t(
                "Clients sign in with OAuth, or use a scoped API key you can revoke any time. Self-hosting? Your install ships the same endpoint."
              )}
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {t("Guides for")}{" "}
              {mcpClients.map((client, index) => (
                <span key={client.name}>
                  <Link
                    href={client.href}
                    className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-100 dark:decoration-neutral-600 dark:hover:decoration-emerald-400"
                  >
                    {client.name}
                  </Link>
                  {index < mcpClients.length - 1 && ", "}
                </span>
              ))}
              .
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10">
            <h3 className="text-xl font-semibold tracking-tight">{t("39 tools, read and write")}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {t(
                "Reads for every dashboard number; writes for goals, funnels, sites, and teams — gated by the same roles and scopes as the app."
              )}
            </p>
          </div>
          <div className="lg:col-span-8">
            <ul className="grid h-full grid-cols-1 gap-px bg-neutral-200 p-px dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-3">
              {toolFamilies.map(family => (
                <li
                  key={family.name}
                  className="flex min-h-16 items-center justify-between gap-4 bg-white px-5 dark:bg-neutral-950 sm:px-6"
                >
                  <span className="text-sm font-medium">{family.name}</span>
                  <span className="font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                    {family.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex min-h-14 flex-wrap items-center gap-x-8 gap-y-2 border-t border-neutral-200 px-5 py-3 dark:border-neutral-800 sm:px-8 lg:px-10">
          {docLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-100 dark:hover:text-emerald-400"
            >
              {link.label}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
