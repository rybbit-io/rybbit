import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { landingButtonPrimary, landingButtonSecondary, landingContainer } from "@/components/landing/section";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className="inline ml-2 w-6 rounded-[2px] align-[-2px]"
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
    <section className="w-full overflow-x-hidden">
      <div className={cn(landingContainer, "pt-14 pb-16 md:pt-20 md:pb-24")}>
        <div className="max-w-3xl">
          {showGitHubStar && (
            <div className="mb-6">
              <GitHubStarButton />
            </div>
          )}

          <h1 className="text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-neutral-900 md:text-6xl dark:text-neutral-50">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-600 md:text-lg dark:text-neutral-400">
            {subtitle}
            {showEUFlag && <EUFlag />}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedButton
              href="https://app.rybbit.io/signup"
              eventName="signup"
              eventProps={{ location: "hero", button_text: "get started" }}
              className={landingButtonPrimary}
            >
              {t("Start for $0")}
            </TrackedButton>
            <TrackedButton
              href="https://demo.rybbit.com/81"
              eventName="demo"
              target="_blank"
              rel="noopener noreferrer"
              eventProps={{ location: "hero", button_text: "Live demo" }}
              className={landingButtonSecondary}
            >
              {t("Live demo")}
            </TrackedButton>
          </div>
        </div>

        {/* Live demo, framed like the product window it is */}
        <div className="mt-14 md:mt-20">
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            {/* Window chrome */}
            <div className="flex h-10 items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              </div>
              <div className="flex flex-1 justify-center">
                <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                  demo.rybbit.com
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                {t("Live")}
              </span>
            </div>
            <iframe
              src="https://demo.rybbit.com/81/main"
              width="1300"
              height="750"
              className="block h-[540px] w-full md:h-[680px] lg:h-[760px]"
              style={{ border: "none" }}
              title="Rybbit Analytics Demo"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
