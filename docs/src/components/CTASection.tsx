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
    <section className="border-t border-neutral-200 py-6 dark:border-neutral-800 md:py-8">
      <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1240px] md:w-[calc(100%-2rem)]">
        <div className="grid items-end gap-8 overflow-hidden rounded-xl bg-neutral-950 px-6 py-10 text-white sm:px-10 md:grid-cols-12 md:px-12 md:py-14 lg:px-16 lg:py-16">
          <div className="md:col-span-7">
            <h2 className="max-w-[13ch] text-3xl font-semibold leading-none tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
              {resolvedTitle}
            </h2>
            <p className="mt-5 max-w-[58ch] text-sm leading-6 text-neutral-400 md:text-base">
              {resolvedDescription}
            </p>
          </div>

          <div className="md:col-span-5 md:justify-self-end">
            <div className="flex flex-col gap-2 sm:flex-row">
              <TrackedButton
                href={primaryButtonHref}
                eventName="signup"
                eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
                className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-md border border-emerald-800 bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:w-auto"
              >
                {resolvedPrimaryButtonText}
              </TrackedButton>
              <TrackedButton
                href={secondaryButtonHref}
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
                className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-md border border-neutral-700 bg-transparent px-5 text-sm font-semibold text-white transition-colors hover:border-neutral-500 hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:w-auto"
              >
                {resolvedSecondaryButtonText}
              </TrackedButton>
            </div>
            <p className="mt-4 text-sm text-neutral-500 md:text-right">{t("7-day free trial. Cancel anytime.")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
