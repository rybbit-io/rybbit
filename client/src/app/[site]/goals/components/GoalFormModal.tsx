"use client";

import { useExtracted } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateGoal } from "../../../../api/analytics/hooks/goals/useCreateGoal";
import { Goal } from "../../../../api/analytics/endpoints";
import { useUpdateGoal } from "../../../../api/analytics/hooks/goals/useUpdateGoal";
import { useMetric } from "../../../../api/analytics/hooks/useGetMetric";
import { EventIcon, PageviewIcon } from "../../../../components/EventIcons";
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
import { Switch } from "../../../../components/ui/switch";
import { cn } from "../../../../lib/utils";
import { Plus, X } from "lucide-react";

// Define form schema
const formSchema = z
  .object({
    name: z.string().optional(),
    goalType: z.enum(["path", "event"]),
    config: z.object({
      pathPattern: z.string().optional(),
      eventName: z.string().optional(),
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
      return false;
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
      message:
        "Enter a path (e.g., /checkout), not a full URL. The domain is already determined by your site.",
      path: ["config", "pathPattern"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

interface GoalFormModalProps {
  siteId: number;
  goal?: Goal; // Optional goal for editing mode
  trigger: React.ReactNode;
  isCloneMode?: boolean; // Optional clone mode flag
}

export default function GoalFormModal({ siteId, goal, trigger, isCloneMode = false }: GoalFormModalProps) {
  const t = useExtracted();
  const [isOpen, setIsOpen] = useState(false);

  // Initialize useProperties based on either new propertyFilters or legacy properties
  const hasProperties = !!(
    goal?.config.propertyFilters?.length ||
    (goal?.config.eventPropertyKey && goal?.config.eventPropertyValue !== undefined)
  );
  const [useProperties, setUseProperties] = useState(hasProperties);

  // State for managing multiple property filters (store as strings in UI)
  const [propertyFilters, setPropertyFilters] = useState<Array<{ key: string; value: string }>>(
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
              eventPropertyKey: "",
              eventPropertyValue: "",
            },
          },
  });

  const goalType = form.watch("goalType");

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      // Clean up the config based on goal type
      if (values.goalType === "path") {
        values.config.eventName = undefined;

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
      } else if (values.goalType === "event") {
        values.config.pathPattern = undefined;

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
      }

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
      <DialogTrigger asChild>
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      </DialogTrigger>
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
                  {isEditMode ? (
                    <div className="flex items-center gap-2 mt-1">
                      {field.value === "path" ? (
                        <div className="flex items-center gap-1 bg-neutral-800/50 py-2 px-3 rounded">
                          <PageviewIcon />
                          <span>{t("Page Goal")}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-neutral-800/50 py-2 px-3 rounded">
                          <EventIcon />
                          <span>{t("Event Goal")}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <FormControl>
                      <div className="flex gap-3 mt-1">
                        <Button
                          type="button"
                          variant={field.value === "path" ? "default" : "outline"}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2",
                            field.value === "path" && "border-blue-500"
                          )}
                          onClick={() => field.onChange("path")}
                        >
                          <PageviewIcon />
                          <span>{t("Page Goal")}</span>
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === "event" ? "default" : "outline"}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2",
                            field.value === "event" && "border-amber-500"
                          )}
                          onClick={() => field.onChange("event")}
                        >
                          <EventIcon />
                          <span>{t("Event Goal")}</span>
                        </Button>
                      </div>
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {goalType === "path" && (
              <>
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

                <div className="mt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch id="use-properties" checked={useProperties} onCheckedChange={setUseProperties} />
                    <Label htmlFor="use-properties">{t("Match specific URL parameters")}</Label>
                  </div>

                  {useProperties && (
                    <div className="space-y-3">
                      {propertyFilters.map((filter, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <Input
                              placeholder="e.g., utm_source"
                              value={filter.key}
                              onChange={e => {
                                const newFilters = [...propertyFilters];
                                newFilters[index].key = e.target.value;
                                setPropertyFilters(newFilters);
                              }}
                            />
                            <Input
                              placeholder="e.g., adwords"
                              value={filter.value}
                              onChange={e => {
                                const newFilters = [...propertyFilters];
                                newFilters[index].value = e.target.value;
                                setPropertyFilters(newFilters);
                              }}
                            />
                          </div>
                          {propertyFilters.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newFilters = propertyFilters.filter((_, i) => i !== index);
                                setPropertyFilters(newFilters);
                              }}
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
                        {t("Add Another Parameter")}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {goalType === "event" && (
              <>
                <FormField
                  control={form.control}
                  name="config.eventName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Event Name")}</FormLabel>
                      <FormControl>
                        <InputWithSuggestions
                          suggestions={eventSuggestions}
                          placeholder="e.g., sign_up_completed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch id="use-properties-event" checked={useProperties} onCheckedChange={setUseProperties} />
                    <Label htmlFor="use-properties-event">{t("Match specific event properties")}</Label>
                  </div>

                  {useProperties && (
                    <div className="space-y-3">
                      {propertyFilters.map((filter, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <Input
                              placeholder="e.g., plan_type"
                              value={filter.key}
                              onChange={e => {
                                const newFilters = [...propertyFilters];
                                newFilters[index].key = e.target.value;
                                setPropertyFilters(newFilters);
                              }}
                            />
                            <Input
                              placeholder="e.g., premium"
                              value={filter.value}
                              onChange={e => {
                                const newFilters = [...propertyFilters];
                                newFilters[index].value = e.target.value;
                                setPropertyFilters(newFilters);
                              }}
                            />
                          </div>
                          {propertyFilters.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newFilters = propertyFilters.filter((_, i) => i !== index);
                                setPropertyFilters(newFilters);
                              }}
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
                        {t("Add Another Property")}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

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
