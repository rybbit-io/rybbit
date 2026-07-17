import { BackgroundGrid } from "@/components/BackgroundGrid";
import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { tiltWarp } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";

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
    <section className="relative z-10">
      {/* Grid paper backdrop, scoped to the hero and faded out before the demo ends */}
      <BackgroundGrid className="inset-x-0 top-0 md:top-0 bottom-auto h-[560px] md:h-[680px]" />

      <div className="relative flex flex-col items-center pt-14 md:pt-20 px-5 md:px-8">
        {showGitHubStar && (
          <div className="hero-rise">
            <GitHubStarButton />
          </div>
        )}

        <h1
          className={cn(
            "hero-rise [animation-delay:60ms] max-w-4xl text-center text-balance",
            "text-[2.5rem] leading-[1.08] md:text-6xl lg:text-[4.25rem] tracking-tight",
            "text-neutral-900 dark:text-white",
            tiltWarp.className
          )}
        >
          {title}
        </h1>

        <p className="hero-rise [animation-delay:120ms] mt-5 md:mt-6 max-w-3xl text-center text-pretty text-base md:text-xl leading-relaxed text-neutral-600 dark:text-neutral-300">
          {subtitle}
          {showEUFlag && <EUFlag />}
        </p>

        <div className="hero-rise [animation-delay:180ms] mt-8 md:mt-10 flex w-full flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "hero", button_text: "get started" }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-6 text-base font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 cursor-pointer"
          >
            {t("Start for $0")}
          </TrackedButton>
          <TrackedButton
            href="https://demo.rybbit.com/81"
            eventName="demo"
            target="_blank"
            rel="noopener noreferrer"
            eventProps={{ location: "hero", button_text: "Live demo" }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60 px-6 text-base font-medium text-neutral-900 dark:text-white transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 cursor-pointer"
          >
            {t("Live demo")}
          </TrackedButton>
        </div>
      </div>

      {/* Product demo — the page's one hero image */}
      <div className="hero-rise [animation-delay:260ms] relative mx-auto mt-12 md:mt-16 w-full max-w-[1264px] px-2 sm:px-5 md:px-8">
        {/* Single ambient signal behind the window */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[85%] -translate-x-1/2 -translate-y-1/4 rounded-full bg-emerald-500/15 dark:bg-emerald-500/10 blur-[120px]"
        />

        <div className="relative overflow-hidden rounded-xl md:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-[0_32px_100px_-32px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_100px_-32px_rgba(0,0,0,0.8)]">
          {/* Window chrome */}
          <div className="relative flex h-10 items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2.5 py-1 text-[11px] leading-none text-neutral-500 dark:text-neutral-400">
              demo.rybbit.com
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {t("Live")}
            </div>
          </div>

          <iframe
            src="https://demo.rybbit.com/81/main"
            width="1300"
            height="750"
            className="w-full h-[600px] md:h-[700px] lg:h-[750px] block"
            style={{ border: "none" }}
            title="Rybbit Analytics Demo"
          ></iframe>
        </div>
      </div>
    </section>
  );
}
