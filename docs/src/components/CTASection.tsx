import { TrackedButton } from "@/components/TrackedButton";
import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
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
    <section className="w-full bg-emerald-700 dark:bg-emerald-800">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 md:px-6 py-16 md:py-24 text-center">
        <h2
          className={cn(
            "max-w-2xl text-balance text-3xl md:text-4xl tracking-tight text-white",
            displayFont.className
          )}
        >
          {resolvedTitle}
        </h2>
        <p className="mt-4 max-w-xl text-base md:text-lg text-emerald-50">{resolvedDescription}</p>

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row md:mt-10">
          <TrackedButton
            href={primaryButtonHref}
            eventName="signup"
            eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg bg-white px-6 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer"
          >
            {resolvedPrimaryButtonText}
          </TrackedButton>
          <TrackedButton
            href={secondaryButtonHref}
            eventName="demo"
            target="_blank"
            rel="noopener noreferrer"
            eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg border border-white/40 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
          >
            {resolvedSecondaryButtonText}
          </TrackedButton>
        </div>

        <p className="mt-6 text-sm text-emerald-100/90">{t("7-day free trial. Cancel anytime.")}</p>
      </div>
    </section>
  );
}
