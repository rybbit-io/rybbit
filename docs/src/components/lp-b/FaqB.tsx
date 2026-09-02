import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useExtracted } from "next-intl";
import Link from "next/link";

const linkClassName = "text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300";

/** The homepage FAQ for the cloud offering. Keep `faqBSchema` in LandingB in step with it. */
export function FaqB() {
  const t = useExtracted();
  return (
    <div className="overflow-hidden border-t border-neutral-200 dark:border-neutral-800">
      <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="md:text-lg">{t("Is Rybbit GDPR and CCPA compliant?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes, Rybbit is fully compliant with GDPR, CCPA, and other privacy regulations. We don't use cookies or collect any personal data that could identify your users. We salt user IDs daily to ensure users are not fingerprinted. You will not need to display a cookie consent banner to your users.")}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger className="md:text-lg">{t("How does Rybbit compare to Google Analytics?")}</AccordionTrigger>
          <AccordionContent>
            {t("It's one dashboard instead of 150+ reports, and the script is 18 KB against GA4's 371 KB. See it for yourself on the")}{" "}
            <Link href="https://demo.rybbit.com/81" className={linkClassName}>
              {t("demo site")}
            </Link>
            .
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger className="md:text-lg">{t("Where is my data stored?")}</AccordionTrigger>
          <AccordionContent>
            {t("On Rybbit Cloud, hosted in European data centers. Rybbit runs the infrastructure, updates, scaling and backups. You add the script and read the dashboard.")}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger className="md:text-lg">{t("How easy is it to set up Rybbit?")}</AccordionTrigger>
          <AccordionContent>
            <Link href="/docs/script" className={linkClassName}>
              {t("Setting up Rybbit")}
            </Link>{" "}
            {t("takes one script tag, or install @rybbit/js from npm. Most sites are collecting data in under 5 minutes, and the docs and support are there if you get stuck.")}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5">
          <AccordionTrigger className="md:text-lg">{t("What platforms does Rybbit support?")}</AccordionTrigger>
          <AccordionContent>
            {t("The script tag works anywhere you can add HTML: WordPress, Shopify, Next.js, React, Vue, and the rest. For apps, install @rybbit/js from npm. Our")}{" "}
            <Link href="/docs" className={linkClassName}>
              {t("documentation")}
            </Link>{" "}
            {t("has a setup guide for each.")}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-6">
          <AccordionTrigger className="md:text-lg">{t("Is Rybbit truly open source?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes. Every line of code, including the cloud and enterprise features, is on")}{" "}
            <Link href="https://github.com/rybbit-io/rybbit" target="_blank" rel="noopener noreferrer" className={linkClassName}>
              GitHub
            </Link>{" "}
            {t("under the AGPL 3.0 license.")}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-7">
          <AccordionTrigger className="md:text-lg">{t("Can I invite my team to my organization?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes, you can invite unlimited team members to your organization. Each member can have different permission levels to view or manage your analytics dashboards.")}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-8">
          <AccordionTrigger className="md:text-lg">{t("Does Rybbit have an API?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes. The Rybbit")}{" "}
            <Link href="/docs/api/getting-started" className={linkClassName}>
              {t("API")}
            </Link>{" "}
            {t("exposes every metric the dashboard shows over HTTP, so you can pull your data into your own apps, dashboards, or workflows.")}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
