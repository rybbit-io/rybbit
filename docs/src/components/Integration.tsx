import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  SiAngular,
  SiAstro,
  SiBigcommerce,
  SiCarrd,
  SiContentful,
  SiDocusaurus,
  SiDrupal,
  SiFramer,
  SiGatsby,
  SiGhost,
  SiGitbook,
  SiGoogletagmanager,
  SiHugo,
  SiJekyll,
  SiJoomla,
  SiLaravel,
  SiMintlify,
  SiNextdotjs,
  SiNuxt,
  SiPrestashop,
  SiReact,
  SiRemix,
  SiSanity,
  SiShopify,
  SiSquarespace,
  SiStrapi,
  SiSvelte,
  SiVitepress,
  SiVuedotjs,
  SiWebflow,
  SiWix,
  SiWoocommerce,
  SiWordpress,
} from "@icons-pack/react-simple-icons";
import { ComponentType } from "react";

type IconProps = {
  className?: string;
  size?: number;
};

// Platform data with their documentation paths and icons
const platforms: { name: string; icon: ComponentType<IconProps>; path: string }[] = [
  { name: "Angular", icon: SiAngular, path: "/docs/guides/angular" },
  { name: "Astro", icon: SiAstro, path: "/docs/guides/astro" },
  { name: "BigCommerce", icon: SiBigcommerce, path: "/docs/guides/bigcommerce" },
  { name: "Carrd", icon: SiCarrd, path: "/docs/guides/carrd" },
  { name: "Contentful", icon: SiContentful, path: "/docs/guides/contentful" },
  { name: "Docusaurus", icon: SiDocusaurus, path: "/docs/guides/docusaurus" },
  { name: "Drupal", icon: SiDrupal, path: "/docs/guides/drupal" },
  { name: "Framer", icon: SiFramer, path: "/docs/guides/framer" },
  { name: "Gatsby", icon: SiGatsby, path: "/docs/guides/react/gatsby" },
  { name: "Ghost", icon: SiGhost, path: "/docs/guides/ghost" },
  { name: "GitBook", icon: SiGitbook, path: "/docs/guides/gitbook" },
  { name: "GTM", icon: SiGoogletagmanager, path: "/docs/guides/google-tag-manager" },
  { name: "Hugo", icon: SiHugo, path: "/docs/guides/hugo" },
  { name: "Jekyll", icon: SiJekyll, path: "/docs/guides/jekyll" },
  { name: "Joomla", icon: SiJoomla, path: "/docs/guides/joomla" },
  { name: "Laravel", icon: SiLaravel, path: "/docs/guides/laravel" },
  { name: "Mintlify", icon: SiMintlify, path: "/docs/guides/mintlify" },
  { name: "Next.js", icon: SiNextdotjs, path: "/docs/guides/react/next-js" },
  { name: "Nuxt", icon: SiNuxt, path: "/docs/guides/vue/nuxt" },
  { name: "PrestaShop", icon: SiPrestashop, path: "/docs/guides/prestashop" },
  { name: "React", icon: SiReact, path: "/docs/guides/react/vite-cra" },
  { name: "Remix", icon: SiRemix, path: "/docs/guides/react/remix" },
  { name: "Sanity", icon: SiSanity, path: "/docs/guides/sanity" },
  { name: "Shopify", icon: SiShopify, path: "/docs/guides/shopify" },
  { name: "Squarespace", icon: SiSquarespace, path: "/docs/guides/squarespace" },
  { name: "Strapi", icon: SiStrapi, path: "/docs/guides/strapi" },
  { name: "Svelte", icon: SiSvelte, path: "/docs/guides/svelte/vite" },
  { name: "SvelteKit", icon: SiSvelte, path: "/docs/guides/svelte/sveltekit" },
  { name: "VitePress", icon: SiVitepress, path: "/docs/guides/vitepress" },
  { name: "Vue", icon: SiVuedotjs, path: "/docs/guides/vue/vite" },
  { name: "Webflow", icon: SiWebflow, path: "/docs/guides/webflow" },
  { name: "Wix", icon: SiWix, path: "/docs/guides/wix" },
  { name: "WooCommerce", icon: SiWoocommerce, path: "/docs/guides/woocommerce" },
  { name: "WordPress", icon: SiWordpress, path: "/docs/guides/wordpress" },
];

const PlatformLogo = ({ name, icon: Icon, path }: { name: string; icon: ComponentType<IconProps>; path: string }) => {
  return (
    <Link
      href={path}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2.5",
        "border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/50",
        "transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-white dark:hover:bg-neutral-900"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-neutral-500 dark:text-neutral-400 transition-colors group-hover:text-neutral-900 dark:group-hover:text-neutral-200" />
      <span className="truncate text-sm text-neutral-700 dark:text-neutral-300 transition-colors group-hover:text-neutral-900 dark:group-hover:text-white">
        {name}
      </span>
    </Link>
  );
};

export function IntegrationsGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
      {platforms.map((platform) => (
        <PlatformLogo key={platform.name} {...platform} />
      ))}
    </div>
  );
}
