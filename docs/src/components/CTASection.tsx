import { TrackedButton } from "@/components/TrackedButton";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
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
    <section className="py-12 md:py-20 w-full px-4 relative z-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-neutral-950 p-10 md:p-16 lg:p-20">
          {/* Noise texture overlay */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none"
            aria-hidden="true"
          >
            <filter id="cta-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="4"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#cta-noise)" />
          </svg>

          {/* Gradient orbs for organic background effect */}
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-emerald-600/30 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-[100px] translate-y-1/2"></div>
          <div className="absolute top-1/2 right-0 w-[250px] h-[250px] bg-teal-600/15 rounded-full blur-[80px] translate-x-1/2"></div>

          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 tracking-tight">
              {resolvedTitle}
            </h2>
            <p className="text-base md:text-lg text-neutral-400 mb-8 md:mb-10 max-w-2xl mx-auto">
              {resolvedDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-6 w-full sm:w-auto">
              <TrackedButton
                href={primaryButtonHref}
                eventName="signup"
                eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
                className="w-full whitespace-nowrap sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-opacity-50 cursor-pointer"
              >
                {resolvedPrimaryButtonText}
              </TrackedButton>
              <TrackedButton
                href={secondaryButtonHref}
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
                className="w-full whitespace-nowrap sm:w-auto bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-3 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer"
              >
                {resolvedSecondaryButtonText}
              </TrackedButton>
            </div>

            <p className="text-neutral-500 text-sm">
              {t("7-day free trial")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
