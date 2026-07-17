import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className="ml-2 inline w-7 rounded-sm align-middle"
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
          <div className="flex min-h-[460px] min-w-0 flex-col justify-between border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 sm:py-16 lg:col-span-8 lg:min-h-[570px] lg:border-b-0 lg:border-r lg:px-10 lg:py-20">
            <div>{showGitHubStar && <GitHubStarButton />}</div>
            <h1 className="max-w-4xl text-[clamp(3.25rem,7.25vw,5.75rem)] font-semibold leading-[0.94] tracking-[-0.04em] text-neutral-950 dark:text-neutral-50 text-balance">
              {title}
            </h1>
          </div>

          <div className="flex min-w-0 flex-col justify-end px-5 py-10 sm:px-8 lg:col-span-4 lg:min-h-[570px] lg:px-10 lg:py-20">
            <p className="max-w-md text-lg leading-8 text-neutral-600 dark:text-neutral-300 text-pretty">
              {subtitle}
              {showEUFlag && <EUFlag />}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
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

            <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
              {t("7-day free trial. No credit card required.")}
            </p>
          </div>
        </div>

        <div className="min-w-0 border-t border-neutral-200 bg-neutral-100 p-2 dark:border-neutral-800 dark:bg-neutral-900 sm:p-3">
          <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-950">
            <div className="flex h-11 items-center justify-between border-b border-neutral-200 px-3 dark:border-neutral-800 sm:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t("Live Rybbit dashboard")}
                </span>
              </div>
              <a
                href="https://demo.rybbit.com/81"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
              >
                <span className="hidden sm:inline">demo.rybbit.com</span>
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("Open live demo")}</span>
              </a>
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
