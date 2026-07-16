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
import { ChevronRight } from "lucide-react";
import { useExtracted } from "next-intl";
import React, { useState } from "react";
import { useGetSite, useSiteHasData } from "../../../../api/admin/hooks/useSites";
import { CodeSnippet } from "../../../../components/CodeSnippet";
import { ExternalLink } from "../../../../components/ExternalLink";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { useStore } from "../../../../lib/store";

const ICON = "h-3.5 w-3.5";

interface PlatformGuide {
  title: string;
  icon: React.ReactNode;
  href: string;
}

// The first VISIBLE_PLATFORM_COUNT entries are the most common platforms and
// show by default; the rest are alphabetical behind the "Show all" toggle.
const PLATFORM_GUIDES: PlatformGuide[] = [
  { title: "WordPress", icon: <SiWordpress className={ICON} />, href: "https://rybbit.com/docs/guides/wordpress" },
  { title: "Shopify", icon: <SiShopify className={ICON} />, href: "https://rybbit.com/docs/guides/shopify" },
  { title: "Next.js", icon: <SiNextdotjs className={ICON} />, href: "https://rybbit.com/docs/guides/react/next-js" },
  { title: "React", icon: <SiReact className={ICON} />, href: "https://rybbit.com/docs/guides/react/vite-cra" },
  {
    title: "Google Tag Manager",
    icon: <SiGoogletagmanager className={ICON} />,
    href: "https://rybbit.com/docs/guides/google-tag-manager",
  },
  { title: "Webflow", icon: <SiWebflow className={ICON} />, href: "https://rybbit.com/docs/guides/webflow" },
  {
    title: "Squarespace",
    icon: <SiSquarespace className={ICON} />,
    href: "https://rybbit.com/docs/guides/squarespace",
  },
  { title: "Wix", icon: <SiWix className={ICON} />, href: "https://rybbit.com/docs/guides/wix" },
  { title: "Framer", icon: <SiFramer className={ICON} />, href: "https://rybbit.com/docs/guides/framer" },
  { title: "Vue", icon: <SiVuedotjs className={ICON} />, href: "https://rybbit.com/docs/guides/vue/vite" },
  { title: "Angular", icon: <SiAngular className={ICON} />, href: "https://rybbit.com/docs/guides/angular" },
  { title: "Astro", icon: <SiAstro className={ICON} />, href: "https://rybbit.com/docs/guides/astro" },
  {
    title: "BigCommerce",
    icon: <SiBigcommerce className={ICON} />,
    href: "https://rybbit.com/docs/guides/bigcommerce",
  },
  { title: "Carrd", icon: <SiCarrd className={ICON} />, href: "https://rybbit.com/docs/guides/carrd" },
  { title: "Contentful", icon: <SiContentful className={ICON} />, href: "https://rybbit.com/docs/guides/contentful" },
  { title: "Docusaurus", icon: <SiDocusaurus className={ICON} />, href: "https://rybbit.com/docs/guides/docusaurus" },
  { title: "Drupal", icon: <SiDrupal className={ICON} />, href: "https://rybbit.com/docs/guides/drupal" },
  { title: "Gatsby", icon: <SiGatsby className={ICON} />, href: "https://rybbit.com/docs/guides/react/gatsby" },
  { title: "Ghost", icon: <SiGhost className={ICON} />, href: "https://rybbit.com/docs/guides/ghost" },
  { title: "GitBook", icon: <SiGitbook className={ICON} />, href: "https://rybbit.com/docs/guides/gitbook" },
  { title: "Hugo", icon: <SiHugo className={ICON} />, href: "https://rybbit.com/docs/guides/hugo" },
  { title: "Jekyll", icon: <SiJekyll className={ICON} />, href: "https://rybbit.com/docs/guides/jekyll" },
  { title: "Joomla", icon: <SiJoomla className={ICON} />, href: "https://rybbit.com/docs/guides/joomla" },
  { title: "Laravel", icon: <SiLaravel className={ICON} />, href: "https://rybbit.com/docs/guides/laravel" },
  { title: "Mintlify", icon: <SiMintlify className={ICON} />, href: "https://rybbit.com/docs/guides/mintlify" },
  { title: "Nuxt", icon: <SiNuxt className={ICON} />, href: "https://rybbit.com/docs/guides/vue/nuxt" },
  { title: "PrestaShop", icon: <SiPrestashop className={ICON} />, href: "https://rybbit.com/docs/guides/prestashop" },
  { title: "Remix", icon: <SiRemix className={ICON} />, href: "https://rybbit.com/docs/guides/react/remix" },
  { title: "Sanity", icon: <SiSanity className={ICON} />, href: "https://rybbit.com/docs/guides/sanity" },
  { title: "Strapi", icon: <SiStrapi className={ICON} />, href: "https://rybbit.com/docs/guides/strapi" },
  { title: "Svelte", icon: <SiSvelte className={ICON} />, href: "https://rybbit.com/docs/guides/svelte/vite" },
  { title: "SvelteKit", icon: <SiSvelte className={ICON} />, href: "https://rybbit.com/docs/guides/svelte/sveltekit" },
  {
    title: "ThriveCart",
    icon: <img src="/platforms/thrivecart.svg" alt="" className={`${ICON} grayscale`} />,
    href: "https://rybbit.com/docs/guides/thrivecart",
  },
  { title: "VitePress", icon: <SiVitepress className={ICON} />, href: "https://rybbit.com/docs/guides/vitepress" },
  {
    title: "WooCommerce",
    icon: <SiWoocommerce className={ICON} />,
    href: "https://rybbit.com/docs/guides/woocommerce",
  },
];

const VISIBLE_PLATFORM_COUNT = 12;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300";

export function NoData() {
  const t = useExtracted();
  const { site } = useStore();
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [showJsFallback, setShowJsFallback] = useState(false);
  const { data: siteHasData, isLoading } = useSiteHasData(site);
  const { data: siteMetadata, isLoading: isLoadingSiteMetadata } = useGetSite(site);

  if (siteHasData || isLoading || isLoadingSiteMetadata) {
    return null;
  }

  const visibleGuides = showAllPlatforms ? PLATFORM_GUIDES : PLATFORM_GUIDES.slice(0, VISIBLE_PLATFORM_COUNT);
  const hiddenCount = PLATFORM_GUIDES.length - VISIBLE_PLATFORM_COUNT;

  const isMobileSite = siteMetadata?.type === "mobile";
  const siteId = siteMetadata?.id ?? siteMetadata?.siteId;
  const scriptUrl = `${globalThis.location.origin}/api/script.js`;

  const htmlSnippet = `<script\n    src="${scriptUrl}"\n    data-site-id="${siteId}"\n    defer\n></script>`;

  const jsSnippet = `(function () {\n  var el = document.createElement("script");\n  el.src = "${scriptUrl}";\n  el.setAttribute("data-site-id", "${siteId}");\n  document.head.appendChild(el);\n})();`;

  const aiPrompt = `Install Rybbit analytics on this website.\n\nAdd this script tag to the <head> of every page, using the root layout or base template if there is one:\n\n<script src="${scriptUrl}" data-site-id="${siteId}" defer></script>\n`;

  const rnInstallSnippet = "npm install @rybbit/react-native @react-native-async-storage/async-storage";

  const rnInitSnippet = `import AsyncStorage from "@react-native-async-storage/async-storage";
import rybbit from "@rybbit/react-native";

await rybbit.init({
  analyticsHost: "${globalThis.location.origin}/api",
  siteId: "${siteId}",
  appIdentifier: "${siteMetadata?.domain || "com.example.app"}",
  storage: AsyncStorage,
  initialScreenName: "Home",
});`;

  const rnAiPrompt = `Install Rybbit analytics in this React Native app.\n\n1. Install the SDK:\n\nnpm install @rybbit/react-native @react-native-async-storage/async-storage\n\n2. Initialize it once in the app entry point:\n\n${rnInitSnippet}\n\n3. If the app uses React Navigation, track screens automatically:\n\nconst navigationTracker = rybbit.createNavigationTracker();\n\n<NavigationContainer\n  ref={navigationRef}\n  onReady={() => navigationTracker.onReady(navigationRef)}\n  onStateChange={() => navigationTracker.onStateChange(navigationRef)}\n>\n\nDocs: https://rybbit.com/docs/sdks/react-native\n`;

  return (
    <section className="mt-4 rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-850 dark:bg-neutral-900">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-3">
            <span className="relative mt-1.5 flex h-3 w-3 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 motion-safe:animate-ping"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
            </span>
            <h2 className="break-words text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              {isMobileSite
                ? t("Waiting for the first screen view from {name}", { name: siteMetadata?.name ?? "" })
                : t("Waiting for the first pageview from {name}", { name: siteMetadata?.name ?? "" })}
            </h2>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 md:pl-6">
            {isMobileSite
              ? t("Install the SDK below, then launch your app. This page updates on its own once data arrives.")
              : t("Install the snippet below, then open your site. This page updates on its own once data arrives.")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Tabs defaultValue={isMobileSite ? "sdk" : "html"}>
            <TabsList>
              {isMobileSite ? (
                <TabsTrigger value="sdk">React Native</TabsTrigger>
              ) : (
                <TabsTrigger value="html">HTML</TabsTrigger>
              )}
              <TabsTrigger value="ai">{t("AI agent")}</TabsTrigger>
            </TabsList>
            {isMobileSite && (
              <TabsContent value="sdk" className="flex flex-col gap-2">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{t("Install the SDK package:")}</p>
                <CodeSnippet language="bash" code={rnInstallSnippet} className="text-xs" />
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {t("Initialize it once in your app entry point:")}
                </p>
                <CodeSnippet language="TypeScript" code={rnInitSnippet} className="text-xs" />
              </TabsContent>
            )}
            {!isMobileSite && (
              <TabsContent value="html" className="flex flex-col gap-2">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {t("Paste this into the {headTag} of your website:", { headTag: "<head>" })}
                </p>
                <CodeSnippet language="HTML" code={htmlSnippet} className="text-xs" />
                <div>
                  <button
                    type="button"
                    onClick={() => setShowJsFallback(!showJsFallback)}
                    aria-expanded={showJsFallback}
                    className={`inline-flex items-center gap-1 rounded-md text-xs text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 ${FOCUS_RING}`}
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 motion-safe:transition-transform ${showJsFallback ? "rotate-90" : ""}`}
                    />
                    {t("If the snippet doesn't work, try JavaScript injection")}
                  </button>
                  {showJsFallback && (
                    <div className="mt-2 flex flex-col gap-2">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        {t("Run this in any JavaScript that loads on every page:")}
                      </p>
                      <CodeSnippet language="javascript" code={jsSnippet} className="text-xs" />
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
            <TabsContent value="ai" className="flex flex-col gap-2">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {t("Copy this prompt into Claude Code, Cursor, or another coding agent:")}
              </p>
              <CodeSnippet code={isMobileSite ? rnAiPrompt : aiPrompt} className="text-xs" />
            </TabsContent>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isMobileSite ? (
              <ExternalLink href="https://rybbit.com/docs/sdks/react-native">{t("React Native SDK docs")}</ExternalLink>
            ) : (
              <>
                <ExternalLink href="https://rybbit.com/docs/script">{t("Installation docs")}</ExternalLink>
                <span className="text-neutral-300 dark:text-neutral-600" aria-hidden="true">
                  ·
                </span>
                <ExternalLink href="https://rybbit.com/docs/script-troubleshooting">
                  {t("Troubleshooting guide")}
                </ExternalLink>
              </>
            )}
          </div>
        </div>

        {!isMobileSite && (
          <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-850">
            <h3 className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {t("Or follow a setup guide for your platform")}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleGuides.map(guide => (
                <a
                  key={guide.title}
                  href={guide.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex h-7 items-center gap-1.5 rounded-md border border-neutral-150 bg-white px-2.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-850 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-neutral-50 ${FOCUS_RING}`}
                >
                  <span className="text-neutral-500 transition-colors group-hover:text-emerald-500 dark:text-neutral-400 dark:group-hover:text-emerald-400">
                    {guide.icon}
                  </span>
                  {guide.title}
                </a>
              ))}
              <button
                type="button"
                onClick={() => setShowAllPlatforms(!showAllPlatforms)}
                className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 ${FOCUS_RING}`}
              >
                {showAllPlatforms ? t("Show fewer") : t("Show {count} more", { count: String(hiddenCount) })}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
