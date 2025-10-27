import {
  SiAngular,
  SiAstro,
  SiDocusaurus,
  SiDrupal,
  SiFramer,
  SiGatsby,
  SiGoogletagmanager,
  SiHugo,
  SiJekyll,
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
  SiMintlify,
} from "@icons-pack/react-simple-icons";
import React from "react";
import { useGetSite, useSiteHasData } from "../../../../api/admin/sites";
import { CodeSnippet } from "../../../../components/CodeSnippet";
import { Alert } from "../../../../components/ui/alert";
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
      className="group flex flex-col py-2 px-3 rounded-lg bg-neutral-850 border border-neutral-750 hover:bg-neutral-900 transition-all duration-200 hover:shadow-lg"
    >
      <div className="flex items-center gap-2">
        <div className="text-neutral-300 group-hover:text-emerald-400 transition-colors">{icon}</div>
        <h3 className="font-medium text-xs text-neutral-900 dark:text-neutral-100">{title}</h3>
      </div>
      {description && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">{description}</p>}
    </a>
  );
}

export function NoData() {
  const { site } = useStore();
  const { data: siteHasData, isLoading } = useSiteHasData(site);
  const { data: siteMetadata, isLoading: isLoadingSiteMetadata } = useGetSite(site);

  if (!siteHasData && !isLoading && !isLoadingSiteMetadata) {
    return (
      <>
        <Alert className="mt-4 p-4  dark:bg-neutral-900 dark:border-amber-600/80">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
              </span>
              <div className="font-medium">Waiting for analytics from {siteMetadata?.domain}...</div>
            </div>
            <div className="text-xs text-muted-foreground">Place this snippet in the &lt;head&gt; of your website:</div>
            <CodeSnippet
              language="HTML"
              code={`<script\n    src="${globalThis.location.origin}/api/script.js"\n    data-site-id="${siteMetadata?.id ?? siteMetadata?.siteId}"\n    defer\n></script>`}
              className="text-xs"
            />
            <span className="text-xs text-muted-foreground">
              See our{" "}
              <a href="https://rybbit.io/docs/script" className="text-blue-500 hover:underline">
                docs
              </a>{" "}
              for more information.
            </span>
            {/* Framework Guide Cards */}
            <div className="">
              <h2 className="text-sm font-medium mb-4">Platform Guides</h2>
              <div className="flex flex-wrap gap-2">
                <Card
                  icon={<SiGoogletagmanager className="w-5 h-5" />}
                  title="Google Tag Manager"
                  description=""
                  href="https://rybbit.io/docs/guides/google-tag-manager"
                />
                <Card
                  icon={<SiReact className="w-5 h-5" />}
                  title="React"
                  description=""
                  href="https://rybbit.io/docs/guides/react/vite-cra"
                />
                <Card
                  icon={<SiNextdotjs className="w-5 h-5" />}
                  title="Next.js"
                  description=""
                  href="https://rybbit.io/docs/guides/react/next-js"
                />
                <Card
                  icon={<SiAngular className="w-5 h-5" />}
                  title="Angular"
                  description=""
                  href="https://rybbit.io/docs/guides/angular"
                />
                <Card
                  icon={<SiVuedotjs className="w-5 h-5" />}
                  title="Vue"
                  description=""
                  href="https://rybbit.io/docs/guides/vue/vite"
                />
                <Card
                  icon={<SiNuxt className="w-5 h-5" />}
                  title="Nuxt"
                  description=""
                  href="https://rybbit.io/docs/guides/vue/nuxt"
                />
                <Card
                  icon={<SiSvelte className="w-5 h-5" />}
                  title="Svelte"
                  description=""
                  href="https://rybbit.io/docs/guides/svelte/vite"
                />
                <Card
                  icon={<SiSvelte className="w-5 h-5" />}
                  title="SvelteKit"
                  description=""
                  href="https://rybbit.io/docs/guides/svelte/sveltekit"
                />
                <Card
                  icon={<SiAstro className="w-5 h-5" />}
                  title="Astro"
                  description=""
                  href="https://rybbit.io/docs/guides/astro"
                />
                <Card
                  icon={<SiGatsby className="w-5 h-5" />}
                  title="Gatsby"
                  description=""
                  href="https://rybbit.io/docs/guides/react/gatsby"
                />
                <Card
                  icon={<SiRemix className="w-5 h-5" />}
                  title="Remix"
                  description=""
                  href="https://rybbit.io/docs/guides/react/remix"
                />
                <Card
                  icon={<SiDocusaurus className="w-5 h-5" />}
                  title="Docusaurus"
                  description=""
                  href="https://rybbit.io/docs/guides/docusaurus"
                />
                <Card
                  icon={<SiDrupal className="w-5 h-5" />}
                  title="Drupal"
                  description=""
                  href="https://rybbit.io/docs/guides/drupal"
                />
                <Card
                  icon={<SiFramer className="w-5 h-5" />}
                  title="Framer"
                  description=""
                  href="https://rybbit.io/docs/guides/framer"
                />

                <Card
                  icon={<SiHugo className="w-5 h-5" />}
                  title="Hugo"
                  description=""
                  href="https://rybbit.io/docs/guides/hugo"
                />
                <Card
                  icon={<SiJekyll className="w-5 h-5" />}
                  title="Jekyll"
                  description=""
                  href="https://rybbit.io/docs/guides/jekyll"
                />
                <Card
                  icon={<SiLaravel className="w-5 h-5" />}
                  title="Laravel"
                  description=""
                  href="https://rybbit.io/docs/guides/laravel"
                />
                <Card
                  icon={<SiMintlify className="w-5 h-5" />}
                  title="Mintlify"
                  description=""
                  href="https://rybbit.io/docs/guides/mintlify"
                />
                <Card
                  icon={<SiShopify className="w-5 h-5" />}
                  title="Shopify"
                  description=""
                  href="https://rybbit.io/docs/guides/shopify"
                />
                <Card
                  icon={<SiSquarespace className="w-5 h-5" />}
                  title="Squarespace"
                  description=""
                  href="https://rybbit.io/docs/guides/squarespace"
                />
                <Card
                  icon={<SiWordpress className="w-5 h-5" />}
                  title="WordPress"
                  description=""
                  href="https://rybbit.io/docs/guides/wordpress"
                />
                <Card
                  icon={<SiWebflow className="w-5 h-5" />}
                  title="Webflow"
                  description=""
                  href="https://rybbit.io/docs/guides/webflow"
                />
                <Card
                  icon={<SiWix className="w-5 h-5" />}
                  title="Wix"
                  description=""
                  href="https://rybbit.io/docs/guides/wix"
                />
                <Card
                  icon={<SiWoocommerce className="w-5 h-5" />}
                  title="WooCommerce"
                  description=""
                  href="https://rybbit.io/docs/guides/woocommerce"
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
