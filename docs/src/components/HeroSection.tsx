import { GitHubStarButton } from "@/components/GitHubStarButton";
import { MarketingSignal } from "@/components/MarketingSignal";
import { TrackedButton } from "@/components/TrackedButton";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className="h-4 w-6 shrink-0 rounded-[2px]"
  >
    <title>European flag</title>
    <path className="fill-[#233E90]" d="M766 1H1v510h765V1Z" />
    <path
      className="fill-yellow-400"
      d="m387 117-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm114 43-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm47 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-321 0-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm283 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123 35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123-35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm0-250-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Z"
    />
  </svg>
);

interface HeroSectionProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
  showGitHubStar?: boolean;
}

export function HeroSection({ title, subtitle, showEUFlag = true, showGitHubStar = true }: HeroSectionProps) {
  const t = useExtracted();

  return (
    <section className="border-b border-neutral-800 bg-neutral-950">
      <div className="mx-auto w-full min-w-0 max-w-[1200px] border-x border-white/10">
        <div className="grid min-w-0 lg:grid-cols-12">
          <div className="relative min-w-0 overflow-hidden border-b border-white/10 bg-[var(--marketing-action-deep)] px-5 py-10 text-white sm:px-8 sm:py-12 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 lg:py-12 xl:py-14">
            <MarketingSignal className="pointer-events-none absolute -bottom-5 left-0 w-[120%] text-emerald-300/30" />
            <Image
              src="/rybbit/frog_white.svg"
              alt=""
              width={240}
              height={240}
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-14 -right-10 w-48 rotate-6 opacity-[0.08] sm:w-56"
            />
            <div className="relative z-10">
              {showGitHubStar && (
                <GitHubStarButton className="border-white/20 bg-white/5 text-emerald-50 hover:bg-white/10 hover:text-white focus-visible:ring-white dark:border-white/20 dark:text-emerald-50 dark:hover:bg-white/10" />
              )}
              <h1 className="mt-7 max-w-3xl text-[clamp(2.625rem,12vw,4.75rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-white text-balance sm:text-[clamp(3rem,5.25vw,4.75rem)]">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-center bg-[var(--marketing-data)] px-5 py-10 text-[var(--marketing-data-ink)] sm:px-8 sm:py-12 lg:col-span-5 lg:px-10 lg:py-12 xl:py-14">
            <p className="max-w-lg text-base leading-7 text-[var(--marketing-data-ink)] sm:text-lg sm:leading-8 text-pretty">
              {subtitle}
            </p>

            {showEUFlag && (
              <div className="mt-5 flex items-center gap-2 text-xs font-medium text-[var(--marketing-data-ink)]/70">
                <EUFlag />
                <span>{t("EU-hosted cloud")}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <TrackedButton
                href="https://app.rybbit.io/signup"
                eventName="signup"
                eventProps={{ location: "hero", button_text: "get started" }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-950 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-data)]"
              >
                {t("Start for $0")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </TrackedButton>
              <TrackedButton
                href="https://demo.rybbit.com/81"
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: "hero", button_text: "Live demo" }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--marketing-data-ink)]/30 px-5 py-2.5 text-sm font-medium text-[var(--marketing-data-ink)] transition-colors duration-200 hover:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-data-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-data)]"
              >
                {t("Live demo")}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </TrackedButton>
            </div>

            <p className="mt-4 text-sm text-[var(--marketing-data-ink)]/65">{t("7-day free trial. Cancel anytime.")}</p>
          </div>
        </div>

        <div className="min-w-0 border-t border-white/10 bg-neutral-950 p-2 sm:p-3">
          <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-neutral-700 bg-white dark:bg-neutral-950">
            <div className="grid h-10 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3 text-white sm:px-4">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-rose-400" />
                <span className="size-2.5 rounded-full bg-amber-300" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
              </div>
              <a
                href="https://demo.rybbit.com/81"
                target="_blank"
                rel="noopener noreferrer"
                className="truncate rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-0.5 font-mono text-xs text-neutral-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                demo.rybbit.com
              </a>
              <div className="flex items-center justify-self-end gap-1.5 text-xs text-neutral-300">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="hidden sm:inline">{t("Live")}</span>
              </div>
            </div>
            <iframe
              src="https://demo.rybbit.com/81/main"
              width="100%"
              height="750"
              className="block h-[600px] min-w-0 max-w-full md:h-[700px] lg:h-[750px]"
              style={{ border: "none" }}
              title="Rybbit Analytics Demo"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
