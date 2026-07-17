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
    className="inline ml-1.5 w-7 rounded-[2px] align-text-bottom"
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
    <div className="relative overflow-hidden">
      {/* Graph paper — the measurement-instrument motif. Hero only, fades out below. */}
      <div
        aria-hidden
        className="absolute inset-0 [background-size:40px_40px] [background-image:linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_92%),linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] [mask-composite:intersect]"
      />

      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 pt-16 pb-16 text-center md:pt-24 md:pb-20">
        {showGitHubStar && (
          <div className="animate-rise">
            <GitHubStarButton />
          </div>
        )}

        <h1 className="animate-rise [animation-delay:80ms] max-w-4xl text-4xl md:text-6xl font-semibold tracking-tight text-neutral-900 dark:text-white [text-wrap:balance]">
          {title}
        </h1>
        <p className="animate-rise [animation-delay:160ms] mt-5 max-w-2xl text-base md:text-lg text-neutral-600 dark:text-neutral-400 [text-wrap:pretty]">
          {subtitle}
          {showEUFlag && <EUFlag />}
        </p>

        <div className="animate-rise [animation-delay:240ms] mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "hero", button_text: "get started" }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
          >
            {t("Start for $0")}
          </TrackedButton>
          <TrackedButton
            href="https://demo.rybbit.com/81"
            eventName="demo"
            target="_blank"
            rel="noopener noreferrer"
            eventProps={{ location: "hero", button_text: "Live demo" }}
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm px-5 text-sm font-medium text-neutral-900 dark:text-white transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50 cursor-pointer"
          >
            {t("Live demo")}
          </TrackedButton>
        </div>

        {/* Live demo — the product is the hero */}
        <div className="animate-rise [animation-delay:320ms] mt-14 w-full md:mt-16">
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <div className="flex h-10 items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 px-4">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">demo.rybbit.com</span>
              <span className="ml-auto hidden items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                {t("Live demo")}
              </span>
            </div>
            <iframe
              src="https://demo.rybbit.com/81/main"
              width="1300"
              height="750"
              className="block w-full h-[600px] md:h-[700px] lg:h-[750px]"
              style={{ border: "none" }}
              title="Rybbit Analytics Demo"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
