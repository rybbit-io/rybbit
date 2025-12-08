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
    <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-20">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">{title}</h2>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
          {description} Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} pageviews per month.
        </p>
        <TrackedButton
          href="https://app.rybbit.io/signup"
          eventName="signup"
          eventProps={{ location: eventLocation }}
          className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
        >
          {buttonText}
        </TrackedButton>
      </div>
    </div>
  );
}
