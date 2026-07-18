import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { useExtracted } from "next-intl";

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className="ml-2 inline-block w-6 rounded-[2px] align-[-0.15em]"
  >
    <title>European flag</title>
    <path className="fill-[#233E90]/80" d="M766 1H1v510h765V1Z"></path>
    <path
      className="fill-yellow-400"
      d="m387 117-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm114 43-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm47 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-321 0-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm283 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123 35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123-35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm0-250-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Z"
    ></path>
  </svg>
);

const primaryButtonClass =
  "w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-md bg-emerald-600 px-6 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer";

const secondaryButtonClass =
  "w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 px-6 text-sm font-medium text-neutral-900 dark:text-white transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 cursor-pointer";

interface HeroSectionProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
  showGitHubStar?: boolean;
}

export function HeroSection({ title, subtitle, showEUFlag = true, showGitHubStar = true }: HeroSectionProps) {
  const t = useExtracted();

  return (
    <section className="w-full">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 pb-16 text-center md:pt-24 md:pb-24">
        {showGitHubStar && (
          <div className="animate-fade-up">
            <GitHubStarButton />
          </div>
        )}

        <h1
          className="animate-fade-up max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-balance text-neutral-900 md:text-6xl dark:text-white"
          style={{ animationDelay: "75ms" }}
        >
          {title}
        </h1>
        <p
          className="animate-fade-up mt-5 max-w-2xl text-base text-pretty text-neutral-600 md:text-lg dark:text-neutral-400"
          style={{ animationDelay: "150ms" }}
        >
          {subtitle}
          {showEUFlag && <EUFlag />}
        </p>

        <div
          className="animate-fade-up mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
          style={{ animationDelay: "225ms" }}
        >
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "hero", button_text: "get started" }}
            className={primaryButtonClass}
          >
            {t("Start for $0")}
          </TrackedButton>
          <TrackedButton
            href="https://demo.rybbit.com/81"
            eventName="demo"
            target="_blank"
            rel="noopener noreferrer"
            eventProps={{ location: "hero", button_text: "Live demo" }}
            className={secondaryButtonClass}
          >
            {t("Live demo")}
          </TrackedButton>
        </div>

        {/* Live demo — the product is the hero imagery */}
        <div className="animate-fade-up mt-14 w-full md:mt-16" style={{ animationDelay: "300ms" }}>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            {/* Browser chrome */}
            <div className="flex h-10 items-center gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              </div>
              <div className="flex flex-1 justify-center">
                <span className="rounded-md bg-neutral-100 px-3 py-1 text-xs text-neutral-500 tabular-nums dark:bg-neutral-800 dark:text-neutral-400">
                  demo.rybbit.com
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t("Live")}
              </span>
            </div>
            <iframe
              src="https://demo.rybbit.com/81/main"
              width="1152"
              height="680"
              className="h-[480px] w-full sm:h-[560px] md:h-[680px]"
              style={{ border: "none" }}
              title="Rybbit Analytics Demo"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
