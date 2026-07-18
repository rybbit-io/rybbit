import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";
import { Tilt_Warp } from "next/font/google";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
});

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className="inline mr-2 w-7 rounded-sm align-sub"
  >
    <title>European flag</title>
    <path className="fill-[#233E90]/80" d="M766 1H1v510h765V1Z"></path>
    <path
      className="fill-yellow-400"
      d="m387 117-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm114 43-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm47 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-321 0-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm283 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123 35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123-35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm0-250-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Z"
    ></path>
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
    <div className="relative z-10">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-5 pt-16 text-center sm:px-8 md:pt-24">
        {showGitHubStar && (
          <div className="lp-rise">
            <GitHubStarButton />
          </div>
        )}

        <h1
          className={cn(
            "lp-rise max-w-3xl text-balance text-4xl leading-[1.1] text-neutral-900 dark:text-white md:text-5xl lg:text-6xl",
            tilt_wrap.className
          )}
          style={{ ["--lp-rise-delay" as string]: 1 }}
        >
          {title}
        </h1>
        <p
          className="lp-rise mt-5 max-w-2xl text-pretty text-base leading-relaxed text-neutral-600 dark:text-neutral-400 md:mt-6 md:text-xl"
          style={{ ["--lp-rise-delay" as string]: 2 }}
        >
          {subtitle}
          {showEUFlag && <EUFlag />}
        </p>

        <div
          className="lp-rise mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row md:mt-10"
          style={{ ["--lp-rise-delay" as string]: 3 }}
        >
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "hero", button_text: "get started" }}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-6 text-base font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:w-auto"
          >
            {t("Start for $0")}
          </TrackedButton>
          <TrackedButton
            href="https://demo.rybbit.com/81"
            eventName="demo"
            target="_blank"
            rel="noopener noreferrer"
            eventProps={{ location: "hero", button_text: "Live demo" }}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-6 text-base font-medium text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:w-auto"
          >
            {t("Live demo")}
          </TrackedButton>
        </div>
      </div>

      {/* Live product demo — the hero imagery */}
      <div
        className="lp-rise relative mx-auto mt-12 w-full max-w-[1200px] md:mt-16"
        style={{ ["--lp-rise-delay" as string]: 4 }}
      >
        {/* Single restrained glow rising from the instrument */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[min(52rem,90vw)] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-500/10"
          aria-hidden="true"
        />

        <div className="relative border-y border-border bg-white dark:bg-neutral-950/60">
          {/* Browser chrome */}
          <div className="flex h-10 items-center gap-3 border-b border-border bg-neutral-50/80 px-4 dark:bg-neutral-900/50">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>
            <div className="flex min-w-0 flex-1 justify-center">
              <span className="truncate rounded-md bg-neutral-200/70 px-3 py-1 text-xs text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-400">
                demo.rybbit.com
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span className="lp-pulse relative size-1.5 rounded-full bg-emerald-500 text-emerald-500" aria-hidden="true" />
              LIVE
            </span>
          </div>

          <iframe
            src="https://demo.rybbit.com/81/main"
            width="1200"
            height="750"
            className="h-[540px] w-full md:h-[700px] lg:h-[750px]"
            style={{ border: "none" }}
            title="Rybbit Analytics Demo"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
