import { Section } from "@/components/landing/primitives";
import { TrackedButton } from "@/components/TrackedButton";
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

const CTA_BUTTON_BASE =
  "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md px-5 text-[15px] font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950";

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
    <Section>
      {/* The one color-drenched moment on the page: a deep emerald plate, with
          the frog making its single appearance at the edge. */}
      <div className="relative overflow-hidden rounded-xl bg-emerald-950">
        <div
          aria-hidden
          className={cn(
            "absolute inset-0",
            "[background-size:40px_40px]",
            "[background-image:linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)]",
            "[mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
          )}
        />
        <Image
          src="/rybbit/frog_white.svg"
          alt=""
          aria-hidden
          width={360}
          height={360}
          className="pointer-events-none absolute -bottom-12 -right-8 hidden w-64 -rotate-6 opacity-[0.07] md:block lg:w-80"
        />

        <div className="relative px-7 py-14 sm:px-10 md:px-16 md:py-20">
          <h2 className="max-w-xl text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-white md:text-4xl text-balance">
            {resolvedTitle}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-100/80 md:text-lg text-pretty">
            {resolvedDescription}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <TrackedButton
              href={primaryButtonHref}
              eventName="signup"
              eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
              className={cn(CTA_BUTTON_BASE, "w-full sm:w-auto bg-white text-emerald-950 hover:bg-emerald-50")}
            >
              {resolvedPrimaryButtonText}
            </TrackedButton>
            <TrackedButton
              href={secondaryButtonHref}
              eventName="demo"
              target="_blank"
              rel="noopener noreferrer"
              eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
              className={cn(
                CTA_BUTTON_BASE,
                "w-full sm:w-auto border border-white/25 text-white hover:bg-white/10"
              )}
            >
              {resolvedSecondaryButtonText}
            </TrackedButton>
          </div>

          <p className="mt-5 text-[13px] text-emerald-100/60">{t("7-day free trial. Cancel anytime.")}</p>
        </div>
      </div>
    </Section>
  );
}
