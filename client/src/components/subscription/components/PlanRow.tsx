import { cn } from "@/lib/utils";
import { findPriceForTier } from "@/lib/subscription/planUtils";

interface PlanRowProps {
  plan: "standard" | "pro";
  label: string;
  description: string;
  eventLimit: number | string;
  isAnnual: boolean;
  selectedPlan: string;
  onSelect: () => void;
  isCurrent?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export function PlanRow({
  plan,
  label,
  description,
  eventLimit,
  isAnnual,
  selectedPlan,
  onSelect,
  isCurrent,
  disabled,
  disabledReason,
}: PlanRowProps) {
  const price =
    eventLimit !== "Custom"
      ? findPriceForTier(eventLimit, isAnnual ? "year" : "month", plan)
      : null;
  const displayPrice = price
    ? isAnnual
      ? Math.round(price.price / 12)
      : price.price
    : 0;

  return (
    <button
      onClick={disabled ? undefined : onSelect}
      className={cn(
        "w-full rounded-2xl p-1.5 transition-all text-left",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer",
        !disabled && selectedPlan === plan
          ? "bg-emerald-500/10 border border-emerald-500/30"
          : "bg-neutral-200/20 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-xl border",
          !disabled && selectedPlan === plan
            ? "border-emerald-500 bg-neutral-50 dark:bg-neutral-800/60"
            : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900",
          !disabled && selectedPlan !== plan && "hover:border-neutral-300 dark:hover:border-neutral-700"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
              !disabled && selectedPlan === plan
                ? "border-emerald-500"
                : "border-neutral-300 dark:border-neutral-600"
            )}
          >
            {!disabled && selectedPlan === plan && (
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{label}</span>
              {isCurrent && (
                <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Current
                </span>
              )}
              {disabled && disabledReason && (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                  {disabledReason}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-semibold">${displayPrice}</span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            /mo
          </span>
        </div>
      </div>
    </button>
  );
}
