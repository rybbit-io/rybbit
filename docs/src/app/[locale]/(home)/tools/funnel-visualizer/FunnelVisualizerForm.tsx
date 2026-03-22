"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { round } from "lodash";

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

export function FunnelVisualizerForm() {
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
  );
}
