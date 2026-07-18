import { GridCrosses } from "@/components/GridCrosses";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export type PersonaSlug =
  | "for-developers"
  | "for-agencies"
  | "for-startups"
  | "for-saas"
  | "for-ecommerce"
  | "for-creators"
  | "for-european-companies"
  | "enterprise";

const personas: { slug: PersonaSlug; title: string; description: string }[] = [
  {
    slug: "for-developers",
    title: "For developers",
    description: "The script tag, the SDK, the API, the MCP server, and self-hosting.",
  },
  {
    slug: "for-agencies",
    title: "For agencies",
    description: "One workspace for every client site, with dashboards clients can read on their own.",
  },
  {
    slug: "for-startups",
    title: "For startups",
    description: "Answers about your traffic and product without hiring a data team.",
  },
  {
    slug: "for-saas",
    title: "For SaaS",
    description: "Signup funnels, retention cohorts, and the sessions behind every drop-off.",
  },
  {
    slug: "for-ecommerce",
    title: "For ecommerce",
    description: "Checkout funnels, campaign tracking, and full traffic with no consent banner.",
  },
  {
    slug: "for-creators",
    title: "For creators & publishers",
    description: "What resonates, where readers come from, and a dashboard you can share.",
  },
  {
    slug: "for-european-companies",
    title: "For European companies",
    description: "EU-hosted cloud, cookieless compliance, and a self-host option for full control.",
  },
  {
    slug: "enterprise",
    title: "Enterprise",
    description: "SSO, dedicated instances, on-premise installation, and infinite retention.",
  },
];

/**
 * The persona cluster's closing nav: every sibling page plus the compare
 * hub, so a mis-landed visitor can self-select instead of bouncing.
 */
export function PersonaCrossLinks({ current }: { current: PersonaSlug }) {
  const siblings = personas.filter(persona => persona.slug !== current);

  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="persona-crosslinks-title">
      <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
        <GridCrosses />
        <div className="border-b border-neutral-200 px-5 py-8 dark:border-neutral-800 sm:px-8 lg:px-10">
          <h2 id="persona-crosslinks-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
            More ways teams use Rybbit.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-px bg-neutral-200 p-px dark:bg-neutral-800 sm:grid-cols-2">
          {siblings.map(persona => (
            <Link
              key={persona.slug}
              href={`/${persona.slug}`}
              className="group flex items-start justify-between gap-4 bg-white px-5 py-6 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:bg-neutral-950 dark:hover:bg-neutral-900/60 sm:px-8 lg:px-10"
            >
              <span className="min-w-0">
                <span className="block font-semibold tracking-tight">{persona.title}</span>
                <span className="mt-1 block text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                  {persona.description}
                </span>
              </span>
              <ArrowRight
                className="mt-1 size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          ))}
          <Link
            href="/compare"
            className="group flex items-start justify-between gap-4 bg-white px-5 py-6 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:bg-neutral-950 dark:hover:bg-neutral-900/60 sm:px-8 lg:px-10"
          >
            <span className="min-w-0">
              <span className="block font-semibold tracking-tight">Compare Rybbit</span>
              <span className="mt-1 block text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                Side-by-side with Google Analytics, Plausible, Matomo, PostHog, and more.
              </span>
            </span>
            <ArrowRight
              className="mt-1 size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
