import {
  SiAngular,
  SiAstro,
  SiDrupal,
  SiFramer,
  SiGhost,
  SiGoogletagmanager,
  SiLaravel,
  SiNextdotjs,
  SiNuxt,
  SiReact,
  SiRemix,
  SiShopify,
  SiSquarespace,
  SiSvelte,
  SiVuedotjs,
  SiWebflow,
  SiWix,
  SiWoocommerce,
  SiWordpress,
} from "@icons-pack/react-simple-icons";
import { ArrowUpRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import type { ComponentType } from "react";

type IconProps = {
  className?: string;
  size?: number;
};

const platforms: { name: string; icon: ComponentType<IconProps>; path: string }[] = [
  { name: "WordPress", icon: SiWordpress, path: "/docs/guides/wordpress" },
  { name: "Shopify", icon: SiShopify, path: "/docs/guides/shopify" },
  { name: "Next.js", icon: SiNextdotjs, path: "/docs/guides/react/next-js" },
  { name: "React", icon: SiReact, path: "/docs/guides/react/vite-cra" },
  { name: "Vue", icon: SiVuedotjs, path: "/docs/guides/vue/vite" },
  { name: "Svelte", icon: SiSvelte, path: "/docs/guides/svelte/vite" },
  { name: "Webflow", icon: SiWebflow, path: "/docs/guides/webflow" },
  { name: "WooCommerce", icon: SiWoocommerce, path: "/docs/guides/woocommerce" },
  { name: "Google Tag Manager", icon: SiGoogletagmanager, path: "/docs/guides/google-tag-manager" },
  { name: "Astro", icon: SiAstro, path: "/docs/guides/astro" },
  { name: "Nuxt", icon: SiNuxt, path: "/docs/guides/vue/nuxt" },
  { name: "Angular", icon: SiAngular, path: "/docs/guides/angular" },
  { name: "Laravel", icon: SiLaravel, path: "/docs/guides/laravel" },
  { name: "Framer", icon: SiFramer, path: "/docs/guides/framer" },
  { name: "Remix", icon: SiRemix, path: "/docs/guides/react/remix" },
  { name: "Ghost", icon: SiGhost, path: "/docs/guides/ghost" },
  { name: "Wix", icon: SiWix, path: "/docs/guides/wix" },
  { name: "Squarespace", icon: SiSquarespace, path: "/docs/guides/squarespace" },
  { name: "Drupal", icon: SiDrupal, path: "/docs/guides/drupal" },
];

export function IntegrationsGrid() {
  const t = useExtracted();

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-200 sm:grid-cols-3 lg:grid-cols-4 dark:border-neutral-800">
      {platforms.map(({ name, icon: Icon, path }) => (
        <Link
          key={name}
          href={path}
          className="group flex min-h-24 items-center gap-3 border-b border-r border-neutral-200 px-4 transition-colors hover:bg-neutral-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:hover:bg-neutral-900"
        >
          <Icon className="size-5 shrink-0 text-neutral-700 transition-colors group-hover:text-neutral-950 dark:text-neutral-400 dark:group-hover:text-white" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{name}</span>
        </Link>
      ))}
      <Link
        href="/docs"
        className="group flex min-h-24 items-center justify-between gap-3 border-b border-r border-neutral-200 bg-neutral-50 px-4 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
      >
        {t("All guides")}
        <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
      </Link>
    </div>
  );
}
