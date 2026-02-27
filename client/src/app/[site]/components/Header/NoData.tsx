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
import { useExtracted } from "next-intl";
import React from "react";
import { useGetSite, useSiteHasData } from "../../../../api/admin/hooks/useSites";
import { CodeSnippet } from "../../../../components/CodeSnippet";
import { Alert } from "../../../../components/ui/alert";
import { VerifyInstallation } from "../../../../components/VerifyInstallation";
import { useStore } from "../../../../lib/store";

// Custom Card Component
interface CardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

function Card({ icon, title, description, href }: CardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col py-2 px-3 rounded-lg bg-white dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-750 transition-all duration-200"
    >
      <div className="flex items-center gap-2">
        <div className="text-neutral-600 dark:text-neutral-300 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
          {icon}
        </div>
        <h3 className="font-medium text-xs text-neutral-900 dark:text-neutral-100">{title}</h3>
      </div>
      {description && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">{description}</p>}
    </a>
  );
}

export function NoData() {
  const t = useExtracted();
  const { site } = useStore();
  const { data: siteHasData, isLoading } = useSiteHasData(site);
  const { data: siteMetadata, isLoading: isLoadingSiteMetadata } = useGetSite(site);

  if (!siteHasData && !isLoading && !isLoadingSiteMetadata) {
    return (
      <>
        <Alert className="mt-4 p-4 bg-amber-50 border-amber-400/80 dark:bg-neutral-900 dark:border-amber-600/80">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
              </span>
              <div className="font-medium">{t("Waiting for analytics from {domain}...", { domain: siteMetadata?.domain ?? "" })}</div>
            </div>
            <div className="text-xs text-muted-foreground">{t("Place this snippet in the {headTag} of your website:", { headTag: "<head>" })}</div>
            <CodeSnippet
              language="HTML"
              code={`<script\n    src="${globalThis.location.origin}/api/script.js"\n    data-site-id="${siteMetadata?.id ?? siteMetadata?.siteId}"\n    defer\n></script>`}
              className="text-xs"
            />
            <span className="text-xs text-muted-foreground">
              {t("See our")}{" "}
              <a href="https://rybbit.com/docs/script" className="text-blue-500 hover:underline">
                {t("docs")}
              </a>{" "}
              {t("for more information, or")}{" "}
              <a href="https://rybbit.com/docs/script-troubleshooting" className="text-blue-500 hover:underline">
                {t("troubleshoot")}
              </a>{" "}
              {t("if your script isn't sending traffic.")}
            </span>
            {siteMetadata?.siteId && <VerifyInstallation siteId={siteMetadata.siteId} />}
            {/* Framework Guide Cards */}
            <div className="">
              <h2 className="text-sm font-medium mb-4">{t("Platform Guides")}</h2>
              <div className="flex flex-wrap gap-2">
                <Card
                  icon={<SiGoogletagmanager className="w-5 h-5" />}
                  title="Google Tag Manager"
                  description=""
                  href="https://rybbit.com/docs/guides/google-tag-manager"
                />
                <Card
                  icon={<SiReact className="w-5 h-5" />}
                  title="React"
                  description=""
                  href="https://rybbit.com/docs/guides/react/vite-cra"
                />
                <Card
                  icon={<SiNextdotjs className="w-5 h-5" />}
                  title="Next.js"
                  description=""
                  href="https://rybbit.com/docs/guides/react/next-js"
                />
                <Card
                  icon={<SiAngular className="w-5 h-5" />}
                  title="Angular"
                  description=""
                  href="https://rybbit.com/docs/guides/angular"
                />
                <Card
                  icon={<SiVuedotjs className="w-5 h-5" />}
                  title="Vue"
                  description=""
                  href="https://rybbit.com/docs/guides/vue/vite"
                />
                <Card
                  icon={<SiNuxt className="w-5 h-5" />}
                  title="Nuxt"
                  description=""
                  href="https://rybbit.com/docs/guides/vue/nuxt"
                />
                <Card
                  icon={<SiSvelte className="w-5 h-5" />}
                  title="Svelte"
                  description=""
                  href="https://rybbit.com/docs/guides/svelte/vite"
                />
                <Card
                  icon={<SiSvelte className="w-5 h-5" />}
                  title="SvelteKit"
                  description=""
                  href="https://rybbit.com/docs/guides/svelte/sveltekit"
                />
                <Card
                  icon={<img src="/platforms/thrivecart.svg" alt="ThriveCart" className="w-5 h-5 grayscale" />}
                  title="ThriveCart"
                  description=""
                  href="https://rybbit.com/docs/guides/thrivecart"
                />
                <Card
                  icon={<SiAstro className="w-5 h-5" />}
                  title="Astro"
                  description=""
                  href="https://rybbit.com/docs/guides/astro"
                />
                <Card
                  icon={<SiBigcommerce className="w-5 h-5" />}
                  title="BigCommerce"
                  description=""
                  href="https://rybbit.com/docs/guides/bigcommerce"
                />
                <Card
                  icon={<SiCarrd className="w-5 h-5" />}
                  title="Carrd"
                  description=""
                  href="https://rybbit.com/docs/guides/carrd"
                />
                <Card
                  icon={<SiContentful className="w-5 h-5" />}
                  title="Contentful"
                  description=""
                  href="https://rybbit.com/docs/guides/contentful"
                />
                <Card
                  icon={<SiGatsby className="w-5 h-5" />}
                  title="Gatsby"
                  description=""
                  href="https://rybbit.com/docs/guides/react/gatsby"
                />
                <Card
                  icon={<SiGhost className="w-5 h-5" />}
                  title="Ghost"
                  description=""
                  href="https://rybbit.com/docs/guides/ghost"
                />
                <Card
                  icon={<SiGitbook className="w-5 h-5" />}
                  title="GitBook"
                  description=""
                  href="https://rybbit.com/docs/guides/gitbook"
                />
                <Card
                  icon={<SiRemix className="w-5 h-5" />}
                  title="Remix"
                  description=""
                  href="https://rybbit.com/docs/guides/react/remix"
                />
                <Card
                  icon={<SiDocusaurus className="w-5 h-5" />}
                  title="Docusaurus"
                  description=""
                  href="https://rybbit.com/docs/guides/docusaurus"
                />
                <Card
                  icon={<SiDrupal className="w-5 h-5" />}
                  title="Drupal"
                  description=""
                  href="https://rybbit.com/docs/guides/drupal"
                />
                <Card
                  icon={<SiFramer className="w-5 h-5" />}
                  title="Framer"
                  description=""
                  href="https://rybbit.com/docs/guides/framer"
                />

                <Card
                  icon={<SiHugo className="w-5 h-5" />}
                  title="Hugo"
                  description=""
                  href="https://rybbit.com/docs/guides/hugo"
                />
                <Card
                  icon={<SiJekyll className="w-5 h-5" />}
                  title="Jekyll"
                  description=""
                  href="https://rybbit.com/docs/guides/jekyll"
                />
                <Card
                  icon={<SiJoomla className="w-5 h-5" />}
                  title="Joomla"
                  description=""
                  href="https://rybbit.com/docs/guides/joomla"
                />
                <Card
                  icon={<SiLaravel className="w-5 h-5" />}
                  title="Laravel"
                  description=""
                  href="https://rybbit.com/docs/guides/laravel"
                />
                <Card
                  icon={<SiMintlify className="w-5 h-5" />}
                  title="Mintlify"
                  description=""
                  href="https://rybbit.com/docs/guides/mintlify"
                />
                <Card
                  icon={<SiPrestashop className="w-5 h-5" />}
                  title="PrestaShop"
                  description=""
                  href="https://rybbit.com/docs/guides/prestashop"
                />
                <Card
                  icon={<SiSanity className="w-5 h-5" />}
                  title="Sanity"
                  description=""
                  href="https://rybbit.com/docs/guides/sanity"
                />
                <Card
                  icon={<SiShopify className="w-5 h-5" />}
                  title="Shopify"
                  description=""
                  href="https://rybbit.com/docs/guides/shopify"
                />
                <Card
                  icon={<SiSquarespace className="w-5 h-5" />}
                  title="Squarespace"
                  description=""
                  href="https://rybbit.com/docs/guides/squarespace"
                />
                <Card
                  icon={<SiStrapi className="w-5 h-5" />}
                  title="Strapi"
                  description=""
                  href="https://rybbit.com/docs/guides/strapi"
                />
                <Card
                  icon={<SiVitepress className="w-5 h-5" />}
                  title="VitePress"
                  description=""
                  href="https://rybbit.com/docs/guides/vitepress"
                />
                <Card
                  icon={<SiWordpress className="w-5 h-5" />}
                  title="WordPress"
                  description=""
                  href="https://rybbit.com/docs/guides/wordpress"
                />
                <Card
                  icon={<SiWebflow className="w-5 h-5" />}
                  title="Webflow"
                  description=""
                  href="https://rybbit.com/docs/guides/webflow"
                />
                <Card
                  icon={<SiWix className="w-5 h-5" />}
                  title="Wix"
                  description=""
                  href="https://rybbit.com/docs/guides/wix"
                />
                <Card
                  icon={<SiWoocommerce className="w-5 h-5" />}
                  title="WooCommerce"
                  description=""
                  href="https://rybbit.com/docs/guides/woocommerce"
                />
              </div>
            </div>
          </div>
        </Alert>
      </>
    );
  }

  return null;
}
