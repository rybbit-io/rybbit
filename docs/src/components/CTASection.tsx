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
    <section className="relative w-full overflow-hidden px-5 py-20 md:px-8 md:py-28">
      {/* One quiet glow behind the closing moment — same treatment as the hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[min(48rem,90%)] -translate-x-1/2 translate-y-1/2 rounded-[100%] bg-emerald-500/15 blur-3xl dark:bg-emerald-500/10"
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <Image
          src="/rybbit/frog_dark green.svg"
          alt=""
          width={52}
          height={52}
          aria-hidden
          className="mb-6 dark:hidden"
        />
        <Image
          src="/rybbit/frog_light green.svg"
          alt=""
          width={52}
          height={52}
          aria-hidden
          className="mb-6 hidden dark:block"
        />

        <h2
          className={cn(
            "text-3xl tracking-tight text-neutral-900 md:text-4xl dark:text-white [text-wrap:balance]",
            tiltWarp.className
          )}
        >
          {resolvedTitle}
        </h2>
        <p className="mt-4 max-w-lg text-base text-neutral-600 md:text-lg dark:text-neutral-400 [text-wrap:pretty]">
          {resolvedDescription}
        </p>

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row md:mt-10">
          <TrackedButton
            href={primaryButtonHref}
            eventName="signup"
            eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
            className="w-full cursor-pointer whitespace-nowrap rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto dark:focus-visible:ring-offset-neutral-950"
          >
            {resolvedPrimaryButtonText}
          </TrackedButton>
          <TrackedButton
            href={secondaryButtonHref}
            eventName="demo"
            target="_blank"
            rel="noopener noreferrer"
            eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
            className="w-full cursor-pointer whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-6 py-3 font-medium text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:ring-offset-neutral-950"
          >
            {resolvedSecondaryButtonText}
          </TrackedButton>
        </div>

        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">{t("7-day free trial. Cancel anytime.")}</p>
      </div>
    </section>
  );
}
