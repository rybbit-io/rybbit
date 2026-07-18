import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GridCrosses } from "@/components/GridCrosses";
import { RelatedTools } from "@/components/RelatedTools";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BuiltByRybbit } from "./BuiltByRybbit";
import { ToolCTA } from "./ToolCTA";
import styles from "./ToolPageLayout.module.css";

export interface FAQItem {
  question: string;
  answer: ReactNode;
}

export interface ToolPageLayoutProps {
  toolSlug: string;
  title: string;
  description: string;
  badge?: string;
  toolComponent: ReactNode;
  educationalContent: ReactNode;
  faqs: FAQItem[];
  relatedToolsCategory: "seo" | "analytics" | "privacy" | "social-media";
  ctaTitle: string;
  ctaDescription: string;
  ctaEventLocation: string;
  ctaButtonText?: string;
  structuredData?: object;
}

export function ToolPageLayout({
  toolSlug,
  title,
  description,
  badge = "Free tool",
  toolComponent,
  educationalContent,
  faqs,
  relatedToolsCategory,
  ctaTitle,
  ctaDescription,
  ctaEventLocation,
  ctaButtonText,
  structuredData,
}: ToolPageLayoutProps) {
  return (
    <div className="overflow-x-clip">
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      )}

      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses className="hidden sm:block" />
          <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                <li>
                  <Link
                    href="/"
                    className="rounded-sm transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:hover:text-white"
                  >
                    Home
                  </Link>
                </li>
                <ChevronRight className="size-3.5 text-neutral-400 dark:text-neutral-600" aria-hidden="true" />
                <li>
                  <Link
                    href="/tools"
                    className="rounded-sm transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:hover:text-white"
                  >
                    Tools
                  </Link>
                </li>
                <ChevronRight className="size-3.5 text-neutral-400 dark:text-neutral-600" aria-hidden="true" />
                <li aria-current="page" className="font-medium text-neutral-950 dark:text-neutral-50">
                  {title}
                </li>
              </ol>
            </nav>

            <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <span aria-hidden="true" className="size-2 rounded-[1px] bg-emerald-600 dark:bg-emerald-400" />
                  {badge}
                </p>
                <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-neutral-950 text-balance dark:text-neutral-50 sm:text-4xl">
                  {title}
                </h1>
              </div>
              <p className="max-w-lg text-base leading-7 text-neutral-600 text-pretty dark:text-neutral-300 lg:col-span-4">
                {description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label={`${title} workspace`}>
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses className="hidden sm:block" />
          <div className="flex min-h-11 items-center justify-between border-b border-neutral-200 px-5 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 sm:px-8 lg:px-10">
            <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Interactive workspace
            </span>
            <span className="hidden sm:inline">Free · no account required</span>
          </div>

          <div className="grid lg:grid-cols-12">
            <div className="min-w-0 bg-neutral-50/60 px-5 py-8 dark:bg-neutral-900/20 sm:px-8 lg:col-span-9 lg:border-r lg:border-neutral-200 lg:px-10 lg:py-10 lg:dark:border-neutral-800">
              <div className={styles.workspace}>{toolComponent}</div>
            </div>
            <aside className="min-w-0 border-t border-neutral-200 px-5 py-8 dark:border-neutral-800 sm:px-8 lg:col-span-3 lg:border-t-0 lg:px-6 lg:py-10">
              <BuiltByRybbit />
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses className="hidden sm:block" />
          <article className="min-w-0 px-5 py-12 sm:px-8 lg:col-span-8 lg:border-r lg:border-neutral-200 lg:px-10 lg:py-16 lg:dark:border-neutral-800">
            <div className="prose prose-neutral max-w-[70ch] dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-emerald-700 dark:prose-a:text-emerald-400">
              {educationalContent}
            </div>
          </article>

          {faqs.length > 0 && (
            <aside className="min-w-0 border-t border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-t-0 lg:px-8 lg:py-16">
              <div className="lg:sticky lg:top-24">
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                  Frequently asked questions
                </h2>
                <div className="mt-5 border-t border-neutral-200 dark:border-neutral-800">
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`item-${index}`}
                        className="border-b border-neutral-200 px-0 dark:border-neutral-800"
                      >
                        <AccordionTrigger className="px-0 text-left text-sm leading-5">{faq.question}</AccordionTrigger>
                        <AccordionContent className="px-0 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            </aside>
          )}
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:px-10">
          <GridCrosses className="hidden sm:block" />
          <RelatedTools currentToolHref={`/tools/${toolSlug}`} category={relatedToolsCategory} />
        </div>
      </section>

      <ToolCTA
        title={ctaTitle}
        description={ctaDescription}
        eventLocation={ctaEventLocation}
        buttonText={ctaButtonText}
      />
    </div>
  );
}
