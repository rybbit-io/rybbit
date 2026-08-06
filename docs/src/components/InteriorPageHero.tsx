import { HeroDataLine } from "@/components/HeroDataLine";
import { TrackedButton } from "@/components/TrackedButton";
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
  breadcrumbs?: ReactNode;
  eventLocation: string;
  primaryAction?: HeroAction | null;
  secondaryAction?: HeroAction | null;
  note?: ReactNode;
}

export function InteriorPageHero({
  title,
  description,
  eyebrow,
  breadcrumbs,
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
        <div className="relative border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 sm:py-16 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 lg:py-20">
          <HeroDataLine id="interior" className="hidden h-28 sm:block lg:h-36" />
          <div className="relative">
            {breadcrumbs && <div className="mb-6">{breadcrumbs}</div>}
            {eyebrow && (
              <p className="mb-6 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {eyebrow}
              </p>
            )}
            <h1 className="max-w-3xl text-[clamp(3rem,5.25vw,4.75rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-neutral-950 text-balance dark:text-neutral-50">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 lg:col-span-5 lg:px-10 lg:py-16">
          <p className="max-w-lg text-base leading-7 text-neutral-600 text-pretty dark:text-neutral-300 sm:text-lg sm:leading-8">
            {description}
          </p>

          {(primary || secondary) && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              {primary && (
                <TrackedButton
                  href={primary.href}
                  eventName={primary.eventName}
                  target={primary.external ? "_blank" : undefined}
                  rel={primary.external ? "noopener noreferrer" : undefined}
                  eventProps={{ location: eventLocation, button_text: primary.label }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900 dark:focus-visible:ring-offset-neutral-950"
                >
                  {secondary.label}
                  {secondary.external && <ExternalLink className="size-3.5" aria-hidden="true" />}
                </TrackedButton>
              )}
            </div>
          )}

          {resolvedNote && (
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{resolvedNote}</p>
          )}
        </div>
      </div>
    </section>
  );
}
