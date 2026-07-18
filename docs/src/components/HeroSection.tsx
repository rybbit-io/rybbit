import { GitHubStarButton } from "@/components/GitHubStarButton";
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

export function HeroSection({
  title,
  subtitle,
  showEUFlag = true,
  showGitHubStar = true,
}: HeroSectionProps) {
  const t = useExtracted();

  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto w-full min-w-0 max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
        <div className="grid min-w-0 lg:grid-cols-12">
          <div className="relative min-w-0 overflow-hidden border-b border-emerald-900 bg-emerald-950 px-5 py-10 text-white sm:px-8 sm:py-12 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 lg:py-12 xl:py-14">
            <Image
              src="/rybbit/frog_white.svg"
              alt=""
              aria-hidden="true"
              width={320}
              height={320}
              className="pointer-events-none absolute -bottom-24 -right-14 h-auto w-64 -rotate-12 opacity-[0.07] sm:w-72 lg:-right-10 lg:w-80"
            />

            <svg
              viewBox="0 0 720 180"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32 w-full opacity-70"
            >
              <defs>
                <linearGradient id="hero-signal-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#b3bfff" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#b3bfff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 150 C65 142 85 118 132 126 C185 136 211 69 266 86 C316 101 345 124 389 89 C435 52 462 94 506 73 C552 52 588 26 624 48 C662 71 688 29 720 16 L720 180 L0 180 Z"
                fill="url(#hero-signal-fill)"
              />
              <path
                d="M0 150 C65 142 85 118 132 126 C185 136 211 69 266 86 C316 101 345 124 389 89 C435 52 462 94 506 73 C552 52 588 26 624 48 C662 71 688 29 720 16"
                fill="none"
                stroke="#b3bfff"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx="266" cy="86" r="4" fill="#b3bfff" />
              <circle cx="506" cy="73" r="4" fill="#b3bfff" />
              <circle cx="624" cy="48" r="5" fill="#b3bfff" />
            </svg>

            <div className="relative z-10">
              {showGitHubStar && <GitHubStarButton />}
            </div>
            <h1 className="relative z-10 mt-7 max-w-3xl text-[clamp(3rem,5.25vw,4.75rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-balance">
              {title}
            </h1>
          </div>

          <div className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 lg:col-span-5 lg:px-10 lg:py-12 xl:py-14">
            <p className="max-w-lg text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg sm:leading-8 text-pretty">
              {subtitle}
            </p>

            {showEUFlag && (
              <div className="mt-5 flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <EUFlag />
                <span>{t("EU-hosted cloud")}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <TrackedButton
                href="https://app.rybbit.io/signup"
                eventName="signup"
                eventProps={{ location: "hero", button_text: "get started" }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
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
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900 dark:focus-visible:ring-offset-neutral-950"
              >
                {t("Live demo")}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </TrackedButton>
            </div>

            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("7-day free trial. Cancel anytime.")}
            </p>
          </div>
        </div>

        <div className="min-w-0 border-t border-[#d9deff] bg-[#eef0ff] p-2 dark:border-[#303653] dark:bg-[#1b1e2e] sm:p-3">
          <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-[#c6ceff] bg-white dark:border-[#3b4266] dark:bg-neutral-950">
            <div className="grid h-10 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800 sm:px-4">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-red-400 dark:bg-red-500" />
                <span className="size-2.5 rounded-full bg-amber-400 dark:bg-amber-500" />
                <span className="size-2.5 rounded-full bg-emerald-400 dark:bg-emerald-500" />
              </div>
              <a
                href="https://demo.rybbit.com/81"
                target="_blank"
                rel="noopener noreferrer"
                className="truncate rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 font-mono text-xs text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                demo.rybbit.com
              </a>
              <div className="flex items-center justify-self-end gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
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
