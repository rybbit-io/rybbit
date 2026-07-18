import { GridCrosses } from "@/components/GridCrosses";
import { ArrowRight, Bot, Braces, Check, KeyRound, ShieldCheck } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";

const agentCalls = [
  { tool: "get_overview", result: "sessions +12.4%" },
  { tool: "analyze_funnel", result: "checkout −8.7%" },
  { tool: "get_errors", result: "PaymentElementError ×43" },
];

export function AgentAnalyticsSection() {
  const t = useExtracted();

  const connectionDetails = [
    {
      icon: Bot,
      title: t("Use the agent you already have"),
      description: t("Connect Claude Code, Codex, Claude Desktop, Cursor, VS Code, opencode, or any MCP client."),
    },
    {
      icon: Braces,
      title: t("Build with the full API"),
      description: t(
        "Browse endpoints, test live responses, and copy generated code in the dashboard's API Playground."
      ),
    },
    {
      icon: KeyRound,
      title: t("Give it exactly enough access"),
      description: t(
        "Sign in with OAuth or issue a revocable API key scoped to the sites and actions the agent needs."
      ),
    },
    {
      icon: ShieldCheck,
      title: t("Keep Rybbit's permission model"),
      description: t(
        "Every tool call follows the same site access, organization roles, and rate limits as the dashboard."
      ),
    },
  ];

  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agent-analytics-title">
      <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
        <GridCrosses />

        <div className="grid border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 md:py-20 lg:col-span-5 lg:border-b-0 lg:border-r lg:px-10">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <span className="flex size-7 items-center justify-center rounded-md border border-emerald-600/30 bg-emerald-500/10">
                <Braces className="size-3.5" aria-hidden="true" />
              </span>
              <span>{t("MCP + API")}</span>
            </div>

            <h2
              id="agent-analytics-title"
              className="mt-6 max-w-md text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
            >
              {t("Your analytics can answer back.")}
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-neutral-600 text-pretty dark:text-neutral-400">
              {t(
                "Let AI agents investigate live traffic, behavior, funnels, errors, and more through Rybbit's hosted MCP server. Use the full REST API and built-in playground when you want to build the workflow yourself."
              )}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/docs/mcp"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
              >
                {t("Explore MCP")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/docs/api/getting-started"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900 dark:focus-visible:ring-offset-neutral-950"
              >
                {t("Browse the API")}
              </Link>
            </div>
          </div>

          <div className="bg-neutral-950 p-3 sm:p-5 lg:col-span-7 lg:p-8">
            <div className="h-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100">
              <div className="flex min-h-12 items-center justify-between border-b border-neutral-800 px-4 sm:px-5">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                  <Bot className="size-4 text-emerald-400" aria-hidden="true" />
                  <span>{t("Example agent run")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  <span>{t("Rybbit connected")}</span>
                </div>
              </div>

              <div className="px-4 py-6 sm:px-6 sm:py-8">
                <div className="ml-auto max-w-[88%] rounded-md bg-neutral-800 px-4 py-3 text-sm leading-6 text-neutral-100 sm:max-w-[78%]">
                  {t("Did yesterday's checkout release hurt conversions?")}
                </div>

                <div className="relative mt-7 space-y-1.5 pl-6 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-neutral-700">
                  {agentCalls.map(call => (
                    <div
                      key={call.tool}
                      className="relative grid gap-1 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4"
                    >
                      <span className="absolute -left-6 top-[18px] flex size-3.5 items-center justify-center rounded-full bg-neutral-900 ring-1 ring-neutral-700">
                        <Check className="size-2.5 text-emerald-400" strokeWidth={2.5} aria-hidden="true" />
                      </span>
                      <code className="text-xs text-[var(--dataviz)]">{call.tool}</code>
                      <span className="font-mono text-xs text-neutral-400 sm:text-right">{call.result}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-neutral-800 pt-5">
                  <p className="text-sm leading-6 text-neutral-200 sm:text-base sm:leading-7">
                    {t(
                      "Traffic is healthy, but checkout conversion fell after the release. PaymentElementError accounts for most failed sessions, so I would start with the card form."
                    )}
                  </p>
                  <p className="mt-3 text-xs text-neutral-400">{t("Answer grounded in your live Rybbit data")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:col-span-5 lg:border-b-0 lg:border-r lg:px-10">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {t("One endpoint. Any MCP client.")}
            </p>
            <div className="mt-4 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <code className="whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-300">
                https://app.rybbit.io/api/mcp
              </code>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {t("Cloud-hosted and ready now, or available at the same path on your self-hosted Rybbit instance.")}
            </p>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 lg:col-span-7">
            {connectionDetails.map(detail => {
              const Icon = detail.icon;
              return (
                <div key={detail.title} className="grid gap-4 px-5 py-7 sm:grid-cols-[190px_1fr] sm:px-8 lg:px-10">
                  <div className="flex items-center gap-3">
                    <Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <h3 className="text-sm font-medium">{detail.title}</h3>
                  </div>
                  <p className="max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                    {detail.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
