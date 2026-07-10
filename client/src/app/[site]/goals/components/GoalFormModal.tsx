"use client";

import { useExtracted } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateGoal } from "../../../../api/analytics/hooks/goals/useCreateGoal";
import { Goal, GoalType } from "../../../../api/analytics/endpoints";
import { useUpdateGoal } from "../../../../api/analytics/hooks/goals/useUpdateGoal";
import { useAutocaptureValues } from "../../../../api/analytics/hooks/events/useAutocaptureValues";
import { useMetric } from "../../../../api/analytics/hooks/useGetMetric";
import { EventTypeIcon } from "../../../../components/EventIcons";
import {
  AUTOCAPTURE_TARGET_TYPES,
  AutocaptureTargetType,
  isAutocaptureTargetType,
  targetTypeToEventType,
} from "../../../../lib/events";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../../components/ui/form";
import { Input } from "../../../../components/ui/input";
import { InputWithSuggestions, SuggestionOption } from "../../../../components/ui/input-with-suggestions";
import { Label } from "../../../../components/ui/label";
import { toast } from "../../../../components/ui/sonner";
import { Switch } from "../../../../components/ui/switch";
import { cn } from "../../../../lib/utils";
import { Plus, X } from "lucide-react";

// Define form schema
const formSchema = z
  .object({
    name: z.string().optional(),
    goalType: z.enum(["path", "event", ...AUTOCAPTURE_TARGET_TYPES]),
    config: z.object({
      pathPattern: z.string().optional(),
      eventName: z.string().optional(),
      valuePattern: z.string().max(512).optional(),
      eventPropertyKey: z.string().optional(),
      eventPropertyValue: z.string().optional(),
      propertyFilters: z
        .array(
          z.object({
            key: z.string(),
            value: z.union([z.string(), z.number(), z.boolean()]),
          })
        )
        .optional(),
    }),
  })
  .refine(
    data => {
      if (data.goalType === "path") {
        return !!data.config.pathPattern;
      } else if (data.goalType === "event") {
        return !!data.config.eventName;
      }
      // Autocapture goals match any event of their type when the pattern is empty
      return true;
    },
    {
      message: "Configuration is required based on goal type",
      path: ["config"],
    }
  )
  .refine(
    data => {
      if (data.goalType === "path" && data.config.pathPattern) {
        return !/^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/)/i.test(data.config.pathPattern);
      }
      return true;
    },
    {
      message: "Enter a path (e.g., /checkout), not a full URL. The domain is already determined by your site.",
      path: ["config", "pathPattern"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

type PropertyFilterDraft = { key: string; value: string };

interface PropertyFilterSectionProps {
  id: string;
  toggleLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  addButtonLabel: string;
  useProperties: boolean;
  setUseProperties: (enabled: boolean) => void;
  propertyFilters: PropertyFilterDraft[];
  setPropertyFilters: (filters: PropertyFilterDraft[]) => void;
}

function PropertyFilterSection({
  id,
  toggleLabel,
  keyPlaceholder,
  valuePlaceholder,
  addButtonLabel,
  useProperties,
  setUseProperties,
  propertyFilters,
  setPropertyFilters,
}: PropertyFilterSectionProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center space-x-2 mb-4">
        <Switch id={id} checked={useProperties} onCheckedChange={setUseProperties} />
        <Label htmlFor={id}>{toggleLabel}</Label>
      </div>

      {useProperties && (
        <div className="space-y-3">
          {propertyFilters.map((filter, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder={keyPlaceholder}
                  value={filter.key}
                  onChange={e => {
                    const newFilters = [...propertyFilters];
                    newFilters[index] = { ...newFilters[index], key: e.target.value };
                    setPropertyFilters(newFilters);
                  }}
                />
                <Input
                  placeholder={valuePlaceholder}
                  value={filter.value}
                  onChange={e => {
                    const newFilters = [...propertyFilters];
                    newFilters[index] = { ...newFilters[index], value: e.target.value };
                    setPropertyFilters(newFilters);
                  }}
                />
              </div>
              {propertyFilters.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPropertyFilters(propertyFilters.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPropertyFilters([...propertyFilters, { key: "", value: "" }])}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            {addButtonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

interface GoalFormModalProps {
  siteId: number;
  goal?: Goal; // Optional goal for editing mode
  trigger?: React.ReactNode;
  isCloneMode?: boolean; // Optional clone mode flag
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function GoalFormModal({
  siteId,
  goal,
  trigger,
  isCloneMode = false,
  open,
  onOpenChange,
}: GoalFormModalProps) {
  const t = useExtracted();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const goalTypeOptions: { value: GoalType; label: string }[] = [
    { value: "path", label: t("Page") },
    { value: "event", label: t("Event") },
    { value: "outbound", label: t("Outbound Link") },
    { value: "button_click", label: t("Button Click") },
    { value: "form_submit", label: t("Form Submit") },
    { value: "copy", label: t("Copy") },
  ];

  // Field copy for autocapture goal types; the pattern is optional and
  // matches the type's primary property with * and ** wildcards
  const autocaptureFieldMeta: Record<AutocaptureTargetType, { label: string; placeholder: string; help: string }> = {
    outbound: {
      label: t("URL Pattern (optional)"),
      placeholder: "https://example.com/pricing or https://*.example.com/**",
      help: t("Matches the destination URL of the outbound link. Leave empty to count any outbound click."),
    },
    button_click: {
      label: t("Button Text (optional)"),
      placeholder: t("e.g., Sign Up"),
      help: t("Matches the button's visible text. Leave empty to count any button click."),
    },
    form_submit: {
      label: t("Form Name or ID (optional)"),
      placeholder: t("e.g., signup-form"),
      help: t("Matches the form's name or id attribute. Leave empty to count any form submission."),
    },
    copy: {
      label: t("Copied Text (optional)"),
      placeholder: t("e.g., PROMO*"),
      help: t("Matches the text that was copied. Leave empty to count any copied text."),
    },
  };

  // Copy for the property-filter toggle/inputs, per goal type. The 4 autocapture
  // types all filter on event props, so they share one entry.
  const autocapturePropertyFilterMeta = {
    id: "use-properties-autocapture",
    toggleLabel: t("Match specific event properties"),
    keyPlaceholder: "e.g., text",
    valuePlaceholder: "e.g., Sign Up",
    addButtonLabel: t("Add Another Property"),
  };
  const propertyFilterMeta: Record<GoalType, typeof autocapturePropertyFilterMeta> = {
    path: {
      id: "use-properties",
      toggleLabel: t("Match specific URL parameters"),
      keyPlaceholder: "e.g., utm_source",
      valuePlaceholder: "e.g., adwords",
      addButtonLabel: t("Add Another Parameter"),
    },
    event: {
      id: "use-properties-event",
      toggleLabel: t("Match specific event properties"),
      keyPlaceholder: "e.g., plan_type",
      valuePlaceholder: "e.g., premium",
      addButtonLabel: t("Add Another Property"),
    },
    outbound: autocapturePropertyFilterMeta,
    button_click: autocapturePropertyFilterMeta,
    form_submit: autocapturePropertyFilterMeta,
    copy: autocapturePropertyFilterMeta,
  };

  // Initialize useProperties based on either new propertyFilters or legacy properties
  const hasProperties = !!(
    goal?.config.propertyFilters?.length ||
    (goal?.config.eventPropertyKey && goal?.config.eventPropertyValue !== undefined)
  );
  const [useProperties, setUseProperties] = useState(hasProperties);

  // State for managing multiple property filters (store as strings in UI)
  const [propertyFilters, setPropertyFilters] = useState<PropertyFilterDraft[]>(
    goal?.config.propertyFilters?.map(f => ({ key: f.key, value: String(f.value) })) ||
      (goal?.config.eventPropertyKey && goal?.config.eventPropertyValue !== undefined
        ? [{ key: goal.config.eventPropertyKey, value: String(goal.config.eventPropertyValue) }]
        : [{ key: "", value: "" }])
  );

  // Fetch suggestions for paths and events
  const { data: pathsData } = useMetric({
    parameter: "pathname",
    limit: 1000,
    useFilters: false,
  });

  const { data: eventsData } = useMetric({
    parameter: "event_name",
    limit: 1000,
    useFilters: false,
  });

  // Transform data into SuggestionOption format
  const pathSuggestions: SuggestionOption[] =
    pathsData?.data?.map(item => ({
      value: item.value,
      label: item.value,
    })) || [];

  const eventSuggestions: SuggestionOption[] =
    eventsData?.data?.map(item => ({
      value: item.value,
      label: item.value,
    })) || [];

  // Reinitialize useProperties when goal changes or modal opens
  useEffect(() => {
    if (isOpen && goal) {
      // Update useProperties based on either new propertyFilters or legacy properties
      const hasFilters = !!(
        goal.config.propertyFilters?.length ||
        (goal.config.eventPropertyKey && goal.config.eventPropertyValue !== undefined)
      );
      setUseProperties(hasFilters);

      // Update propertyFilters state
      const filters =
        goal.config.propertyFilters?.map(f => ({ key: f.key, value: String(f.value) })) ||
        (goal.config.eventPropertyKey && goal.config.eventPropertyValue !== undefined
          ? [{ key: goal.config.eventPropertyKey, value: String(goal.config.eventPropertyValue) }]
          : [{ key: "", value: "" }]);
      setPropertyFilters(filters);
    }
  }, [isOpen, goal]);

  const onClose = () => {
    setIsOpen(false);
  };

  const isEditMode = !!goal && !isCloneMode;
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  // Initialize form with default values or existing goal
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues:
      (isEditMode || isCloneMode) && goal
        ? {
            name: isCloneMode ? `${goal.name || `Goal #${goal.goalId}`} (Copy)` : goal.name || "",
            goalType: goal.goalType,
            config: {
              pathPattern: goal.config.pathPattern || "",
              eventName: goal.config.eventName || "",
              valuePattern: goal.config.valuePattern || "",
              eventPropertyKey: goal.config.eventPropertyKey || "",
              eventPropertyValue:
                goal.config.eventPropertyValue !== undefined ? String(goal.config.eventPropertyValue) : "",
            },
          }
        : {
            name: "",
            goalType: "path",
            config: {
              pathPattern: "",
              eventName: "",
              valuePattern: "",
              eventPropertyKey: "",
              eventPropertyValue: "",
            },
          },
  });

  const goalType = form.watch("goalType");

  // Suggestions for autocapture pattern values (urls, button texts, form names, copied texts)
  const { data: autocaptureValuesData } = useAutocaptureValues(goalType, isOpen && isAutocaptureTargetType(goalType));

  const autocaptureSuggestions: SuggestionOption[] =
    autocaptureValuesData?.map(item => ({
      value: item.value,
      label: item.value,
    })) || [];

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      // Clean up the config based on goal type
      if (values.goalType === "path") {
        values.config.eventName = undefined;
        values.config.valuePattern = undefined;
      } else if (values.goalType === "event") {
        values.config.pathPattern = undefined;
        values.config.valuePattern = undefined;
      } else {
        values.config.pathPattern = undefined;
        values.config.eventName = undefined;
        values.config.valuePattern = values.config.valuePattern?.trim() || undefined;
      }

      // Set propertyFilters if using properties
      if (useProperties) {
        const validFilters = propertyFilters.filter(f => f.key && f.value);
        values.config.propertyFilters = validFilters.length > 0 ? validFilters : undefined;
      } else {
        values.config.propertyFilters = undefined;
      }
      // Clear legacy fields
      values.config.eventPropertyKey = undefined;
      values.config.eventPropertyValue = undefined;

      if (isEditMode) {
        await updateGoal.mutateAsync({
          goalId: goal.goalId,
          siteId,
          name: values.name,
          goalType: values.goalType,
          config: values.config,
        });
      } else {
        await createGoal.mutateAsync({
          siteId,
          name: values.name,
          goalType: values.goalType,
          config: values.config,
        });
      }

      // Reset form and state after successful submission
      form.reset();
      setUseProperties(false);

      setIsOpen(false);
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to save goal"));
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        setIsOpen(open);
        if (!open) {
          form.reset();
          setUseProperties(false);
          setPropertyFilters([{ key: "", value: "" }]);
        }
      }}
    >
      {trigger && (
        <DialogTrigger asChild>
          <div onClick={() => setIsOpen(true)}>{trigger}</div>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("Edit Goal") : isCloneMode ? t("Clone Goal") : t("Create Goal")}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("Update the goal details below.")
              : isCloneMode
                ? t("Clone this goal with the same configuration.")
                : t("Set up a new conversion goal to track specific user actions.")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Goal Name (optional)")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("e.g., Sign Up Completion")} autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Goal Type")}</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {goalTypeOptions.map(option => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={field.value === option.value ? "default" : "outline"}
                          className={cn(
                            "flex items-center justify-start gap-2",
                            field.value === option.value && "border-blue-500"
                          )}
                          onClick={() => {
                            // Property filters are interpreted differently per goal type
                            // (URL params vs. event props), so clear them on type change
                            // instead of silently reinterpreting them.
                            if (field.value !== option.value) {
                              setUseProperties(false);
                              setPropertyFilters([{ key: "", value: "" }]);
                            }
                            field.onChange(option.value);
                          }}
                        >
                          <EventTypeIcon type={targetTypeToEventType(option.value)} />
                          <span>{option.label}</span>
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {goalType === "path" && (
              <FormField
                control={form.control}
                name="config.pathPattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Path Pattern")}</FormLabel>
                    <FormControl>
                      <InputWithSuggestions
                        suggestions={pathSuggestions}
                        placeholder="/checkout/complete or /product/*/view"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-neutral-500 mt-1">
                      {t("Use * to match a single path segment. Use ** to match across segments.")}
                    </div>
                  </FormItem>
                )}
              />
            )}

            {goalType === "event" && (
              <FormField
                control={form.control}
                name="config.eventName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Event Name")}</FormLabel>
                    <FormControl>
                      <InputWithSuggestions
                        suggestions={eventSuggestions}
                        placeholder={t("e.g., sign_up_completed")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isAutocaptureTargetType(goalType) && (
              <FormField
                control={form.control}
                name="config.valuePattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{autocaptureFieldMeta[goalType].label}</FormLabel>
                    <FormControl>
                      <InputWithSuggestions
                        suggestions={autocaptureSuggestions}
                        placeholder={autocaptureFieldMeta[goalType].placeholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-neutral-500 mt-1">
                      {autocaptureFieldMeta[goalType].help}{" "}
                      {t("Use * to match within a segment. Use ** to match anything.")}
                    </div>
                  </FormItem>
                )}
              />
            )}

            <PropertyFilterSection
              id={propertyFilterMeta[goalType].id}
              toggleLabel={propertyFilterMeta[goalType].toggleLabel}
              keyPlaceholder={propertyFilterMeta[goalType].keyPlaceholder}
              valuePlaceholder={propertyFilterMeta[goalType].valuePlaceholder}
              addButtonLabel={propertyFilterMeta[goalType].addButtonLabel}
              useProperties={useProperties}
              setUseProperties={setUseProperties}
              propertyFilters={propertyFilters}
              setPropertyFilters={setPropertyFilters}
            />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={onClose}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={createGoal.isPending || updateGoal.isPending} variant="success">
                {createGoal.isPending || updateGoal.isPending ? t("Saving...") : isEditMode ? t("Update") : t("Create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
