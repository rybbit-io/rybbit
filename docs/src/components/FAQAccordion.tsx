import { useExtracted } from "next-intl";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { createFaqSchema } from "@/lib/faq-schema";

export function FAQAccordion() {
  const t = useExtracted();
  const items = [
    {
      question: t("Is Rybbit GDPR and CCPA compliant?"),
      answer: (
        <>
          {t(
            "Rybbit is cookieless and uses daily-salted IDs for anonymous visitors. Identified users and optional features such as session replay or raw-IP storage require a separate privacy assessment. Consent and other compliance requirements depend on your configuration, use case, and jurisdiction."
          )}
        </>
      ),
    },
    {
      question: t("Rybbit vs. Google Analytics"),
      answer: (
        <>
          <p>
            {t(
              "Google Analytics is free because Google uses it as a funnel into their ecosystem and to sell ads. Rybbit's only goal is to provide you with high quality analytics. No more confusing dashboards pushing random AI features nobody wants."
            )}
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
        </>
      ),
    },
    {
      question: t("Rybbit vs. Plausible/Umami/Fathom"),
      answer: (
        <>
          <p>
            {t(
              "Rybbit covers the same privacy-first ground as these tools, but with a wider feature set and more attention to how it reads and works."
            )}
          </p>
          <br />
          <p>
            {t(
              "Every feature, from replay to funnels, is built to be understandable without reading pages of documentation."
            )}
          </p>
        </>
      ),
    },
    {
      question: t("Rybbit vs. Posthog/Mixpanel/Amplitude"),
      answer: (
        <>
          <p>
            {t(
              "Rybbit has most of the features of enterprise analytics platforms, but packaged in a way that is usable for small and medium sized teams."
            )}
          </p>
          <br />
          <p>
            {t(
              "We have advanced features like session replay, error tracking, web vitals, and funnels - but you don't need to spend days learning how to use them."
            )}
          </p>
        </>
      ),
    },
    {
      question: t("Can I self-host Rybbit?"),
      answer: (
        <>
          {t("Yes. Install Rybbit on your own server with Docker and keep full control of your data.")}{" "}
          <Link
            href="/docs/self-hosting"
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
          >
            {t("Learn more here")}
          </Link>
          {t(". We also offer a cloud version if you prefer a managed solution.")}
        </>
      ),
    },
    {
      question: t("How easy is it to set up Rybbit?"),
      answer: (
        <>
          <Link
            href="/docs/script"
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
          >
            {t("Setting up Rybbit")}
          </Link>{" "}
          {t(
            "takes one script tag, or install @rybbit/js from npm. Most sites are collecting data in under 5 minutes, and the docs and support are there if you get stuck."
          )}
        </>
      ),
    },
    {
      question: t("What platforms does Rybbit support?"),
      answer: (
        <>
          {t(
            "The script tag works anywhere you can add HTML: WordPress, Shopify, Next.js, React, Vue, and the rest. For apps, install @rybbit/js from npm. Our"
          )}{" "}
          <Link
            href="/docs"
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
          >
            {t("documentation")}
          </Link>{" "}
          {t("has a setup guide for each.")}
        </>
      ),
    },
    {
      question: t("Is Rybbit open source?"),
      answer: (
        <>
          {t("Yes, Rybbit is open source under the AGPL v3.0 license. You are free to")}{" "}
          <Link
            href="/docs/self-hosting"
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
          >
            {t("self-host Rybbit")}
          </Link>{" "}
          {t("for either personal or business use.")}
        </>
      ),
    },
    {
      question: t("Can I invite my team to my organization?"),
      answer: (
        <>
          {t(
            "Yes, you can invite unlimited team members to your organization. Each member can have different permission levels to view or manage your analytics dashboards."
          )}
        </>
      ),
    },
    {
      question: t("Can I share my dashboard publicly?"),
      answer: (
        <>
          {t(
            "Yes, you can share your dashboard publicly in two ways: with a secret link that only people with the URL can access, or as a completely public dashboard that anyone can view."
          )}
        </>
      ),
    },
    {
      question: t("Does Rybbit have an API?"),
      answer: (
        <>
          {t("Yes. The Rybbit")}{" "}
          <Link
            href="/docs/api/getting-started"
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
          >
            {t("API")}
          </Link>{" "}
          {t(
            "exposes every metric the dashboard shows over HTTP, so you can pull your data into your own apps, dashboards, or workflows."
          )}
        </>
      ),
    },
  ];
  return (
    <div className="overflow-hidden border-t border-neutral-200 dark:border-neutral-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(createFaqSchema(items)).replace(/</g, "\\u003c") }}
      />
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, index) => (
          <AccordionItem key={item.question} value={`item-${index + 1}`}>
            <AccordionTrigger className="md:text-lg">{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
