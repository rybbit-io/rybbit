import { TrackedButton } from "@/components/TrackedButton";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { ArrowUpRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className="h-4 w-6 rounded-[2px]"
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
    <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800/80">
      <div className="mx-auto w-full max-w-[1280px] px-5 pb-10 pt-16 sm:px-6 md:pt-24 lg:px-8 lg:pb-14 lg:pt-32">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-6">
          <div className="landing-hero-copy lg:col-span-8">
            {showGitHubStar && (
              <a
                href="https://github.com/rybbit-io/rybbit"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300 dark:hover:text-white"
              >
                <SiGithub className="h-4 w-4" aria-hidden="true" />
                {t("Open source analytics")}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}

            <h1 className="max-w-[13ch] text-balance text-[clamp(2.75rem,6.4vw,5.75rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-neutral-950 dark:text-white">
              {title}
            </h1>
          </div>

          <div className="landing-hero-aside flex flex-col justify-end lg:col-span-4 lg:pb-1">
            <p className="max-w-[38rem] text-pretty text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg md:leading-8">
              {subtitle}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <TrackedButton
                href="https://app.rybbit.io/signup"
                eventName="signup"
                eventProps={{ location: "hero", button_text: "Start for $0" }}
                className="inline-flex h-12 items-center justify-center rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
              >
                {t("Start for $0")}
              </TrackedButton>
              <TrackedButton
                href="https://demo.rybbit.com/81"
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: "hero", button_text: "Explore live demo" }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-transparent px-5 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:text-white dark:hover:border-neutral-500 dark:hover:bg-neutral-900 dark:focus-visible:ring-offset-neutral-950"
              >
                {t("Explore live demo")}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </TrackedButton>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span>{t("Free up to 10k monthly events")}</span>
              {showEUFlag && (
                <span className="flex items-center gap-2">
                  <EUFlag />
                  {t("EU-hosted cloud")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="landing-product-stage mt-12 min-w-0 max-w-full overflow-hidden rounded-xl border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 md:mt-16">
          <div className="flex h-12 items-center justify-between border-b border-neutral-300 px-4 dark:border-neutral-700 sm:px-5">
            <div className="flex items-center gap-3 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {t("Live product · rybbit.com")}
            </div>
            <a
              href="https://demo.rybbit.com/81"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-full items-center gap-1.5 rounded-sm text-xs font-semibold text-neutral-700 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300 dark:hover:text-white"
            >
              {t("Open dashboard")}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
          <div className="overflow-hidden bg-[#121212]">
            <Image
              src="/blog/rybbit_dashboard.jpeg"
              alt="Rybbit analytics dashboard showing traffic metrics, a live users chart, referrers, and top pages"
              width={1755}
              height={958}
              priority
              sizes="(max-width: 768px) 900px, (max-width: 1280px) 100vw, 1216px"
              className="h-auto min-h-[360px] w-auto min-w-[760px] max-w-none object-cover object-left-top sm:min-w-[900px] lg:min-w-0 lg:w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
