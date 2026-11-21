"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Pencil, Plus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Goal, GoalType } from "@/api/analytics/endpoints";
import { useAutocaptureValues } from "@/api/analytics/hooks/events/useAutocaptureValues";
import { useCreateGoal } from "@/api/analytics/hooks/goals/useCreateGoal";
import { useUpdateGoal } from "@/api/analytics/hooks/goals/useUpdateGoal";
import { useMetric } from "@/api/analytics/hooks/useGetMetric";
import { EventTrackingNotice } from "@/components/EventTrackingNotice";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions, SuggestionOption } from "@/components/ui/input-with-suggestions";
import { toast } from "@/components/ui/sonner";
import { isAutocaptureTargetType } from "@/lib/events";
import { cn } from "@/lib/utils";
import {
  GOAL_TYPES,
  goalDefinitionOf,
  goalFormDefaults,
  GoalFormMode,
  goalFormSchema,
  GoalFormValues,
  PropertyFilterDraft,
  propertyDraftsOf,
} from "../utils/goalForm";
import { GoalMatchPreview } from "./GoalMatchPreview";
import { GoalTypeIcon, useGoalTypeLabels } from "./goalType";

const FIELD_LABEL = "mb-1 block text-xs text-neutral-500 dark:text-neutral-400";
const HELP_TEXT = "text-xs text-neutral-500 dark:text-neutral-400";

interface GoalEditorProps {
  siteId: number;
  /** "create" starts empty; "edit" and "clone" start from `goal`. */
  mode: GoalFormMode;
  goal?: Goal;
  /** Called after a save and on cancel: the caller closes the editor. */
  onDone: () => void;
  className?: string;
}

/**
 * The goal form, inline in the ledger: a new goal at the foot of the table, an
 * edit in place of the goal's row. Every goal type the product has is
 * creatable here, and the line under the fields says how many sessions the
 * definition would have counted before it is saved.
 */
export function GoalEditor({ siteId, mode, goal, onDone, className }: GoalEditorProps) {
  const t = useExtracted();
  const typeLabels = useGoalTypeLabels();
  const fieldId = useId();
  const containerRef = useRef<HTMLFormElement>(null);

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const isSaving = createGoal.isPending || updateGoal.isPending;

  const goalName = goal ? goal.name || t("Goal #{goalId}", { goalId: String(goal.goalId) }) : "";
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: goalFormDefaults(goal, mode, t("{name} (Copy)", { name: goalName })),
  });
  const [properties, setProperties] = useState<PropertyFilterDraft[]>(() => propertyDraftsOf(goal));

  const values = form.watch();
  const goalType = values.goalType;
  const isAutocapture = isAutocaptureTargetType(goalType);

  // Opened from a button that may be a screen away, or in place of the row
  // whose menu was just used: bring the form into view and move focus to it,
  // so the next Tab lands on its first control.
  useEffect(() => {
    containerRef.current?.scrollIntoView?.({ block: "nearest" });
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  // Suggestions for the pattern field, fetched only for the selected type.
  const { data: paths } = useMetric({
    parameter: "pathname",
    limit: 1000,
    useFilters: false,
    enabled: goalType === "path",
  });
  const { data: events } = useMetric({
    parameter: "event_name",
    limit: 1000,
    useFilters: false,
    enabled: goalType === "event",
  });
  const { data: autocaptureValues } = useAutocaptureValues(goalType, isAutocapture);
  const suggestions: SuggestionOption[] =
    (goalType === "path" ? paths?.data : goalType === "event" ? events?.data : autocaptureValues)?.map(item => ({
      value: item.value,
      label: item.value,
      count: item.count,
    })) ?? [];

  const patternField: Record<GoalType, { label: string; placeholder: string; help: string }> = {
    path: {
      label: t("Path pattern"),
      placeholder: "/checkout/complete or /product/*/view",
      help: t("Use * to match a single path segment. Use ** to match across segments."),
    },
    event: {
      label: t("Event name"),
      placeholder: t("e.g., sign_up_completed"),
      help: "",
    },
    outbound: {
      label: t("URL pattern (optional)"),
      placeholder: "https://example.com/pricing or https://*.example.com/**",
      help: t("Matches the destination URL of the outbound link. Leave empty to count any outbound click."),
    },
    button_click: {
      label: t("Button text (optional)"),
      placeholder: t("e.g., Sign Up"),
      help: t("Matches the button's visible text. Leave empty to count any button click."),
    },
    form_submit: {
      label: t("Form name or ID (optional)"),
      placeholder: t("e.g., signup-form"),
      help: t("Matches the form's name or id attribute. Leave empty to count any form submission."),
    },
    copy: {
      label: t("Copied text (optional)"),
      placeholder: t("e.g., PROMO*"),
      help: t("Matches the text that was copied. Leave empty to count any copied text."),
    },
  };
  const field = patternField[goalType];
  const help = isAutocapture
    ? `${field.help} ${t("Use * to match within a segment. Use ** to match anything.")}`
    : field.help;

  // Page goals match URL parameters; every other type matches event properties.
  const propertyCopy =
    goalType === "path"
      ? {
          add: t("Match a URL parameter"),
          key: "e.g., utm_source",
          value: "e.g., adwords",
          keyLabel: t("URL parameter"),
          valueLabel: t("Parameter value"),
        }
      : {
          add: t("Match an event property"),
          key: goalType === "event" ? "e.g., plan_type" : "e.g., text",
          value: goalType === "event" ? "e.g., premium" : "e.g., Sign Up",
          keyLabel: t("Event property"),
          valueLabel: t("Property value"),
        };

  const patternErrors: Record<string, string> = {
    required: goalType === "path" ? t("Enter a path pattern.") : t("Enter an event name."),
    url: t("Enter a path (e.g., /checkout), not a full URL. The domain is already determined by your site."),
    too_long: t("The pattern is too long."),
  };
  const patternError = form.formState.errors.pattern?.message;

  const heading =
    mode === "edit"
      ? { icon: <Pencil />, label: t("Edit goal") }
      : mode === "clone"
        ? { icon: <Copy />, label: t("Clone goal") }
        : { icon: <Plus />, label: t("New goal") };

  const onSubmit = async (submitted: GoalFormValues) => {
    const definition = goalDefinitionOf(submitted, properties);
    if (!definition) return;

    try {
      if (mode === "edit" && goal) {
        await updateGoal.mutateAsync({ goalId: goal.goalId, siteId, name: submitted.name?.trim(), ...definition });
      } else {
        await createGoal.mutateAsync({ siteId, name: submitted.name?.trim(), ...definition });
      }
      onDone();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to save goal"));
    }
  };

  return (
    <form
      ref={containerRef}
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn("space-y-3 px-3 py-3 focus:outline-none", className)}
      aria-label={heading.label}
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2 text-sm font-medium [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-neutral-500 dark:[&_svg]:text-neutral-400">
          {heading.icon}
          {heading.label}
        </div>
        <Controller
          control={form.control}
          name="goalType"
          render={({ field: typeField }) => (
            <SegmentedControl<GoalType>
              size="sm"
              aria-label={t("Goal type")}
              value={typeField.value}
              onValueChange={next => {
                // A URL parameter and an event property are different things:
                // clear the rows instead of silently reinterpreting them.
                setProperties([]);
                // What was typed for one type (a path) is not a value for another (an event name).
                form.setValue("pattern", "");
                form.clearErrors("pattern");
                typeField.onChange(next);
              }}
              options={GOAL_TYPES.map(type => ({
                value: type,
                ariaLabel: typeLabels[type],
                label: (
                  <>
                    <GoalTypeIcon type={type} className="h-3.5 w-3.5 text-current dark:text-current" />
                    <span className="hidden md:inline">{typeLabels[type]}</span>
                  </>
                ),
              }))}
            />
          )}
        />
        {help && <p className={cn(HELP_TEXT, "hidden min-w-0 flex-1 text-right xl:block")}>{help}</p>}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-72">
          <label htmlFor={`${fieldId}-pattern`} className={FIELD_LABEL}>
            {field.label}
          </label>
          <Controller
            control={form.control}
            name="pattern"
            render={({ field: patternInput }) => (
              <InputWithSuggestions
                id={`${fieldId}-pattern`}
                suggestions={suggestions}
                placeholder={field.placeholder}
                aria-invalid={!!patternError}
                {...patternInput}
              />
            )}
          />
        </div>
        <div className="w-full sm:w-60">
          <label htmlFor={`${fieldId}-name`} className={FIELD_LABEL}>
            {t("Name (optional)")}
          </label>
          <Input
            id={`${fieldId}-name`}
            placeholder={t("e.g., Sign up completion")}
            autoComplete="off"
            {...form.register("name")}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          className="font-normal text-neutral-600 dark:text-neutral-300"
          onClick={() => setProperties([...properties, { key: "", value: "" }])}
        >
          <Plus />
          {propertyCopy.add}
        </Button>
        <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          <Button type="button" variant="outline" onClick={onDone}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="accent" loading={isSaving} loadingLabel={t("Saving...")}>
            {mode === "edit" ? t("Save changes") : t("Create goal")}
          </Button>
        </div>
      </div>

      {patternError && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {patternErrors[patternError] ?? patternError}
        </p>
      )}

      {properties.length > 0 && (
        <div className="space-y-2">
          {properties.map((property, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                className="w-full sm:w-72"
                aria-label={propertyCopy.keyLabel}
                placeholder={propertyCopy.key}
                autoComplete="off"
                value={property.key}
                onChange={event =>
                  setProperties(properties.map((p, i) => (i === index ? { ...p, key: event.target.value } : p)))
                }
              />
              <Input
                className="w-full sm:w-60"
                aria-label={propertyCopy.valueLabel}
                placeholder={propertyCopy.value}
                autoComplete="off"
                value={property.value}
                onChange={event =>
                  setProperties(properties.map((p, i) => (i === index ? { ...p, value: event.target.value } : p)))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="smIcon"
                className="shrink-0 text-neutral-500 dark:text-neutral-400"
                aria-label={t("Remove")}
                onClick={() => setProperties(properties.filter((_, i) => i !== index))}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}

      {help && <p className={cn(HELP_TEXT, "xl:hidden")}>{help}</p>}
      <EventTrackingNotice type={goalType} />
      <GoalMatchPreview definition={goalDefinitionOf(values, properties)} />
    </form>
  );
}
