import { TrackedButton } from "@/components/TrackedButton";
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
  const resolvedDescription =
    description ?? t("Powerful insights without the complexity. Privacy-focused analytics that just works.");
  const resolvedPrimaryButtonText = primaryButtonText ?? t("Start for $0");
  const resolvedSecondaryButtonText = secondaryButtonText ?? t("Live demo");

  return (
    <section className="w-full border-y border-neutral-200 bg-neutral-950 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center md:py-28">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance text-white md:text-4xl">
          {resolvedTitle}
        </h2>
        <p className="mt-3 max-w-xl text-base text-pretty text-neutral-400 md:text-lg">{resolvedDescription}</p>

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <TrackedButton
            href={primaryButtonHref}
            eventName="signup"
            eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
            className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-md bg-emerald-600 px-6 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
          >
            {resolvedPrimaryButtonText}
          </TrackedButton>
          <TrackedButton
            href={secondaryButtonHref}
            eventName="demo"
            target="_blank"
            rel="noopener noreferrer"
            eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
            className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-md border border-neutral-700 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 cursor-pointer"
          >
            {resolvedSecondaryButtonText}
          </TrackedButton>
        </div>

        <p className="mt-6 text-sm text-neutral-500">{t("7-day free trial. Cancel anytime.")}</p>
      </div>
    </section>
  );
}
