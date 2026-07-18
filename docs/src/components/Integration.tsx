import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
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
        "flex items-center gap-3 bg-white px-5 py-4 dark:bg-neutral-950",
        "transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
      <span className="text-sm text-neutral-700 dark:text-neutral-300">{name}</span>
    </Link>
  );
};

export function IntegrationsGrid() {
  const t = useExtracted();
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-px bg-neutral-200 sm:grid-cols-3 lg:grid-cols-5 dark:bg-neutral-800">
        {platforms.map((platform) => (
          <PlatformLogo key={platform.name} {...platform} />
        ))}
        <Link
          href="/docs"
          className={cn(
            "flex items-center gap-3 bg-white px-5 py-4 dark:bg-neutral-950",
            "transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
          )}
        >
          <ArrowRight className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-neutral-900 dark:text-white">{t("All guides")}</span>
        </Link>
      </div>
    </div>
  );
}
