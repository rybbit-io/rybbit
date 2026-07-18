import { TrackedButton } from "@/components/TrackedButton";
import { ArrowUpRight } from "lucide-react";
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
  const resolvedDescription = description ?? t("Start with a clear dashboard today. Add deeper product analytics whenever your questions demand it.");
  const resolvedPrimaryButtonText = primaryButtonText ?? t("Start for $0");
  const resolvedSecondaryButtonText = secondaryButtonText ?? t("Explore live demo");

  return (
    <section className="pb-20 md:pb-28">
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 text-white">
          <div className="grid grid-cols-1 md:grid-cols-12">
            <div className="border-b border-neutral-800 p-7 sm:p-9 md:col-span-7 md:border-b-0 md:border-r md:p-12 lg:p-16">
              <Image
                src="/rybbit/frog_white.svg"
                alt=""
                width={44}
                height={44}
                className="mb-8 h-10 w-10 opacity-90"
                aria-hidden="true"
              />
              <h2 className="max-w-[12ch] text-balance text-3xl font-semibold leading-[1.04] tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                {resolvedTitle}
              </h2>
              <p className="mt-5 max-w-[50ch] text-base leading-7 text-neutral-300">{resolvedDescription}</p>
            </div>

            <div className="flex flex-col justify-between p-7 sm:p-9 md:col-span-5 md:p-12 lg:p-16">
              <p className="max-w-[32ch] text-sm leading-6 text-neutral-400">
                {t("No credit card required. Free up to 10,000 events per month.")}
              </p>
              <div className="mt-10 flex flex-col gap-3">
                <TrackedButton
                  href={primaryButtonHref}
                  eventName="signup"
                  eventProps={{ location: eventLocation, button_text: resolvedPrimaryButtonText }}
                  className="inline-flex h-12 w-full items-center justify-center rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {resolvedPrimaryButtonText}
                </TrackedButton>
                <TrackedButton
                  href={secondaryButtonHref}
                  eventName="demo"
                  target="_blank"
                  rel="noopener noreferrer"
                  eventProps={{ location: eventLocation, button_text: resolvedSecondaryButtonText }}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-neutral-700 px-5 text-sm font-semibold text-white transition-colors hover:border-neutral-500 hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                >
                  {resolvedSecondaryButtonText}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </TrackedButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
