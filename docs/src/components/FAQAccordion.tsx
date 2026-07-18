import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useExtracted } from "next-intl";
import Link from "next/link";

export function FAQAccordion() {
  const t = useExtracted();

  return (
    <div className="border-t border-neutral-300 dark:border-neutral-700">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>{t("Is Rybbit GDPR and CCPA compliant?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes. Rybbit does not use cookies or collect personal data that identifies your visitors. User IDs are salted daily to prevent fingerprinting, so most sites can remove the analytics cookie banner entirely.")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>{t("How is Rybbit different from Google Analytics?")}</AccordionTrigger>
          <AccordionContent>
            <p>{t("Rybbit is built to answer the common questions immediately, without the report configuration and advertising ecosystem around Google Analytics. It combines a much lighter tracking script with a simpler dashboard and deeper product analytics.")}</p>
            <p className="mt-4">
              {t("See the difference in the")} {" "}
              <Link href="https://demo.rybbit.com/81" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
                {t("live demo")}
              </Link>
              .
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>{t("Can I self-host Rybbit?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes. The complete platform is open source under the AGPL v3.0 license and can be deployed on your own infrastructure for personal or business use.")} {" "}
            <Link href="/docs/self-hosting" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
              {t("Read the self-hosting guide")}
            </Link>
            .
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger>{t("How long does setup take?")}</AccordionTrigger>
          <AccordionContent>
            {t("Most sites are sending data in less than five minutes. Add one script tag or install @rybbit/js from npm, then verify your first pageview in the realtime dashboard.")} {" "}
            <Link href="/docs/script" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
              {t("View the installation guide")}
            </Link>
            .
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>{t("Which platforms does Rybbit support?")}</AccordionTrigger>
          <AccordionContent>
            {t("Rybbit works with any website that can load JavaScript. We also maintain focused guides for Next.js, React, Vue, Svelte, WordPress, Shopify, Webflow, Google Tag Manager, and many more platforms.")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-6">
          <AccordionTrigger>{t("Can I invite my team and share dashboards?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes. Organizations support team access across multiple sites, and dashboards can be shared privately with a secret link or published publicly.")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-7">
          <AccordionTrigger>{t("Can I export my data or use an API?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes. You can export raw data at any time and use the API to bring Rybbit data into your own applications, reports, and workflows. There is no data lock-in.")} {" "}
            <Link href="/docs/api/getting-started" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
              {t("Explore the API")}
            </Link>
            .
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
