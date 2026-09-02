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
    <section className="border-b border-neutral-200 bare:border-b-0 dark:border-neutral-800">
      <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 bare:block dark:border-neutral-800 lg:grid-cols-12">
        <div className="relative border-b border-neutral-200 px-5 py-12 bare:border-b-0 bare:pb-0 bare:pt-16 dark:border-neutral-800 sm:px-8 sm:py-16 bare:sm:pb-0 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 lg:py-20 bare:lg:border-r-0 bare:lg:pb-0 bare:lg:pt-24">
          <HeroDataLine id="interior" className="hidden h-28 sm:block lg:h-36" />
          <div className="relative">
            {breadcrumbs && <div className="mb-6">{breadcrumbs}</div>}
            {eyebrow && (
              <p className="mb-6 text-sm font-semibold text-emerald-600 bare:mb-5 bare:font-medium bare:text-neutral-500 dark:text-emerald-400 dark:bare:text-neutral-400">
                {eyebrow}
              </p>
            )}
            <h1 className="max-w-3xl text-[clamp(3rem,5.25vw,4.75rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-neutral-950 text-balance bare:max-w-[760px] bare:text-[clamp(2.25rem,4.2vw,3.5rem)] bare:font-medium bare:leading-[1.08] bare:tracking-[-0.035em] dark:text-neutral-50">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex flex-col justify-center px-5 py-10 bare:pb-8 bare:pt-6 sm:px-8 sm:py-12 bare:sm:pb-8 bare:sm:pt-6 lg:col-span-5 lg:px-10 lg:py-16 bare:lg:pb-4 bare:lg:pt-6">
          <p className="max-w-lg text-base leading-7 text-neutral-600 text-pretty bare:max-w-[58ch] bare:leading-relaxed dark:text-neutral-300 sm:text-lg sm:leading-8 bare:dark:text-neutral-400">
            {description}
          </p>

          {(primary || secondary) && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row bare:lg:flex-row">
              {primary && (
                <TrackedButton
                  href={primary.href}
                  eventName={primary.eventName}
                  target={primary.external ? "_blank" : undefined}
                  rel={primary.external ? "noopener noreferrer" : undefined}
                  eventProps={{ location: eventLocation, button_text: primary.label }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white bare:rounded-full bare:px-6 bare:text-[15px] dark:focus-visible:ring-offset-neutral-950"
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 bare:rounded-full bare:px-6 bare:text-[15px] dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900 dark:focus-visible:ring-offset-neutral-950 dark:bare:border-neutral-800 dark:bare:bg-neutral-900"
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
