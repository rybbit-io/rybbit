import { TrackedButton } from "@/components/TrackedButton";
import { tiltWarp } from "@/lib/fonts";
import { cn } from "@/lib/utils";
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
    <section className="py-12 md:py-20 w-full relative z-10">
      <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-10 md:p-16 lg:p-20">
          {/* Noise texture overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none" aria-hidden="true">
            <filter id="cta-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#cta-noise)" />
          </svg>

          {/* One emerald signal, rising from below the buttons */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 bottom-0 h-[320px] w-[640px] -translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/20 blur-[110px]"
          />

          {/* The frog, at the edge where personality lives */}
          <Image
            src="/rybbit/frog_white.svg"
            alt=""
            aria-hidden
            width={220}
            height={220}
            className="pointer-events-none absolute -bottom-10 -right-8 w-40 md:w-52 rotate-[-8deg] opacity-[0.08] select-none"
          />

          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <h2 className={cn(tiltWarp.className, "text-3xl leading-tight md:text-4xl text-white mb-4 md:mb-5 text-balance")}>
              {resolvedTitle}
            </h2>
            <p className="text-sm md:text-base text-neutral-400 mb-8 md:mb-10 mx-auto max-w-[500px] text-pretty leading-relaxed">
              {resolvedDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 w-full sm:w-auto">
              <TrackedButton
                href={primaryButtonHref}
                eventName="signup"
                eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-6 text-base font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 cursor-pointer"
              >
                {resolvedPrimaryButtonText}
              </TrackedButton>
              <TrackedButton
                href={secondaryButtonHref}
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-900/60 px-6 text-base font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 cursor-pointer"
              >
                {resolvedSecondaryButtonText}
              </TrackedButton>
            </div>

            <p className="text-neutral-500 text-sm">{t("7-day free trial. Cancel anytime.")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
