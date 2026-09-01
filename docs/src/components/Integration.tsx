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
import { ComponentType, CSSProperties } from "react";

type IconProps = {
  className?: string;
  size?: number;
};

interface Platform {
  name: string;
  icon: ComponentType<IconProps>;
  path: string;
  /** Brand color revealed on hover. `darkColor` overrides it for near-black brands. */
  color: string;
  darkColor?: string;
}

// Platform data with their documentation paths, icons, and brand colors
const platforms: Platform[] = [
  { name: "Angular", icon: SiAngular, path: "/docs/guides/angular", color: "#DD0031" },
  { name: "Astro", icon: SiAstro, path: "/docs/guides/astro", color: "#BC52EE" },
  { name: "BigCommerce", icon: SiBigcommerce, path: "/docs/guides/bigcommerce", color: "#121118", darkColor: "#ffffff" },
  { name: "Carrd", icon: SiCarrd, path: "/docs/guides/carrd", color: "#596CAF" },
  { name: "Contentful", icon: SiContentful, path: "/docs/guides/contentful", color: "#2478CC" },
  { name: "Docusaurus", icon: SiDocusaurus, path: "/docs/guides/docusaurus", color: "#3ECC5F" },
  { name: "Drupal", icon: SiDrupal, path: "/docs/guides/drupal", color: "#0678BE" },
  { name: "Framer", icon: SiFramer, path: "/docs/guides/framer", color: "#0055FF", darkColor: "#66aaff" },
  { name: "Gatsby", icon: SiGatsby, path: "/docs/guides/react/gatsby", color: "#663399", darkColor: "#9d7cbf" },
  { name: "Ghost", icon: SiGhost, path: "/docs/guides/ghost", color: "#15171A", darkColor: "#ffffff" },
  { name: "GitBook", icon: SiGitbook, path: "/docs/guides/gitbook", color: "#3884FF" },
  { name: "GTM", icon: SiGoogletagmanager, path: "/docs/guides/google-tag-manager", color: "#246FDB" },
  { name: "Hugo", icon: SiHugo, path: "/docs/guides/hugo", color: "#FF4088" },
  { name: "Jekyll", icon: SiJekyll, path: "/docs/guides/jekyll", color: "#CC0000", darkColor: "#f25c5c" },
  { name: "Joomla", icon: SiJoomla, path: "/docs/guides/joomla", color: "#5091CD" },
  { name: "Laravel", icon: SiLaravel, path: "/docs/guides/laravel", color: "#FF2D20" },
  { name: "Mintlify", icon: SiMintlify, path: "/docs/guides/mintlify", color: "#0D9373", darkColor: "#18E299" },
  { name: "Next.js", icon: SiNextdotjs, path: "/docs/guides/react/next-js", color: "#000000", darkColor: "#ffffff" },
  { name: "Nuxt", icon: SiNuxt, path: "/docs/guides/vue/nuxt", color: "#00DC82" },
  { name: "PrestaShop", icon: SiPrestashop, path: "/docs/guides/prestashop", color: "#DF0067" },
  { name: "React", icon: SiReact, path: "/docs/guides/react/vite-cra", color: "#087EA4", darkColor: "#61DAFB" },
  { name: "Remix", icon: SiRemix, path: "/docs/guides/react/remix", color: "#121212", darkColor: "#ffffff" },
  { name: "Sanity", icon: SiSanity, path: "/docs/guides/sanity", color: "#F03E2F" },
  { name: "Shopify", icon: SiShopify, path: "/docs/guides/shopify", color: "#7AB55C" },
  { name: "Squarespace", icon: SiSquarespace, path: "/docs/guides/squarespace", color: "#000000", darkColor: "#ffffff" },
  { name: "Strapi", icon: SiStrapi, path: "/docs/guides/strapi", color: "#4945FF", darkColor: "#8c88ff" },
  { name: "Svelte", icon: SiSvelte, path: "/docs/guides/svelte/vite", color: "#FF3E00" },
  { name: "SvelteKit", icon: SiSvelte, path: "/docs/guides/svelte/sveltekit", color: "#FF3E00" },
  { name: "VitePress", icon: SiVitepress, path: "/docs/guides/vitepress", color: "#5C73E7" },
  { name: "Vue", icon: SiVuedotjs, path: "/docs/guides/vue/vite", color: "#4FC08D" },
  { name: "Webflow", icon: SiWebflow, path: "/docs/guides/webflow", color: "#146EF5" },
  { name: "Wix", icon: SiWix, path: "/docs/guides/wix", color: "#0C6EFC" },
  { name: "WooCommerce", icon: SiWoocommerce, path: "/docs/guides/woocommerce", color: "#96588A", darkColor: "#b57fab" },
  { name: "WordPress", icon: SiWordpress, path: "/docs/guides/wordpress", color: "#21759B", darkColor: "#5da9cc" },
];

const PlatformLogo = ({ name, icon: Icon, path, color, darkColor }: Platform) => {
  return (
    <Link
      href={path}
      style={{ "--brand": color, "--brand-dark": darkColor ?? color } as CSSProperties}
      className="group flex min-h-20 items-center gap-3 bg-white px-4 text-neutral-600 transition-colors duration-200 hover:bg-neutral-50 hover:text-neutral-950 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
    >
      <Icon className="size-5 shrink-0 transition-colors duration-200 group-hover:text-[var(--brand)] group-focus-visible:text-[var(--brand)] dark:group-hover:text-[var(--brand-dark)] dark:group-focus-visible:text-[var(--brand-dark)]" />
      <span className="text-sm font-medium">{name}</span>
    </Link>
  );
};

export function IntegrationsGrid() {
  return (
    <div className="grid min-h-full grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 sm:grid-cols-3 xl:grid-cols-4">
      {platforms.map((platform) => (
        <PlatformLogo key={platform.name} {...platform} />
      ))}
    </div>
  );
}
