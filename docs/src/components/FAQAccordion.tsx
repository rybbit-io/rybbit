import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useExtracted } from "next-intl";
import Link from "next/link";

export function FAQAccordion() {
  const t = useExtracted();
  return (
    <div className="overflow-hidden border-t border-neutral-200 dark:border-neutral-800">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="md:text-lg">{t("Is Rybbit GDPR and CCPA compliant?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes, Rybbit is fully compliant with GDPR, CCPA, and other privacy regulations. We don't use cookies or collect any personal data that could identify your users. We salt user IDs daily to ensure users are not fingerprinted. You will not need to display a cookie consent banner to your users.")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger className="md:text-lg">{t("Rybbit vs. Google Analytics")}</AccordionTrigger>
          <AccordionContent>
            <p>
              {t("Google Analytics is free because Google uses it as a funnel into their ecosystem and to sell ads. Rybbit's only goal is to provide you with high quality analytics. No more confusing dashboards pushing random AI features nobody wants.")}
            </p>
            <br />
            <p>
              {t("See it for yourself on our")}{" "}
              <Link
                href="https://demo.rybbit.com/81"
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
              >
                {t("demo site")}
              </Link>
              {t(": one dashboard, not 150+ reports to dig through.")}
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger className="md:text-lg">{t("Rybbit vs. Plausible/Umami/Fathom")}</AccordionTrigger>
          <AccordionContent>
            <p>
              {t("Rybbit covers the same privacy-first ground as these tools, but with a wider feature set and more attention to how it reads and works.")}
            </p>
            <br />
            <p>
              {t("Every feature, from replay to funnels, is built to be understandable without reading pages of documentation.")}
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger className="md:text-lg">{t("Rybbit vs. Posthog/Mixpanel/Amplitude")}</AccordionTrigger>
          <AccordionContent>
            <p>
              {t("Rybbit has most of the features of enterprise analytics platforms, but packaged in a way that is usable for small and medium sized teams.")}
            </p>
            <br />
            <p>
              {t("We have advanced features like session replay, error tracking, web vitals, and funnels - but you don't need to spend days learning how to use them.")}
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger className="md:text-lg">{t("Can I self-host Rybbit?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes. Install Rybbit on your own server with Docker and keep full control of your data.")}{" "}
            <Link
              href="/docs/self-hosting"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
            >
              {t("Learn more here")}
            </Link>
            {t(". We also offer a cloud version if you prefer a managed solution.")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-6">
          <AccordionTrigger className="md:text-lg">{t("How easy is it to set up Rybbit?")}</AccordionTrigger>
          <AccordionContent>
            <Link
              href="/docs/script"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
            >
              {t("Setting up Rybbit")}
            </Link>{" "}
            {t("takes one script tag, or install @rybbit/js from npm. Most sites are collecting data in under 5 minutes, and the docs and support are there if you get stuck.")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-7">
          <AccordionTrigger className="md:text-lg">{t("What platforms does Rybbit support?")}</AccordionTrigger>
          <AccordionContent>
            {t("The script tag works anywhere you can add HTML: WordPress, Shopify, Next.js, React, Vue, and the rest. For apps, install @rybbit/js from npm. Our")}{" "}
            <Link
              href="/docs"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
            >
              {t("documentation")}
            </Link>{" "}
            {t("has a setup guide for each.")}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-8">
          <AccordionTrigger className="md:text-lg">{t("Is Rybbit open source?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes, Rybbit is open source under the AGPL v3.0 license. You are free to")}{" "}
            <Link
              href="/docs/self-hosting"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
            >
              {t("self-host Rybbit")}
            </Link>{" "}
            {t("for either personal or business use.")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-9">
          <AccordionTrigger className="md:text-lg">{t("Can I invite my team to my organization?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes, you can invite unlimited team members to your organization. Each member can have different permission levels to view or manage your analytics dashboards.")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-10">
          <AccordionTrigger className="md:text-lg">{t("Can I share my dashboard publicly?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes, you can share your dashboard publicly in two ways: with a secret link that only people with the URL can access, or as a completely public dashboard that anyone can view.")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-11">
          <AccordionTrigger className="md:text-lg">{t("Does Rybbit have an API?")}</AccordionTrigger>
          <AccordionContent>
            {t("Yes. The Rybbit")}{" "}
            <Link
              href="/docs/api/getting-started"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
            >
              {t("API")}
            </Link>{" "}
            {t("exposes every metric the dashboard shows over HTTP, so you can pull your data into your own apps, dashboards, or workflows.")}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
