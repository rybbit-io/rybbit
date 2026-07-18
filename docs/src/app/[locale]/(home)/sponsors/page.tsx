import { InteriorPageHero } from "@/components/InteriorPageHero";
import { createOGImageUrl } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sponsors - Rybbit Analytics",
  description: "Meet the sponsors who support Rybbit, the open-source privacy-first analytics platform.",
  openGraph: {
    title: "Rybbit Sponsors",
    description: "Meet the sponsors who support Rybbit, the open-source privacy-first analytics platform.",
    type: "website",
    url: "https://rybbit.com/sponsors",
    images: [
      createOGImageUrl(
        "Rybbit Sponsors",
        "Meet the sponsors who support Rybbit, the open-source privacy-first analytics platform."
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit Sponsors",
    description: "Meet the sponsors who support Rybbit, the open-source privacy-first analytics platform.",
    images: [
      createOGImageUrl(
        "Rybbit Sponsors",
        "Meet the sponsors who support Rybbit, the open-source privacy-first analytics platform."
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/sponsors",
  },
};

interface Sponsor {
  name: string;
  logo: string;
  url: string;
  description?: string;
  amount: number;
}

function getTier(amount: number): { name: string; colorClass: string } | null {
  if (amount >= 1000) {
    return { name: "Diamond", colorClass: "text-cyan-400" };
  }
  if (amount >= 500) {
    return { name: "Gold", colorClass: "text-yellow-500" };
  }
  if (amount >= 100) {
    return { name: "Silver", colorClass: "text-gray-400" };
  }
  if (amount >= 50) {
    return { name: "Bronze", colorClass: "text-amber-600" };
  }
  return null;
}

const sponsors: Sponsor[] = [
  {
    name: "Onyx",
    logo: "/sponsors/onyx.jpeg",
    url: "https://onyx.app",
    amount: 500,
  },
  {
    name: "23M",
    logo: "/sponsors/23m.png",
    url: "https://23m.com",
    amount: 100,
  },
  {
    name: "serverlist.dev",
    logo: "/sponsors/serverlist.png",
    url: "https://serverlist.dev",
    amount: 50,
  },
  {
    name: "Fastscribe",
    logo: "/sponsors/fastscribe.png",
    url: "https://fastscribe.io",
    amount: 10,
  },
  {
    name: "Ark",
    logo: "/sponsors/arkhq.png",
    url: "https://arkhq.io",
    amount: 10,
  },
  {
    name: "Kaashosting",
    logo: "/sponsors/kaashosting.png",
    url: "https://www.kaashosting.nl/",
    amount: 10,
  },
  {
    name: "MVPS.net",
    logo: "/sponsors/mvps.png",
    url: "https://www.mvps.net/",
    amount: 10,
  },
  {
    name: "Sayfone",
    logo: "/sponsors/sayfone.svg",
    url: "https://sayfone.com/",
    amount: 10,
  },
];

export default function SponsorsPage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Open-source supporters"
        title="Our Sponsors"
        description="Thank you to the amazing companies that support Rybbit&apos;s development."
        eventLocation="sponsors_hero"
        primaryAction={{
          href: "https://github.com/sponsors/goldflag",
          label: "Become a Sponsor",
          eventName: "sponsor_click",
          external: true,
        }}
        secondaryAction={null}
        note="30,000 visits a month"
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="sponsor-directory-title">
        <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <div className="lg:sticky lg:top-24">
              <h2 id="sponsor-directory-title" className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Backed by the community</h2>
              <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                These teams help fund the continued development of private, open-source analytics.
              </p>
            </div>
          </div>
          <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 lg:col-span-8 md:grid-cols-2">
              {sponsors.map(sponsor => {
                const tier = getTier(sponsor.amount);
                return (
                  <a
                    key={sponsor.name}
                    href={sponsor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-40 items-center gap-5 bg-white px-5 py-8 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:bg-neutral-950 dark:hover:bg-neutral-900/60 sm:px-8 lg:px-10"
                  >
                    <div className="relative size-14 shrink-0">
                      <Image src={sponsor.logo} alt={sponsor.name} fill sizes="56px" className="object-contain" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">{sponsor.name}</span>
                      {sponsor.description && (
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{sponsor.description}</p>
                      )}
                      <span className={cn("mt-2 block text-xs font-medium uppercase tracking-[0.12em]", tier?.colorClass || "text-neutral-400")}>
                        {tier?.name || "Community"}
                      </span>
                    </div>
                  </a>
                );
              })}
          </div>
        </div>
      </section>
    </div>
  );
}
