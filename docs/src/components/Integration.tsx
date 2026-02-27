import { cn } from "@/lib/utils";
import { SectionBadge } from "@/components/SectionBadge";
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
    <Link href={path} className="block">
      <div
        className={cn(
          "flex flex-col justify-center gap-4 p-4 w-32",
          "bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm rounded-lg",
          "border border-neutral-300/50 dark:border-neutral-800/50 hover:border-neutral-500 dark:hover:border-neutral-700 transition-colors duration-200",
          "cursor-pointer hover:scale-105 transition-transform"
        )}
      >
        <Icon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
        <span className="text-sm text-neutral-600 dark:text-neutral-400">{name}</span>
      </div>
    </Link>
  );
};

export function IntegrationsGrid() {
  return (
    <div className="flex flex-wrap gap-5">
      {platforms.map((platform) => (
        <PlatformLogo key={platform.name} {...platform} />
      ))}
    </div>
  );
}
