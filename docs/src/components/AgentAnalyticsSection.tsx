import { GridCrosses } from "@/components/GridCrosses";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { ArrowRight, Check } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";

const agentClients = ["Codex", "Claude Code", "Cursor", "VS Code", "opencode", "Claude Desktop"];

export function AgentAnalyticsSection() {
  const t = useExtracted();

  const toolCalls = [
    {
      name: "get_overview",
      description: t("Comparing traffic before and after the deploy"),
    },
    {
      name: "get_breakdown",
      description: t("Segmenting the change by browser and device"),
    },
    {
      name: "get_errors",
      description: t("Checking production errors in the same window"),
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
              <SectionKicker>{t("MCP + API")}</SectionKicker>
              <h2
                id="agents-title"
                className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
              >
                {t("Put your analytics inside the agent loop.")}
              </h2>
            </div>
          </div>

          <div className="flex flex-col justify-center px-5 py-10 sm:px-8 md:py-16 lg:col-span-5 lg:px-10">
            <p className="max-w-md text-base leading-7 text-neutral-600 text-pretty dark:text-neutral-400">
              {t(
                "Give AI agents direct, permission-aware access to the same traffic, behavior, and product data you trust in Rybbit."
              )}
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
              <Link
                href="/docs/mcp"
                className="inline-flex min-h-10 items-center gap-2 text-emerald-700 transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4 dark:text-emerald-400 dark:hover:text-emerald-300 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-neutral-950"
              >
                {t("Connect with MCP")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/docs/api/getting-started"
                className="inline-flex min-h-10 items-center gap-2 text-neutral-700 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-4 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:ring-neutral-300 dark:focus-visible:ring-offset-neutral-950"
              >
                {t("Explore the API")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12">
          <div className="border-b border-neutral-200 dark:border-neutral-800 lg:col-span-7 lg:border-b-0 lg:border-r">
            <div className="flex min-h-14 items-center justify-between border-b border-neutral-200 px-5 text-sm dark:border-neutral-800 sm:px-8 lg:px-10">
              <div className="flex items-center gap-2.5 font-medium">
                <span aria-hidden="true" className="size-2 rounded-full bg-emerald-500" />
                {t("Example agent run")}
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{t("Rybbit MCP · Connected")}</span>
            </div>

            <div className="px-5 py-10 sm:px-8 md:py-12 lg:px-10 lg:py-14">
              <div className="grid gap-4 sm:grid-cols-[88px_1fr] sm:gap-6">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t("You asked")}</p>
                <p className="max-w-xl text-xl font-medium leading-8 tracking-tight text-pretty">
                  “{t("Find what changed after yesterday's checkout deploy.")}”
                </p>
              </div>

              <div className="my-8 h-px bg-neutral-200 dark:bg-neutral-800" />

              <div className="grid gap-4 sm:grid-cols-[88px_1fr] sm:gap-6">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t("Rybbit ran")}</p>
                <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {toolCalls.map(tool => (
                    <div key={tool.name} className="grid grid-cols-[1fr_auto] gap-4 py-4 sm:grid-cols-[142px_1fr_auto]">
                      <code className="col-start-1 row-start-1 text-xs font-medium text-neutral-950 dark:text-neutral-100">
                        {tool.name}
                      </code>
                      <p className="col-start-1 row-start-2 text-sm leading-5 text-neutral-600 dark:text-neutral-400 sm:col-start-2 sm:row-start-1">
                        {tool.description}
                      </p>
                      <span
                        className="col-start-2 row-start-1 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white sm:col-start-3"
                        aria-label={t("Complete")}
                      >
                        <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-[88px_1fr] sm:gap-6">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t("Answer")}</p>
                <p className="max-w-xl text-base leading-7 text-neutral-700 text-pretty dark:text-neutral-300">
                  {t(
                    "Checkout conversion dipped on mobile Safari after the deploy. A new TypeError appeared in the same window, so I would start with that release."
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:col-span-5">
            <div className="border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:px-10 lg:py-12">
              <h3 className="text-xl font-semibold tracking-tight">{t("One endpoint. Any compatible agent.")}</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-neutral-600 text-pretty dark:text-neutral-400">
                {t("Connect with OAuth in supported clients, or use a scoped API key for headless and automated work.")}
              </p>

              <div className="mt-7 overflow-x-auto border-y border-neutral-200 bg-neutral-50 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900">
                <code className="block min-w-max text-xs leading-6 text-neutral-700 dark:text-neutral-300">
                  <span className="select-none text-neutral-400 dark:text-neutral-500">$ </span>
                  {"codex mcp add rybbit --url \\"}
                  <br />
                  <span className="pl-4 text-emerald-700 dark:text-emerald-400">https://app.rybbit.io/api/mcp</span>
                  <br />
                  <span className="select-none text-neutral-400 dark:text-neutral-500">$ </span>
                  codex mcp login rybbit
                </code>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
                {agentClients.map(client => (
                  <span key={client} className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {client}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid flex-1 sm:grid-cols-2">
              <div className="border-b border-neutral-200 px-5 py-8 dark:border-neutral-800 sm:border-b-0 sm:border-r sm:px-8 lg:px-7">
                <p className="text-sm font-semibold">{t("Hosted MCP")}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {t(
                    "Explore traffic, journeys, errors, funnels, and people. Create goals or manage sites when you allow it."
                  )}
                </p>
              </div>
              <div className="px-5 py-8 sm:px-8 lg:px-7">
                <p className="text-sm font-semibold">{t("Analytics API")}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {t(
                    "Query analytics, send and export events, or build reporting workflows with documented endpoints."
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-6 dark:border-neutral-800 dark:bg-neutral-900 sm:px-8 lg:px-10">
              <p className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                <span className="font-semibold text-neutral-950 dark:text-white">
                  {t("Your access rules still apply.")}
                </span>{" "}
                {t(
                  "Agents inherit your roles, site access, scopes, and rate limits. Rybbit never sends data to an AI provider on its own."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
