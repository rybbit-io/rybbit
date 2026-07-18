import { TrackedButton } from "@/components/TrackedButton";
import { BUTTON_LG, BUTTON_PRIMARY, BUTTON_SECONDARY, CONTAINER, HAIRLINE } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className="inline w-6 rounded-[3px] align-[-3px] ml-1.5"
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

export function HeroSection({ title, subtitle, showEUFlag = true }: HeroSectionProps) {
  const t = useExtracted();

  return (
    <div className="relative overflow-hidden">
      {/* Graph-paper backdrop, faded out before the demo panel */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[560px]",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,#232323_1px,transparent_1px),linear-gradient(to_bottom,#232323_1px,transparent_1px)]",
          "[mask-image:linear-gradient(to_bottom,black,transparent),linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]",
          "[mask-composite:intersect]"
        )}
      />

      <section className="relative">
        <div className={cn(CONTAINER, "flex flex-col items-center pt-16 md:pt-24 text-center")}>
          <h1 className="landing-rise max-w-3xl text-4xl md:text-[3.5rem] md:leading-[1.05] font-semibold tracking-[-0.03em] text-neutral-950 dark:text-white text-balance">
            {title}
          </h1>
          <p
            className="landing-rise mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 text-pretty"
            style={{ animationDelay: "80ms" }}
          >
            {subtitle}
            {showEUFlag && <EUFlag />}
          </p>

          <div
            className="landing-rise mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
            style={{ animationDelay: "160ms" }}
          >
            <TrackedButton
              href="https://app.rybbit.io/signup"
              eventName="signup"
              eventProps={{ location: "hero", button_text: "get started" }}
              className={cn(BUTTON_PRIMARY, BUTTON_LG, "w-full sm:w-auto")}
            >
              {t("Start for $0")}
            </TrackedButton>
            <TrackedButton
              href="https://demo.rybbit.com/81"
              eventName="demo"
              target="_blank"
              rel="noopener noreferrer"
              eventProps={{ location: "hero", button_text: "Live demo" }}
              className={cn(BUTTON_SECONDARY, BUTTON_LG, "w-full sm:w-auto")}
            >
              {t("Live demo")}
            </TrackedButton>
          </div>

          <p
            className="landing-rise mt-5 text-[13px] text-neutral-500 dark:text-neutral-500"
            style={{ animationDelay: "240ms" }}
          >
            {t("7-day free trial · No credit card · 5-minute setup")}
          </p>
        </div>

        {/* The product is the hero image: the live demo, framed as an instrument. */}
        <div className={cn(CONTAINER, "relative mt-12 md:mt-16 pb-14 md:pb-20")}>
          <div className="landing-rise relative" style={{ animationDelay: "320ms" }}>
            <div
              aria-hidden
              className="absolute -top-12 left-1/2 h-48 w-[85%] -translate-x-1/2 rounded-[100%] bg-emerald-500/15 blur-3xl dark:bg-emerald-500/10"
            />
            <div
              className={cn(
                "relative overflow-hidden rounded-xl border bg-white shadow-xl shadow-neutral-900/[0.07] dark:bg-[#101010] dark:shadow-none",
                HAIRLINE
              )}
            >
              <div className={cn("flex h-10 items-center gap-2 border-b bg-neutral-50 px-4 dark:bg-neutral-900/70", HAIRLINE)}>
                <div className="flex gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                </div>
                <div className="mx-auto flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-0.5 font-mono text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                  demo.rybbit.com
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="relative flex size-2" aria-hidden>
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  {t("Live")}
                </div>
              </div>
              <iframe
                src="https://demo.rybbit.com/81/main"
                width="1300"
                height="750"
                loading="lazy"
                className="h-[560px] w-full md:h-[660px] lg:h-[720px]"
                style={{ border: "none" }}
                title="Rybbit Analytics Demo"
              ></iframe>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
