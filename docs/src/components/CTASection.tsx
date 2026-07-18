import { TrackedButton } from "@/components/TrackedButton";
import { useExtracted } from "next-intl";
import Image from "next/image";

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
    <section className="relative z-10 w-full py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-16 md:px-16 md:py-20">
          {/* Graph-paper texture — the measurement motif, quieted */}
          <div
            aria-hidden="true"
            className="absolute inset-0 [background-image:linear-gradient(to_right,#1c1c1c_1px,transparent_1px),linear-gradient(to_bottom,#1c1c1c_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
          />
          {/* Emerald hairline signal along the top edge */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent"
          />
          {/* The frog, at the edge where personality belongs */}
          <Image
            src="/rybbit/frog_white.svg"
            alt=""
            aria-hidden="true"
            width={280}
            height={280}
            className="pointer-events-none absolute -bottom-16 -right-10 w-56 opacity-[0.05] md:w-72"
          />

          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <h2 className="mb-4 text-balance text-3xl font-semibold tracking-tight text-white md:mb-5 md:text-4xl">
              {resolvedTitle}
            </h2>
            <p className="mx-auto mb-8 max-w-[480px] text-pretty text-base text-neutral-400 md:mb-10">
              {resolvedDescription}
            </p>

            <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <TrackedButton
                href={primaryButtonHref}
                eventName="signup"
                eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-6 text-base font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:w-auto"
              >
                {resolvedPrimaryButtonText}
              </TrackedButton>
              <TrackedButton
                href={secondaryButtonHref}
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-900 px-6 text-base font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:w-auto"
              >
                {resolvedSecondaryButtonText}
              </TrackedButton>
            </div>

            <p className="mt-6 text-sm text-neutral-500">{t("7-day free trial. Cancel anytime.")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
