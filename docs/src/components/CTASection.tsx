import { TrackedButton } from "@/components/TrackedButton";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";

interface CTASectionProps {
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  eventLocation?: string;
}

export function CTASection({
  title,
  description,
  primaryButtonText,
  primaryButtonHref = "https://app.rybbit.io/signup",
  secondaryButtonText,
  secondaryButtonHref = "https://demo.rybbit.com/81",
  eventLocation = "bottom_cta",
}: CTASectionProps) {
  const t = useExtracted();
  const resolvedTitle = title ?? t("Ready for better analytics?");
  const resolvedDescription = description ?? t("Powerful insights without the complexity. Privacy-focused analytics that just works.");
  const resolvedPrimaryButtonText = primaryButtonText ?? t("Start for $0");
  const resolvedSecondaryButtonText = secondaryButtonText ?? t("Live demo");

  return (
    <section className="border-b border-emerald-800 bg-emerald-700 text-white">
      <div className="mx-auto grid max-w-[1200px] border-x border-emerald-600 lg:grid-cols-12">
        <div className="border-b border-emerald-600 px-5 py-16 sm:px-8 md:py-24 lg:col-span-8 lg:border-b-0 lg:border-r lg:px-10">
          <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.035em] md:text-6xl text-balance">
            {resolvedTitle}
          </h2>
        </div>

        <div className="flex flex-col justify-center px-5 py-12 sm:px-8 lg:col-span-4 lg:px-10">
          <p className="max-w-md text-base leading-7 text-emerald-50">{resolvedDescription}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <TrackedButton
              href={primaryButtonHref}
              eventName="signup"
              eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-emerald-800 transition-colors duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-700"
            >
              {resolvedPrimaryButtonText}
              <ArrowRight className="size-4" aria-hidden="true" />
            </TrackedButton>
            <TrackedButton
              href={secondaryButtonHref}
              eventName="demo"
              target="_blank"
              rel="noopener noreferrer"
              eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-400 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {resolvedSecondaryButtonText}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </TrackedButton>
          </div>

          <p className="mt-6 text-sm text-emerald-100">{t("7-day free trial. Cancel anytime.")}</p>
        </div>
      </div>
    </section>
  );
}
