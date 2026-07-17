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
    <section className="relative w-full border-t border-neutral-200 dark:border-neutral-800 bg-neutral-950">
      {/* Faint graph paper — echoes the hero, bookending the page */}
      <div
        aria-hidden
        className="absolute inset-0 [background-size:40px_40px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_50%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-20 md:py-28 text-center">
        <h2 className="mx-auto max-w-2xl text-3xl md:text-4xl font-semibold tracking-tight text-white [text-wrap:balance]">
          {resolvedTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base md:text-lg text-neutral-400">{resolvedDescription}</p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <TrackedButton
            href={primaryButtonHref}
            eventName="signup"
            eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
          >
            {resolvedPrimaryButtonText}
          </TrackedButton>
          <TrackedButton
            href={secondaryButtonHref}
            eventName="demo"
            target="_blank"
            rel="noopener noreferrer"
            eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-900 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/50 cursor-pointer"
          >
            {resolvedSecondaryButtonText}
          </TrackedButton>
        </div>

        <p className="mt-6 text-sm text-neutral-500">{t("7-day free trial. Cancel anytime.")}</p>
      </div>
    </section>
  );
}
