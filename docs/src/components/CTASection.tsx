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
  const resolvedDescription = description ?? t("Start with the answer you need today. The deeper tools are already there when the next question arrives.");
  const resolvedPrimaryButtonText = primaryButtonText ?? t("Start for $0");
  const resolvedSecondaryButtonText = secondaryButtonText ?? t("Explore the live demo");

  return (
    <section className="bg-white py-5 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 overflow-hidden rounded-lg bg-emerald-500 text-emerald-950 lg:grid-cols-12">
          <div className="px-6 py-12 sm:px-10 sm:py-14 lg:col-span-7 lg:px-12 lg:py-16">
            <h2 className="max-w-[700px] text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.035em] sm:text-5xl">
              {resolvedTitle}
            </h2>
            <p className="mt-5 max-w-[58ch] text-pretty text-base leading-7 text-emerald-950/80">
              {resolvedDescription}
            </p>
          </div>

          <div className="flex flex-col justify-center border-t border-emerald-700/25 px-6 py-10 sm:px-10 lg:col-span-5 lg:border-l lg:border-t-0 lg:px-12">
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <TrackedButton
                href={primaryButtonHref}
                eventName="signup"
                eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-950 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-500 sm:w-auto"
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
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-emerald-950/30 bg-transparent px-5 text-sm font-semibold text-emerald-950 transition-colors hover:border-emerald-950 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-950 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-500 sm:w-auto"
              >
                {resolvedSecondaryButtonText}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </TrackedButton>
            </div>
            <p className="mt-5 text-xs font-medium text-emerald-950/70">{t("7-day free trial. Cancel anytime.")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
