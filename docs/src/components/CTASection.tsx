import { GridCrosses } from "@/components/GridCrosses";
import { TrackedButton } from "@/components/TrackedButton";
import { ArrowRight, ExternalLink } from "lucide-react";
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
  const resolvedDescription = description ?? t("Powerful insights without the complexity. Privacy-focused analytics that just works.");
  const resolvedPrimaryButtonText = primaryButtonText ?? t("Start for $0");
  const resolvedSecondaryButtonText = secondaryButtonText ?? t("Live demo");

  return (
    <section className="relative overflow-hidden border-b border-emerald-900 bg-emerald-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
      />
      <div className="relative mx-auto grid max-w-[1200px] border-x border-white/10 lg:grid-cols-12">
        <GridCrosses className="text-white/30 dark:text-white/30" />
        <Image
          src="/rybbit/frog_white.svg"
          alt=""
          aria-hidden="true"
          width={360}
          height={360}
          className="pointer-events-none absolute -bottom-12 -right-8 hidden w-64 -rotate-6 opacity-[0.07] md:block lg:w-80"
        />

        <div className="relative z-10 border-b border-white/10 px-5 py-16 sm:px-8 md:py-24 lg:col-span-8 lg:border-b-0 lg:border-r lg:px-10">
          <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.035em] md:text-6xl text-balance">
            {resolvedTitle}
          </h2>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-5 py-12 sm:px-8 lg:col-span-4 lg:px-10">
          <p className="max-w-md text-base leading-7 text-emerald-100/80">{resolvedDescription}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <TrackedButton
              href={primaryButtonHref}
              eventName="signup"
              eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-emerald-950 transition-colors duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950"
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {resolvedSecondaryButtonText}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </TrackedButton>
          </div>

          <p className="mt-6 text-sm text-emerald-100/60">{t("7-day free trial. Cancel anytime.")}</p>
        </div>
      </div>
    </section>
  );
}
