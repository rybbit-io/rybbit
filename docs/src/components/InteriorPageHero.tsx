import { TrackedButton } from "@/components/TrackedButton";
import { ProductSignal } from "@/components/ProductSignal";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

interface HeroAction {
  href: string;
  label: string;
  eventName: string;
  external?: boolean;
}

interface InteriorPageHeroProps {
  title: ReactNode;
  description: ReactNode;
  eyebrow?: ReactNode;
  eventLocation: string;
  primaryAction?: HeroAction | null;
  secondaryAction?: HeroAction | null;
  note?: ReactNode;
}

export function InteriorPageHero({
  title,
  description,
  eyebrow,
  eventLocation,
  primaryAction,
  secondaryAction,
  note,
}: InteriorPageHeroProps) {
  const t = useExtracted();
  const primary =
    primaryAction === undefined
      ? {
          href: "https://app.rybbit.io/signup",
          label: t("Start for $0"),
          eventName: "signup",
        }
      : primaryAction;
  const secondary =
    secondaryAction === undefined
      ? {
          href: "https://demo.rybbit.com/81",
          label: t("Live demo"),
          eventName: "demo",
          external: true,
        }
      : secondaryAction;
  const resolvedNote = note === undefined ? t("7-day free trial. Cancel anytime.") : note;

  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
        <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 sm:py-16 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 lg:py-20">
          {eyebrow && (
            <p className="mb-6 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              {eyebrow}
            </p>
          )}
          <h1 className="max-w-3xl text-[clamp(3rem,5.25vw,4.75rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-neutral-950 text-balance dark:text-neutral-50">
            {title}
          </h1>
        </div>

        <div className="relative isolate flex flex-col justify-center overflow-hidden bg-[var(--marketing-signal-field)] px-5 py-10 text-[var(--marketing-signal-ink)] sm:px-8 sm:py-12 lg:col-span-5 lg:px-10 lg:py-16">
          <ProductSignal className="absolute inset-x-0 bottom-0 h-40 opacity-[0.42]" />
          <p className="relative z-10 max-w-lg text-base leading-7 text-[var(--marketing-signal-ink)] text-pretty sm:text-lg sm:leading-8">
            {description}
          </p>

          {(primary || secondary) && (
            <div className="relative z-10 mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              {primary && (
                <TrackedButton
                  href={primary.href}
                  eventName={primary.eventName}
                  target={primary.external ? "_blank" : undefined}
                  rel={primary.external ? "noopener noreferrer" : undefined}
                  eventProps={{ location: eventLocation, button_text: primary.label }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-emerald-950 transition-colors duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-signal-field)]"
                >
                  {primary.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </TrackedButton>
              )}
              {secondary && (
                <TrackedButton
                  href={secondary.href}
                  eventName={secondary.eventName}
                  target={secondary.external ? "_blank" : undefined}
                  rel={secondary.external ? "noopener noreferrer" : undefined}
                  eventProps={{ location: eventLocation, button_text: secondary.label }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--marketing-signal-border)] px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--marketing-signal-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-signal-field)]"
                >
                  {secondary.label}
                  {secondary.external && <ExternalLink className="size-3.5" aria-hidden="true" />}
                </TrackedButton>
              )}
            </div>
          )}

          {resolvedNote && (
            <p className="relative z-10 mt-4 text-sm text-[var(--marketing-signal-muted)]">{resolvedNote}</p>
          )}
        </div>
      </div>
    </section>
  );
}
