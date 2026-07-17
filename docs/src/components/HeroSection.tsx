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
    className="inline mr-2 w-8 rounded align-sub"
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

export function HeroSection({
  title,
  subtitle,
  showEUFlag = true,
  showGitHubStar = true,
}: HeroSectionProps) {
  const t = useExtracted();

  return (
    <section className="relative z-10 flex flex-col items-center px-5 pt-16 md:px-8 md:pt-24">
      {showGitHubStar && (
        <div className="landing-rise">
          <GitHubStarButton />
        </div>
      )}

      <h1
        className={cn(
          "landing-rise max-w-3xl text-center text-4xl leading-[1.1] tracking-tight text-neutral-900 md:text-5xl lg:text-6xl dark:text-white [text-wrap:balance]",
          tiltWarp.className
        )}
      >
        {title}
      </h1>
      <h2 className="landing-rise landing-rise-1 mt-5 max-w-2xl text-center text-base text-neutral-600 md:mt-6 md:text-lg dark:text-neutral-400 [text-wrap:pretty]">
        {subtitle}
        {showEUFlag && <EUFlag />}
      </h2>

      <div className="landing-rise landing-rise-2 mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row md:mt-10">
        <TrackedButton
          href="https://app.rybbit.io/signup"
          eventName="signup"
          eventProps={{ location: "hero", button_text: "get started" }}
          className="w-full cursor-pointer whitespace-nowrap rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto dark:focus-visible:ring-offset-neutral-950"
        >
          {t("Start for $0")}
        </TrackedButton>
        <TrackedButton
          href="https://demo.rybbit.com/81"
          eventName="demo"
          target="_blank"
          rel="noopener noreferrer"
          eventProps={{ location: "hero", button_text: "Live demo" }}
          className="w-full cursor-pointer whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-6 py-3 font-medium text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:ring-offset-neutral-950"
        >
          {t("Live demo")}
        </TrackedButton>
      </div>

      {/* Demo window — the centerpiece. One quiet glow, an app-window frame, live data inside. */}
      <div className="landing-rise landing-rise-3 relative mt-12 mb-14 w-full md:mt-16 md:mb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-72 w-[min(56rem,90%)] -translate-x-1/2 rounded-[100%] bg-emerald-500/20 blur-3xl dark:bg-emerald-500/10"
        />

        <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
          {/* Window chrome */}
          <div className="relative flex h-10 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>
            <div className="absolute left-1/2 hidden -translate-x-1/2 items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-500 sm:flex dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
              demo.rybbit.com
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {t("Live")}
            </div>
          </div>

          <iframe
            src="https://demo.rybbit.com/81/main"
            width="1300"
            height="750"
            className="block h-[600px] w-full md:h-[700px] lg:h-[750px]"
            style={{ border: "none" }}
            title="Rybbit Analytics Demo"
          ></iframe>
        </div>
      </div>
    </section>
  );
}
