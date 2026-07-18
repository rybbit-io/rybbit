import { ArrowRight } from "lucide-react";
import { GridCrosses } from "@/components/GridCrosses";
import { TrackedButton } from "@/components/TrackedButton";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";

interface ToolCTAProps {
  title: string;
  description: string;
  eventLocation: string;
  buttonText?: string;
}

export function ToolCTA({ title, description, eventLocation, buttonText = "Start tracking for free" }: ToolCTAProps) {
  return (
    <section className="relative overflow-hidden border-b border-emerald-900 bg-emerald-950 text-white">
      <div className="relative mx-auto grid max-w-[1200px] border-x border-white/10 lg:grid-cols-12">
        <GridCrosses className="hidden text-white/30 sm:block dark:text-white/30" />

        <div className="relative z-10 border-b border-white/10 px-5 py-14 sm:px-8 md:py-16 lg:col-span-8 lg:border-b-0 lg:border-r lg:px-10">
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-balance md:text-4xl">
            {title}
          </h2>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-5 py-12 sm:px-8 lg:col-span-4 lg:px-10">
          <p className="max-w-md text-base leading-7 text-emerald-100/80">
            {description} Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} pageviews per month.
          </p>

          <div className="mt-8">
            <TrackedButton
              href="https://app.rybbit.io/signup"
              eventName="signup"
              eventProps={{ location: eventLocation }}
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-emerald-950 transition-colors duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950"
            >
              {buttonText}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </TrackedButton>
          </div>
        </div>
      </div>
    </section>
  );
}
