import {
  SiAstro,
  SiGoogletagmanager,
  SiNextdotjs,
  SiNuxt,
  SiShopify,
  SiSvelte,
  SiVuedotjs,
  SiWebflow,
  SiWordpress,
} from '@icons-pack/react-simple-icons';
import { ArrowRight } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { source } from '@/lib/source';

/* ── Card stills ─────────────────────────────────────────────────────────
   Each card opens with a small static picture of the page it leads to: the
   real snippet, the real setup command, a chart, an event call, an MCP
   answer, the platform logos. The still is the description; keep them
   static so they never compete with the reading below. */

const artClass =
  'relative h-[92px] overflow-hidden rounded-md border border-fd-border bg-fd-background';
const codeClass =
  'whitespace-pre px-3 py-2.5 font-mono text-[10.5px] leading-[1.6] text-fd-muted-foreground';

function ScriptArt() {
  return (
    <div className={artClass} aria-hidden="true">
      <pre className={codeClass}>
        {'<'}
        <span className="text-emerald-700 dark:text-emerald-400">script</span>
        {'\n  src='}
        <span className="text-[var(--dataviz)]">"https://app.rybbit.io/api/script.js</span>
        {'\n       '}
        <span className="text-[var(--dataviz)]">?siteId=YOUR_SITE_ID"</span>
        {'\n  async>'}
        {'</'}
        <span className="text-emerald-700 dark:text-emerald-400">script</span>
        {'>'}
      </pre>
    </div>
  );
}

function SelfHostArt() {
  const ok = <span className="text-emerald-700 dark:text-emerald-400">✓</span>;
  return (
    <div className={artClass} aria-hidden="true">
      <pre className={codeClass}>
        <span className="text-fd-foreground">$</span> ./setup.sh analytics.example.com{'\n'}
        {ok} Caddy TLS ready{'\n'}
        {ok} ClickHouse · Postgres · Redis up{'\n'}
        {ok} https://analytics.example.com
      </pre>
    </div>
  );
}

function ChartArt() {
  const line =
    'M0 78 L30 74 L60 76 L90 62 L120 58 L150 44 L180 48 L210 30 L240 26 L270 18 L300 12';
  return (
    <div className={artClass} aria-hidden="true">
      <svg viewBox="0 0 300 92" preserveAspectRatio="none" className="block size-full">
        <defs>
          <linearGradient id="docs-home-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--dataviz)" stopOpacity="0.3" />
            <stop offset="1" stopColor="var(--dataviz)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L300 92 L0 92 Z`} fill="url(#docs-home-chart-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--dataviz)"
          strokeWidth="1.75"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute left-3 top-2.5">
        <div className="text-[10px] font-medium text-fd-muted-foreground">Visitors</div>
        <div className="text-base font-semibold leading-tight tracking-tight text-fd-foreground">48.2K</div>
      </div>
    </div>
  );
}

function EventsArt() {
  const v = 'text-[var(--dataviz)]';
  return (
    <div className={artClass} aria-hidden="true">
      <pre className={codeClass}>
        <span className="text-fd-foreground">window.rybbit</span>.event(<span className={v}>"signup"</span>, {'{'}
        {'\n  plan: '}
        <span className={v}>"pro"</span>,{'\n  source: '}
        <span className={v}>"pricing"</span>
        {'\n});'}
      </pre>
    </div>
  );
}

function McpArt() {
  return (
    <div className={artClass} aria-hidden="true">
      <div className="flex flex-col gap-1.5 px-3 py-2.5 text-[10.5px] leading-[1.35]">
        <span className="max-w-[78%] self-end rounded-md bg-fd-secondary px-2 py-1 text-fd-foreground">
          why did signups drop on Tuesday?
        </span>
        <span className="max-w-[82%] self-start rounded-md border border-fd-border px-2 py-1 text-fd-muted-foreground">
          <span className="font-medium text-fd-foreground">/pricing</span> traffic from HN fell 62% after the post
          left the front page; conversion held at 4.1%.
        </span>
      </div>
    </div>
  );
}

const platformLogos = [
  { name: 'Next.js', Icon: SiNextdotjs },
  { name: 'WordPress', Icon: SiWordpress },
  { name: 'Shopify', Icon: SiShopify },
  { name: 'Astro', Icon: SiAstro },
  { name: 'Vue', Icon: SiVuedotjs },
  { name: 'Google Tag Manager', Icon: SiGoogletagmanager },
  { name: 'Nuxt', Icon: SiNuxt },
  { name: 'Webflow', Icon: SiWebflow },
  { name: 'Svelte', Icon: SiSvelte },
];

function GuidesArt({ more }: { more: number }) {
  return (
    <div className={artClass} aria-hidden="true">
      <div className="grid h-full grid-cols-5 content-center gap-1.5 p-3">
        {platformLogos.map(({ name, Icon }) => (
          <span
            key={name}
            title={name}
            className="grid h-[26px] place-items-center rounded-[5px] border border-fd-border bg-fd-card text-fd-muted-foreground"
          >
            <Icon className="size-3.5" />
          </span>
        ))}
        <span className="grid h-[26px] place-items-center rounded-[5px] border border-fd-border bg-fd-card text-[9px] font-semibold text-fd-muted-foreground">
          +{more}
        </span>
      </div>
    </div>
  );
}

/* ── Cards ─────────────────────────────────────────────────────────────── */

type HomeCard = {
  slugs: string[];
  title: string;
  description: string;
  art: ReactNode;
};

/**
 * The six cards at the top of /docs. Every href is resolved through the
 * content source for the current locale, so a renamed page fails the build
 * here instead of shipping a dead card.
 */
export async function DocsHomeCards() {
  const locale = await getLocale();
  const guideCount = source
    .getPages(locale)
    .filter(p => p.slugs[0] === 'guides' && p.slugs.length > 1).length;

  const cards: HomeCard[] = [
    {
      slugs: ['script'],
      title: 'Add the tracking script',
      description: 'One tag before </head>. Options, verification, troubleshooting.',
      art: <ScriptArt />,
    },
    {
      slugs: ['self-hosting'],
      title: 'Self-host with Docker',
      description: 'One command on a 2 GB VPS. Nginx, Pangolin and manual guides too.',
      art: <SelfHostArt />,
    },
    {
      slugs: ['feature-guides', 'main-tab'],
      title: 'Read the dashboard',
      description: 'Feature guides for every tab: main, pages, sessions, replay, errors, globe.',
      art: <ChartArt />,
    },
    {
      slugs: ['track-events'],
      title: 'Track events & users',
      description: 'Custom events, autocapture, identify, goals and funnels.',
      art: <EventsArt />,
    },
    {
      slugs: ['mcp'],
      title: 'MCP for AI agents',
      description: 'Query your analytics from Claude Code, Cursor, Codex, VS Code and more.',
      art: <McpArt />,
    },
    {
      slugs: ['guides'],
      title: 'Integration guides',
      description: `Step-by-step for ${guideCount} platforms, from WordPress to SvelteKit.`,
      art: <GuidesArt more={Math.max(0, guideCount - platformLogos.length)} />,
    },
  ];

  return (
    <div className="not-prose grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(card => {
        const page = source.getPage(card.slugs, locale);
        if (!page) throw new Error(`DocsHomeCards: no page for /${card.slugs.join('/')}`);
        return (
          <Link
            key={page.url}
            href={page.url}
            className="group flex min-w-0 flex-col gap-2.5 rounded-lg border border-fd-border bg-fd-card p-4 no-underline transition-colors hover:border-fd-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background"
          >
            {card.art}
            <div className="flex items-center gap-1.5 pt-1 text-[15px] font-semibold tracking-tight text-fd-foreground">
              {card.title}
              <ArrowRight
                className="ml-auto size-4 shrink-0 text-fd-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-fd-foreground motion-reduce:transition-none"
                aria-hidden="true"
              />
            </div>
            <p className="text-[13.5px] leading-normal text-fd-muted-foreground">{card.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
