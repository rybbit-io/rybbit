import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { CircleCheckIcon } from "@/components/ui/circle-check";
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
    <>
      <div className="flex flex-col items-center justify-center overflow-x-hidden pt-16 md:pt-24">
        {showGitHubStar && <GitHubStarButton />}

        <h1
          className={cn(
            "text-4xl md:text-5xl lg:text-7xl px-4 tracking-tight max-w-4xl text-center text-neutral-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:via-gray-100 dark:to-gray-400",
            tilt_wrap.className
          )}
        >
          {title}
        </h1>
        <h2 className="text-base md:text-xl pt-4 md:pt-6 px-4 tracking-tight max-w-4xl text-center text-neutral-600 dark:text-neutral-300 font-light">
          {subtitle}
          {showEUFlag && <EUFlag />}
        </h2>

        <div className="flex flex-col items-center my-8 md:my-10">
          <div className="flex flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg">
            <TrackedButton
              href="https://app.rybbit.io/signup"
              eventName="signup"
              eventProps={{ location: "hero", button_text: "get started" }}
              className="w-full whitespace-nowrap sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-opacity-50 cursor-pointer"
            >
              {t("Start for $0")}
            </TrackedButton>
            <TrackedButton
              href="https://demo.rybbit.com/81"
              eventName="demo"
              target="_blank"
              rel="noopener noreferrer"
              eventProps={{ location: "hero", button_text: "Live demo" }}
              className="w-full whitespace-nowrap sm:w-auto bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium px-6 py-3 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer"
            >
              {t("Live demo")}
            </TrackedButton>
          </div>
          {/* <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm flex items-center justify-center gap-2 mt-6">
            <CircleCheckIcon size={16} className="text-neutral-500 dark:text-neutral-400" />
            {t("7-day free trial.")}
          </p> */}
        </div>
        <div className="relative w-full max-w-[1300px] mb-10">
          {/* Background gradients - overlapping circles for organic feel */}
          <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-emerald-500/30 dark:bg-emerald-500/40 rounded-full blur-[80px] opacity-80 dark:opacity-70"></div>
          <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-600/20 dark:bg-emerald-600/30 rounded-full blur-[70px] opacity-60 dark:opacity-50"></div>

          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/30 dark:bg-blue-500/40 rounded-full blur-[80px] opacity-70 dark:opacity-60"></div>
          <div className="absolute bottom-40 right-20 w-[350px] h-[350px] bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full blur-[75px] opacity-60 dark:opacity-50"></div>

          <div className="absolute top-1/4 right-0 w-[320px] h-[320px] bg-purple-500/30 dark:bg-purple-500/40 rounded-full blur-[70px] opacity-60 dark:opacity-50"></div>
          <div className="absolute top-1/3 right-20 w-[250px] h-[250px] bg-violet-500/20 dark:bg-violet-500/30 rounded-full blur-[65px] opacity-50 dark:opacity-40"></div>

          <div className="absolute bottom-1/3 left-0 w-[320px] h-[320px] bg-emerald-400/20 dark:bg-emerald-400/30 rounded-full blur-[70px] opacity-70 dark:opacity-60"></div>
          <div className="absolute bottom-1/4 left-20 w-[240px] h-[240px] bg-teal-400/15 dark:bg-teal-400/25 rounded-full blur-[65px] opacity-60 dark:opacity-50"></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-400/20 dark:bg-indigo-400/30 rounded-full blur-[80px] opacity-60 dark:opacity-50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/3 -translate-y-1/3 w-[350px] h-[350px] bg-sky-400/15 dark:bg-sky-400/20 rounded-full blur-[75px] opacity-50 dark:opacity-40"></div>

          {/* Iframe container with responsive visibility */}
          <div className="relative z-10 rounded-2xl overflow-hidden bg-neutral-400/10 dark:bg-neutral-100/5 border-8 shadow-2xl shadow-neutral-900/20 dark:shadow-emerald-900/10">
            {/* Remove mobile message and show iframe on all devices */}
            <iframe
              src="https://demo.rybbit.com/81/main"
              width="1300"
              height="750"
              className="w-full h-[600px] md:h-[700px] lg:h-[750px] rounded-xl"
              style={{ border: "none" }}
              title="Rybbit Analytics Demo"
            ></iframe>
          </div>
        </div>
      </div>
    </>
  );
}
