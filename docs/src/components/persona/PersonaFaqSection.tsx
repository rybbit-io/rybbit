import { GridCrosses } from "@/components/GridCrosses";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface PersonaFaqItem {
  question: string;
  answer: string;
}

interface PersonaFaqSectionProps {
  heading: string;
  items: PersonaFaqItem[];
}

/**
 * FAQ section for persona pages. The accordion and the FAQPage JSON-LD are
 * rendered from the same array so the schema can never drift from the
 * visible answers — every question is covered, with identical text.
 */
export function PersonaFaqSection({ heading, items }: PersonaFaqSectionProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="persona-faq-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <div className="lg:sticky lg:top-24">
              <h2
                id="persona-faq-title"
                className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                {heading}
              </h2>
            </div>
          </div>
          <Accordion type="single" collapsible className="lg:col-span-8">
            {items.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`} className="last:border-b-0">
                <AccordionTrigger className="px-5 py-5 text-left sm:px-8 lg:px-10">{faq.question}</AccordionTrigger>
                <AccordionContent className="px-5 pb-6 sm:px-8 lg:px-10">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
