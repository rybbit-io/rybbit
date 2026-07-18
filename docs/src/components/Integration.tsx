import {
  SiAngular,
  SiAstro,
  SiFramer,
  SiGoogletagmanager,
  SiLaravel,
  SiNextdotjs,
  SiNuxt,
  SiReact,
  SiRemix,
  SiShopify,
  SiSvelte,
  SiVuedotjs,
  SiWebflow,
  SiWoocommerce,
  SiWordpress,
} from "@icons-pack/react-simple-icons";
import { ComponentType } from "react";
import Link from "next/link";

type IconProps = {
  className?: string;
  size?: number;
};

const platforms: { name: string; icon: ComponentType<IconProps>; path: string }[] = [
  { name: "Next.js", icon: SiNextdotjs, path: "/docs/guides/react/next-js" },
  { name: "React", icon: SiReact, path: "/docs/guides/react/vite-cra" },
  { name: "Vue", icon: SiVuedotjs, path: "/docs/guides/vue/vite" },
  { name: "Svelte", icon: SiSvelte, path: "/docs/guides/svelte/vite" },
  { name: "Astro", icon: SiAstro, path: "/docs/guides/astro" },
  { name: "Angular", icon: SiAngular, path: "/docs/guides/angular" },
  { name: "WordPress", icon: SiWordpress, path: "/docs/guides/wordpress" },
  { name: "Shopify", icon: SiShopify, path: "/docs/guides/shopify" },
  { name: "WooCommerce", icon: SiWoocommerce, path: "/docs/guides/woocommerce" },
  { name: "Webflow", icon: SiWebflow, path: "/docs/guides/webflow" },
  { name: "Framer", icon: SiFramer, path: "/docs/guides/framer" },
  { name: "Tag Manager", icon: SiGoogletagmanager, path: "/docs/guides/google-tag-manager" },
  { name: "Laravel", icon: SiLaravel, path: "/docs/guides/laravel" },
  { name: "Nuxt", icon: SiNuxt, path: "/docs/guides/vue/nuxt" },
  { name: "Remix", icon: SiRemix, path: "/docs/guides/react/remix" },
];

export function IntegrationsGrid() {
  return (
    <div className="grid grid-cols-2 border-l border-t border-neutral-300 dark:border-neutral-700 sm:grid-cols-3">
      {platforms.map(platform => {
        const Icon = platform.icon;
        return (
          <Link
            key={platform.name}
            href={platform.path}
            className="group flex min-h-24 flex-col justify-between border-b border-r border-neutral-300 p-4 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:border-neutral-700 dark:hover:bg-neutral-900 sm:min-h-28 sm:p-5"
          >
            <Icon className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-neutral-950 dark:text-neutral-400 dark:group-hover:text-white" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{platform.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
