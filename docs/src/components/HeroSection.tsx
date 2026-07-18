import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className="ml-1.5 inline-block h-4 w-auto rounded-[2px] align-[-2px]"
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
    <section className="relative overflow-hidden">
      {/* Single restrained glow behind the hero */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        <div className="h-[420px] w-[860px] max-w-full -translate-y-1/2 rounded-full bg-emerald-500/[0.12] dark:bg-emerald-500/[0.08] blur-[130px]" />
      </div>

      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-4 pt-16 pb-16 md:px-6 md:pt-24 md:pb-20 text-center">
        {showGitHubStar && <GitHubStarButton />}

        <h1
          className={cn(
            "max-w-4xl text-balance text-4xl md:text-6xl lg:text-7xl tracking-tight text-neutral-900 dark:text-white",
            displayFont.className
          )}
        >
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-base md:text-lg text-neutral-600 dark:text-neutral-400">
          {subtitle}
          {showEUFlag && <EUFlag />}
        </p>

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row md:mt-10">
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "hero", button_text: "get started" }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-6 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
          >
            {t("Start for $0")}
          </TrackedButton>
          <TrackedButton
            href="https://demo.rybbit.com/81"
            eventName="demo"
            target="_blank"
            rel="noopener noreferrer"
            eventProps={{ location: "hero", button_text: "Live demo" }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg border border-neutral-300 dark:border-neutral-700 px-6 text-sm font-medium text-neutral-900 dark:text-white transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/40 cursor-pointer"
          >
            {t("Live demo")}
          </TrackedButton>
        </div>

        <div className="mt-14 w-full md:mt-16">
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
            <iframe
              src="https://demo.rybbit.com/81/main"
              width="1200"
              height="720"
              className="block h-[540px] w-full md:h-[680px] lg:h-[720px]"
              style={{ border: "none" }}
              title="Rybbit Analytics Demo"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
