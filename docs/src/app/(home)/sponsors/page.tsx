import { CheckCircle } from "lucide-react";
import { Tilt_Warp } from "next/font/google";
import Image from "next/image";
import { TrackedButton } from "../../../components/TrackedButton";
import { cn } from "../../../lib/utils";
import type { Metadata } from "next";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Sponsors - Rybbit Analytics",
  description: "Meet the sponsors who support Rybbit, the open-source privacy-first analytics platform.",
  openGraph: {
    title: "Rybbit Sponsors",
    description: "Meet the sponsors who support Rybbit, the open-source privacy-first analytics platform.",
    type: "website",
    url: "https://rybbit.com/sponsors",
  },
  alternates: {
    canonical: "https://rybbit.com/sponsors",
  },
};

interface Sponsor {
  name: string;
  logo: string;
  url: string;
  description?: string;
}

const sponsors: Sponsor[] = [
  {
    name: "23M",
    logo: "/sponsors/23m.png",
    url: "https://23m.com",
  },
  {
    name: "Onyx",
    logo: "/sponsors/onyx.jpeg",
    url: "https://onyx.com",
  },
];

export default function SponsorsPage() {
  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden pt-16 md:pt-24">
      <div
        className={cn(
          "absolute inset-0 -top-32 md:-top-48",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,#d4d4d4_1px,transparent_1px),linear-gradient(to_bottom,#d4d4d4_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]",
          "[mask-image:linear-gradient(to_bottom,black,transparent_80%),linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
          "[mask-composite:intersect]"
        )}
      />
      <div className="relative flex flex-col py-8">
        <h1
          className={cn(
            "relative z-10 text-4xl md:text-5xl lg:text-7xl font-medium px-4 tracking-tight max-w-4xl text-center text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-gray-100 dark:to-gray-400",
            tilt_wrap.className
          )}
        >
          Our Sponsors
        </h1>
        <h2 className="relative z-10 text-base md:text-xl pt-4 md:pt-6 px-4 tracking-tight max-w-4xl text-center text-neutral-600 dark:text-neutral-300 font-light">
          Thank you to the amazing companies that support Rybbit&apos;s development.
        </h2>

        <div className="relative z-10 flex flex-col items-center my-8 md:my-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg px-4">
            <TrackedButton
              href="https://github.com/sponsors/goldflag"
              eventName="sponsor_click"
              eventProps={{ location: "hero", button_text: "Become a Sponsor" }}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
            >
              Become a Sponsor
            </TrackedButton>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm mt-4">30,000 visits a month</p>
        </div>
      </div>

      {/* Sponsors Grid */}
      <section className="py-12 w-full max-w-5xl mx-auto px-4 z-10">
        <div className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800">
          <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 p-8">
            <div className="flex gap-6">
              {sponsors.map(sponsor => (
                <a
                  key={sponsor.name}
                  href={sponsor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 hover:opacity-80 transition-opacity duration-200"
                >
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image src={sponsor.logo} alt={sponsor.name} fill className="object-contain rounded-lg" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-medium text-neutral-900 dark:text-white">{sponsor.name}</span>
                    {sponsor.description && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">{sponsor.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
