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
import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  color?: string;
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

const PlatformLogo = ({
  name,
  icon: Icon,
  path,
  className,
}: {
  name: string;
  icon: ComponentType<IconProps>;
  path: string;
  className?: string;
}) => {
  return (
    <Link
      href={path}
      className={cn(
        "group flex min-h-20 items-center gap-3 bg-white px-4 transition-colors duration-200 hover:bg-amber-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-neutral-950 dark:hover:bg-amber-950/20",
        className
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 transition-transform duration-200 group-hover:-translate-y-0.5 dark:bg-white">
        <Icon className="size-5" color="default" />
      </span>
      <span className="text-sm font-medium text-neutral-950 transition-colors group-hover:text-amber-950 dark:text-white dark:group-hover:text-amber-100">{name}</span>
    </Link>
  );
};

export function IntegrationsGrid() {
  return (
    <div className="grid min-h-full grid-cols-2 gap-px bg-neutral-200 p-px dark:bg-neutral-800 sm:grid-cols-3 xl:grid-cols-4">
      {platforms.map((platform, index) => (
        <PlatformLogo
          key={platform.name}
          {...platform}
          className={cn(
            index === platforms.length - 2 && "xl:col-span-2",
            index === platforms.length - 1 && "sm:col-span-3 xl:col-span-2"
          )}
        />
      ))}
    </div>
  );
}
