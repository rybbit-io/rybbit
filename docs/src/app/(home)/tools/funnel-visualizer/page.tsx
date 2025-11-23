"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { round } from "lodash";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface FunnelStep {
  name: string;
  visitors: string;
}

interface FunnelChartData {
  stepName: string;
  visitors: number;
  conversionRate: number;
  dropoffRate: number;
  stepNumber: number;
}

export default function FunnelVisualizerPage() {
  const [steps, setSteps] = useState<FunnelStep[]>([
    { name: "Landing Page", visitors: "" },
    { name: "Product Page", visitors: "" },
    { name: "Cart", visitors: "" },
    { name: "Checkout", visitors: "" },
    { name: "Purchase", visitors: "" },
  ]);

  const addStep = () => {
    setSteps([...steps, { name: "", visitors: "" }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 2) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, field: "name" | "visitors", value: string) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const calculateFunnelData = (): FunnelChartData[] | null => {
    const validSteps = steps.filter(s => s.name && s.visitors && parseFloat(s.visitors) > 0);
    if (validSteps.length < 2) return null;

    const firstStepVisitors = parseFloat(validSteps[0].visitors);

    return validSteps.map((step, index) => {
      const visitors = parseFloat(step.visitors);
      const conversionRate = (visitors / firstStepVisitors) * 100;
      const prevVisitors = index > 0 ? parseFloat(validSteps[index - 1].visitors) : visitors;
      const dropoffRate = index > 0 ? ((prevVisitors - visitors) / prevVisitors) * 100 : 0;

      return {
        stepName: step.name,
        visitors,
        conversionRate,
        dropoffRate,
        stepNumber: index + 1,
      };
    });
  };

  const chartData = calculateFunnelData();
  const firstStep = chartData?.[0];
  const lastStep = chartData?.[chartData.length - 1];
  const totalConversionRate = lastStep?.conversionRate || 0;

  const clearForm = () => {
    setSteps([
      { name: "Landing Page", visitors: "" },
      { name: "Product Page", visitors: "" },
      { name: "Cart", visitors: "" },
      { name: "Checkout", visitors: "" },
      { name: "Purchase", visitors: "" },
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-block mb-4 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Free Tool</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-6 tracking-tight">
            Funnel Visualizer
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Visualize your conversion funnel step-by-step. Input visitor counts at each stage and see where you're
            losing customers.
          </p>
        </div>

        {/* Tool */}
        <div className="mb-16">
          <div className="space-y-6">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={step.name}
                      onChange={e => updateStep(index, "name", e.target.value)}
                      placeholder={`Step ${index + 1} name`}
                      className="px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="number"
                      value={step.visitors}
                      onChange={e => updateStep(index, "visitors", e.target.value)}
                      placeholder="Visitors"
                      className="px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {steps.length > 2 && (
                    <button
                      onClick={() => removeStep(index)}
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addStep}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Step
            </button>

            {/* Funnel Visualization */}
            {chartData && chartData.length > 0 && (
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <div className="space-y-0">
                  {chartData.map((step, index) => {
                    const maxBarWidth = 100;
                    const ratio = firstStep?.visitors ? step.visitors / firstStep.visitors : 0;
                    const barWidth = Math.max(ratio * maxBarWidth, 0);
                    const prevStep = index > 0 ? chartData[index - 1] : null;
                    const droppedFromPrevious = prevStep ? prevStep.visitors - step.visitors : 0;

                    return (
                      <div key={step.stepNumber} className="relative pb-4">
                        {/* Step Header */}
                        <div className="flex items-center p-2">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs mr-2">
                            {step.stepNumber}
                          </div>
                          <div className="font-medium text-sm flex-1">{step.stepName}</div>
                        </div>

                        {/* Bar and metrics */}
                        <div className="flex items-center pl-8">
                          {/* Metrics */}
                          <div className="flex-shrink-0 min-w-[130px] mr-4 space-y-1">
                            <div className="flex items-baseline">
                              <span className="text-base font-semibold">{step.visitors.toLocaleString()}</span>
                              <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-1">visitors</span>
                            </div>
                            {index !== 0 && (
                              <div className="flex items-baseline text-orange-500 text-xs font-medium">
                                {droppedFromPrevious.toLocaleString()} dropped
                              </div>
                            )}
                          </div>

                          {/* Bar */}
                          <div className="flex-grow h-10 bg-neutral-100 dark:bg-neutral-800 rounded-md overflow-hidden relative mt-2">
                            {/* Relative conversion bar (from previous step) */}
                            {index > 0 && prevStep && (
                              <div
                                className="absolute h-full rounded-md"
                                style={{
                                  width: `${(step.visitors / prevStep.visitors) * 100}%`,
                                  background: `repeating-linear-gradient(
                                    45deg,
                                    rgba(16, 185, 129, 0.25),
                                    rgba(16, 185, 129, 0.25) 6px,
                                    rgba(16, 185, 129, 0.15) 6px,
                                    rgba(16, 185, 129, 0.15) 12px
                                  )`,
                                }}
                              ></div>
                            )}
                            {/* Absolute conversion bar (from first step) */}
                            <div
                              className="h-full bg-emerald-500/70 rounded-md relative z-10"
                              style={{ width: `${barWidth}%` }}
                            ></div>
                            <div className="absolute top-2 right-2 z-20">
                              <div className="text-base font-semibold">{round(step.conversionRate, 2)}%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 mt-6 ml-4 text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-emerald-500/70 rounded-sm mr-1"></div>
                    <span>Overall conversion</span>
                  </div>
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-sm mr-1"
                      style={{
                        background: `repeating-linear-gradient(
                          45deg,
                          rgba(16, 185, 129, 0.25),
                          rgba(16, 185, 129, 0.25) 3px,
                          rgba(16, 185, 129, 0.15) 3px,
                          rgba(16, 185, 129, 0.15) 6px
                        )`,
                      }}
                    ></div>
                    <span>Conversion from previous step</span>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={clearForm}
                className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Understanding Conversion Funnels</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What is a conversion funnel?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  A conversion funnel is the path visitors take from initial contact to conversion. It shows how many
                  users progress through each step and where they drop off. Understanding your funnel helps identify
                  friction points and optimization opportunities.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What's a good funnel conversion rate?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  It varies by industry, but e-commerce funnels typically see 2-3% overall conversion rates. SaaS free
                  trial funnels might see 10-20% conversion to paid. The key is identifying your biggest drop-off points
                  and improving those steps first—even small improvements compound.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How do I improve my funnel?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Focus on the steps with the biggest drop-offs. Common improvements include: simplifying forms,
                  improving page load speed, adding trust signals, clarifying value propositions, reducing friction, and
                  A/B testing changes. Track your funnels automatically with{" "}
                  <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Rybbit Analytics
                  </Link>{" "}
                  to measure impact.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Track funnels automatically with Rybbit
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            No manual data entry—Rybbit automatically tracks conversion funnels with real-time session data. Get started
            for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "funnel_visualizer_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
