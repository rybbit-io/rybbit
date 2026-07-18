import { GridCrosses } from "@/components/GridCrosses";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { ArrowRight, Bot, Braces, Check, KeyRound } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";

export function AgentAnalyticsSection() {
  const t = useExtracted();

  const toolCalls = [
    {
      name: "list_sites",
      detail: t("Resolve the site, organization, and role"),
    },
    {
      name: "get_breakdown",
      detail: t("Compare landing pages over the last 7 days"),
    },
    {
      name: "create_goal",
      detail: t("Save the signup conversion for the selected path"),
    },
  ];

  const capabilities = [
    {
      icon: Bot,
      title: t("Hosted MCP, ready to connect"),
      description: t(
        "Add one Streamable HTTP endpoint to Codex, Claude, Cursor, VS Code, or any MCP client. Your agent can inspect analytics and take approved actions with the right tools."
      ),
    },
    {
      icon: Braces,
      title: t("A complete API behind every answer"),
      description: t(
        "Query traffic, events, sessions, funnels, errors, and raw data—or build reports, automations, and server-side tracking directly on Rybbit's REST API."
      ),
    },
    {
      icon: KeyRound,
      title: t("Your access rules stay in control"),
      description: t(
        "Connect with OAuth or a revocable, scoped API key. Every request keeps the same site access, organization roles, permissions, and rate limits as the dashboard."
      ),
    },
  ];

  const clients = ["Codex", "Claude", "Cursor", "VS Code", "opencode", t("Any MCP client")];

  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agent-analytics-title">
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
                id="agent-analytics-title"
                className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
              >
                {t("Give your agents a direct line to your analytics.")}
              </h2>
            </div>
          </div>

          <div className="flex flex-col justify-between px-5 py-10 sm:px-8 md:py-16 lg:col-span-5 lg:px-10 lg:py-20">
            <p className="max-w-lg text-lg leading-8 text-pretty text-neutral-600 dark:text-neutral-300">
              {t(
                "Ask what changed, inspect the behavior behind it, or turn an answer into action. Rybbit gives AI agents a secure, structured way to work with the same data you trust in the dashboard."
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
              <Link
                href="/docs/mcp"
                className="group inline-flex min-h-11 items-center gap-2 text-neutral-950 transition-colors hover:text-emerald-700 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-white dark:hover:text-emerald-400 dark:focus-visible:ring-offset-neutral-950"
              >
                {t("Explore MCP")}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/docs/api/getting-started"
                className="group inline-flex min-h-11 items-center gap-2 text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:ring-offset-neutral-950"
              >
                {t("Browse the API")}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12">
          <div className="border-b border-neutral-800 bg-neutral-950 text-neutral-100 lg:col-span-7 lg:border-b-0 lg:border-r">
            <div className="flex min-h-14 items-center justify-between gap-4 border-b border-neutral-800 px-5 sm:px-8 lg:px-10">
              <div className="flex items-center gap-2.5 text-sm font-medium">
                <Bot className="size-4 text-emerald-400" aria-hidden="true" />
                <span>{t("Agent run")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                <span>{t("Connected through MCP")}</span>
              </div>
            </div>

            <div className="px-5 py-8 sm:px-8 md:py-10 lg:px-10">
              <div className="grid gap-3 sm:grid-cols-[96px_1fr]">
                <p className="pt-0.5 text-xs font-medium text-neutral-500">{t("You asked")}</p>
                <p className="max-w-xl text-base leading-7 text-pretty text-neutral-100">
                  {t("Which landing pages grew last week? Create a signup goal for the best path.")}
                </p>
              </div>

              <ol className="mt-8 divide-y divide-neutral-800 border-y border-neutral-800">
                {toolCalls.map((tool, index) => (
                  <li key={tool.name} className="grid grid-cols-[28px_1fr] items-start gap-3 py-4 sm:grid-cols-[28px_148px_1fr_auto] sm:items-center">
                    <span
                      className="flex size-6 items-center justify-center rounded-sm bg-emerald-400/10 text-emerald-300"
                      aria-hidden="true"
                    >
                      <Check className="size-3.5" />
                    </span>
                    <code className="text-sm font-medium text-neutral-100">{tool.name}</code>
                    <span className="col-start-2 text-sm leading-6 text-neutral-400 sm:col-start-auto">{tool.detail}</span>
                    <span className="hidden text-xs text-neutral-500 sm:block">
                      {t("Step {step}", { step: String(index + 1) })}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-8 grid gap-3 sm:grid-cols-[96px_1fr]">
                <p className="pt-0.5 text-xs font-medium text-emerald-400">{t("Rybbit")}</p>
                <p className="max-w-xl text-sm leading-6 text-neutral-300">
                  {t(
                    "The agent selects purpose-built tools, while every call stays inside your existing Rybbit permissions."
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-800 px-5 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
              <code className="break-all text-neutral-300">https://app.rybbit.io/api/mcp</code>
              <span className="text-neutral-500">{t("OAuth or scoped API key")}</span>
            </div>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 lg:col-span-5">
            {capabilities.map(capability => {
              const Icon = capability.icon;
              return (
                <article key={capability.title} className="grid grid-cols-[28px_1fr] gap-4 px-5 py-8 sm:px-8 md:py-10 lg:px-10">
                  <Icon className="mt-0.5 size-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">{capability.title}</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-pretty text-neutral-600 dark:text-neutral-400">
                      {capability.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="grid border-t border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="flex items-center border-b border-neutral-200 px-5 py-5 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              {t("Works with the agents your team already uses")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-5 sm:px-8 lg:col-span-8 lg:px-10">
            {clients.map(client => (
              <span key={client} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span aria-hidden="true" className="size-1.5 rounded-[1px] bg-emerald-600 dark:bg-emerald-400" />
                {client}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
