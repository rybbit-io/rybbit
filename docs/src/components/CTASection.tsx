import { TrackedButton } from "@/components/TrackedButton";
import { landingContainer } from "@/components/landing/section";
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
    <section className="w-full border-t border-neutral-200 bg-emerald-800 dark:border-neutral-800">
      <div className={`${landingContainer} py-16 md:py-20`}>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center">
          <div className="md:col-span-7">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white md:text-3xl">{resolvedTitle}</h2>
            <p className="mt-3 max-w-lg text-base text-emerald-100/90">{resolvedDescription}</p>
          </div>
          <div className="md:col-span-5 md:justify-self-end">
            <div className="flex flex-col gap-3 sm:flex-row">
              <TrackedButton
                href={primaryButtonHref}
                eventName="signup"
                eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
                className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-white px-5 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {resolvedPrimaryButtonText}
              </TrackedButton>
              <TrackedButton
                href={secondaryButtonHref}
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
                className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-white/40 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                {resolvedSecondaryButtonText}
              </TrackedButton>
            </div>
            <p className="mt-3 text-xs text-emerald-200/80">{t("7-day free trial. Cancel anytime.")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
