import { BackgroundGrid } from "@/components/BackgroundGrid";
import { CTASection } from "@/components/CTASection";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { CheckCircle, CircleMinus } from "lucide-react";
import { useExtracted } from "next-intl";
import { Tilt_Warp } from "next/font/google";
import Image from "next/image";
import React from "react";
import { TrackedButton } from "@/components/TrackedButton";
import { cn } from "@/lib/utils";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export interface ComparisonFeature {
  name: string;
  rybbitValue: string | boolean;
  competitorValue: string | boolean;
}

export interface ComparisonSection {
  title: string;
  features: ComparisonFeature[];
}

export interface ComparisonPageProps {
  competitorName: string;
  sections: ComparisonSection[];
  comparisonContent?: React.ReactNode;
}

export function ComparisonPage({ competitorName, sections, comparisonContent }: ComparisonPageProps) {
  const t = useExtracted();

  const renderFeatureValue = (value: string | boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircle className="w-5 h-5 text-emerald-500" />
      ) : (
        <CircleMinus className="w-5 h-5 text-neutral-500" />
      );
    }
    return <span className="text-neutral-700 dark:text-neutral-300">{value}</span>;
  };

  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden pt-16 md:pt-24">
      <BackgroundGrid />
      <div className="relative flex flex-col py-8">
        {/* Grid background with fade */}

        <h1
          className={cn(
            "relative z-10 text-4xl md:text-5xl lg:text-7xl font-medium  px-4 tracking-tight max-w-4xl text-center text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-gray-100 dark:to-gray-400",
            tilt_wrap.className
          )}
        >
          {t("Rybbit vs {competitor}", { competitor: competitorName })}
        </h1>
        <h2 className="relative z-10 text-base md:text-xl pt-4 md:pt-6 px-4 tracking-tight max-w-4xl text-center text-neutral-600 dark:text-neutral-300 font-light">
          {t("Compare the key features of Rybbit and {competitor}.", { competitor: competitorName })}
        </h2>

        <div className="relative z-10 flex flex-col items-center my-8 md:my-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg px-4">
            <TrackedButton
              href="https://app.rybbit.io/signup"
              eventName="signup"
              eventProps={{ location: "hero", button_text: "Track your site" }}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
            >
              {t("Track your site")}
            </TrackedButton>
            <TrackedButton
              href="https://demo.rybbit.com/1"
              eventName="demo"
              target="_blank"
              rel="noopener noreferrer"
              eventProps={{ location: "hero", button_text: "Live demo" }}
              className="w-full sm:w-auto bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium px-5 py-3 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer"
            >
              {t("Live demo")}
            </TrackedButton>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm flex items-center justify-center gap-2 mt-6">
            <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
            {t("7-day free trial")}
          </p>
        </div>
      </div>

      {/* <div className="relative w-full max-w-[1300px] mb-10 px-4">
        <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-emerald-500/40 rounded-full blur-[80px] opacity-70"></div>
        <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-600/30 rounded-full blur-[70px] opacity-50"></div>

        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/40 rounded-full blur-[80px] opacity-60"></div>
        <div className="absolute bottom-40 right-20 w-[350px] h-[350px] bg-indigo-500/30 rounded-full blur-[75px] opacity-50"></div>

        <div className="absolute top-1/4 right-0 w-[320px] h-[320px] bg-purple-500/40 rounded-full blur-[70px] opacity-50"></div>
        <div className="absolute top-1/3 right-20 w-[250px] h-[250px] bg-violet-500/30 rounded-full blur-[65px] opacity-40"></div>

        <div className="absolute bottom-1/3 left-0 w-[320px] h-[320px] bg-emerald-400/30 rounded-full blur-[70px] opacity-60"></div>
        <div className="absolute bottom-1/4 left-20 w-[240px] h-[240px] bg-teal-400/25 rounded-full blur-[65px] opacity-50"></div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-400/30 rounded-full blur-[80px] opacity-50"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/3 -translate-y-1/3 w-[350px] h-[350px] bg-sky-400/20 rounded-full blur-[75px] opacity-40"></div>

        <div className="relative z-10 rounded-lg overflow-hidden border-8 border-neutral-100/5 shadow-2xl shadow-emerald-900/10">
          <iframe
            src={demoUrl}
            width="1300"
            height="750"
            className="w-full h-[600px] md:h-[700px] lg:h-[750px]"
            style={{ border: "none" }}
            title="Rybbit Analytics Demo"
          ></iframe>
        </div>
      </div> */}

      <div className="w-full max-w-5xl mx-auto mt-12 px-4 z-10">
        <h2 className="text-2xl md:text-3xl font-semibold mb-4 md:mb-6 text-left">
          {t("Why choose Rybbit over {competitor}?", { competitor: competitorName })}
        </h2>
      </div>
      {/* Comparison Table */}
      <section className="pb-12 pt-4 w-full max-w-5xl mx-auto px-4">
        <div className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800">
          <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 overflow-hidden text-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-300 dark:border-neutral-800">
                  <th className="text-left p-6 w-2/5"></th>
                  <th className="text-center p-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-semibold">
                        <Image
                          src="/rybbit/horizontal_white.svg"
                          alt="Rybbit"
                          width={100}
                          height={27}
                          className="dark:invert-0 invert"
                        />
                      </span>
                    </div>
                  </th>
                  <th className="text-center p-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-semibold">{competitorName}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section, sectionIndex) => (
                  <React.Fragment key={sectionIndex}>
                    <tr>
                      <td colSpan={3} className="px-6 py-4 bg-neutral-200/70 dark:bg-neutral-900/70">
                        <span className="text-neutral-600 dark:text-neutral-400 text-sm font-medium">
                          {section.title}
                        </span>
                      </td>
                    </tr>
                    {section.features.map((feature, featureIndex) => (
                      <tr
                        key={`${sectionIndex}-${featureIndex}`}
                        className={
                          featureIndex < section.features.length - 1
                            ? "border-b border-neutral-300 dark:border-neutral-800"
                            : ""
                        }
                      >
                        <td className="px-6 py-4 text-neutral-700 dark:text-neutral-300 text-sm">{feature.name}</td>
                        <td className="px-6 py-4 text-center text-sm">
                          <div className="flex justify-center">{renderFeatureValue(feature.rybbitValue)}</div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          <div className="flex justify-center">{renderFeatureValue(feature.competitorValue)}</div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {comparisonContent && (
        <section className="py-12 md:py-16 w-full max-w-3xl mx-auto px-4">
          <div className="prose prose-invert prose-neutral max-w-none">{comparisonContent}</div>
        </section>
      )}

      <CTASection
        title="It's time to switch to analytics that's made for you"
        eventLocation="comparison_bottom_cta"
      />
    </div>
  );
}
