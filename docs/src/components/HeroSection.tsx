import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";
import { Tilt_Warp } from "next/font/google";
import Image from "next/image";

const tiltWarp = Tilt_Warp({
  subsets: ["latin"],
});

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className="size-5 rounded-[2px]"
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
    <section className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1280px] px-5 pb-8 pt-16 sm:px-8 md:pb-12 md:pt-24 lg:px-10 lg:pt-28">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-8">
            {showGitHubStar && (
              <div className="mb-8">
                <GitHubStarButton />
              </div>
            )}
            <h1
              className={`${tiltWarp.className} max-w-[900px] text-balance text-[clamp(3.25rem,7vw,5.75rem)] leading-[0.96] tracking-[-0.035em] text-neutral-950 dark:text-white`}
            >
              {title}
            </h1>
          </div>

          <div className="flex flex-col items-start lg:col-span-4 lg:pb-1">
            <p className="max-w-[64ch] text-pretty text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg md:leading-8">
              {subtitle}
            </p>
            {showEUFlag && (
              <div className="mt-5 flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                <EUFlag />
                <span>{t("Hosted on EU infrastructure in Germany")}</span>
              </div>
            )}
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <TrackedButton
                href="https://app.rybbit.io/signup"
                eventName="signup"
                eventProps={{ location: "hero", button_text: "get started" }}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 sm:w-auto dark:ring-offset-neutral-950"
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
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-400 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 sm:w-auto dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:ring-offset-neutral-950"
              >
                {t("Explore the live demo")}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </TrackedButton>
            </div>
          </div>
        </div>

        <div className="mt-14 overflow-hidden rounded-lg border border-neutral-300 bg-neutral-950 md:mt-20 dark:border-neutral-700">
          <div className="flex min-h-11 items-center justify-between border-b border-neutral-800 px-4 text-xs text-neutral-400 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
              <span>{t("Live product")}</span>
              <span className="hidden text-neutral-600 sm:inline">/</span>
              <span className="hidden text-neutral-300 sm:inline">rybbit.com</span>
            </div>
            <a
              href="https://demo.rybbit.com/81"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-neutral-300 transition-colors hover:text-white"
            >
              {t("Open demo")}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
          <div className="relative aspect-[1.89/1] overflow-hidden bg-[#141414]">
            <Image
              src="/blog/rybbit_main_dashboard.png"
              alt={t("Rybbit web analytics dashboard showing users, sessions, pageviews, and traffic sources")}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover object-top"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 border-x border-b border-neutral-200 bg-white sm:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-950">
          {[
            [t("5 minute setup"), t("One lightweight script")],
            [t("Cookieless by default"), t("No consent banner required")],
            [t("Cloud or self-hosted"), t("Your data, your choice")],
          ].map(([label, detail], index) => (
            <div
              key={label}
              className={`px-5 py-4 ${index > 0 ? "border-t border-neutral-200 sm:border-l sm:border-t-0 dark:border-neutral-800" : ""}`}
            >
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
