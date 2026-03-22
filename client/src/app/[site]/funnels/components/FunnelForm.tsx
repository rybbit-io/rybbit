import { useExtracted } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions, SuggestionOption } from "@/components/ui/input-with-suggestions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Reorder } from "framer-motion";
import { ChevronDown, ChevronUp, GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FunnelResponse, FunnelStep } from "../../../../api/analytics/endpoints";
import { useMetric } from "../../../../api/analytics/hooks/useGetMetric";
import { ThreeDotLoader } from "../../../../components/Loaders";
import { Label } from "../../../../components/ui/label";
import { Switch } from "../../../../components/ui/switch";
import { Funnel } from "./Funnel";

const URL_PATTERN = /^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/)/i;

interface FunnelFormProps {
  name: string;
  setName: (name: string) => void;
  steps: FunnelStep[];
  setSteps: (steps: FunnelStep[]) => void;
  onSave: () => void;
  onCancel: () => void;
  onQuery: () => void;
  saveButtonText: string;
  isSaving: boolean;
  isError: boolean;
  isPending: boolean;
  error: unknown;
  saveError: unknown;
  funnelData?: FunnelResponse[];
}

export function FunnelForm({
  name,
  setName,
  steps,
  setSteps,
  onSave,
  onCancel,
  onQuery,
  saveButtonText,
  isSaving,
  isError,
  isPending,
  error,
  saveError,
  funnelData,
}: FunnelFormProps) {
  const t = useExtracted();
  // State to track which event steps have property filtering enabled
  const [useProperties, setUseProperties] = useState<boolean[]>(() =>
    steps.map(
      step => !!(step.propertyFilters?.length || (step.eventPropertyKey && step.eventPropertyValue !== undefined))
    )
  );

  // State for managing multiple property filters per step (store as strings in UI)
  const [stepPropertyFilters, setStepPropertyFilters] = useState<Array<Array<{ key: string; value: string }>>>(() =>
    steps.map(
      step =>
        step.propertyFilters?.map(f => ({ key: f.key, value: String(f.value) })) ||
        (step.eventPropertyKey && step.eventPropertyValue !== undefined
          ? [{ key: step.eventPropertyKey, value: String(step.eventPropertyValue) }]
          : [{ key: "", value: "" }])
    )
  );

  // State to track which steps have advanced options expanded
  const [expandedSteps, setExpandedSteps] = useState<boolean[]>(() =>
    steps.map(
      step =>
        !!(
          step.hostname ||
          step.name ||
          step.propertyFilters?.length ||
          (step.eventPropertyKey && step.eventPropertyValue !== undefined)
        )
    )
  );

  // Unique IDs for each step (needed for drag-and-drop reordering)
  const [stepIds, setStepIds] = useState<string[]>(() => steps.map((_, i) => `step-${Date.now()}-${i}`));

  // Derive which page-type steps have URL values
  const stepUrlErrors = useMemo(
    () => steps.map(step => step.type === "page" && URL_PATTERN.test(step.value)),
    [steps]
  );
  const hasUrlErrors = stepUrlErrors.some(Boolean);

  // Fetch suggestions for paths, events, and hostnames
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

  const { data: hostnamesData } = useMetric({
    parameter: "hostname",
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

  const hostnameSuggestions: SuggestionOption[] =
    hostnamesData?.data?.map(item => ({
      value: item.value,
      label: item.value,
    })) || [];

  // Handle reordering steps via drag-and-drop
  const handleReorder = (newOrder: string[]) => {
    const newSteps = newOrder.map(id => steps[stepIds.indexOf(id)]);
    const newUseProperties = newOrder.map(id => useProperties[stepIds.indexOf(id)]);
    const newStepPropertyFilters = newOrder.map(id => stepPropertyFilters[stepIds.indexOf(id)]);
    const newExpandedSteps = newOrder.map(id => expandedSteps[stepIds.indexOf(id)]);

    setStepIds(newOrder);
    setSteps(newSteps);
    setUseProperties(newUseProperties);
    setStepPropertyFilters(newStepPropertyFilters);
    setExpandedSteps(newExpandedSteps);
  };

  // Handle adding a new step
  const addStep = () => {
    setSteps([...steps, { type: "page", value: "", name: "" }]);
    setUseProperties([...useProperties, false]);
    setStepPropertyFilters([...stepPropertyFilters, [{ key: "", value: "" }]]);
    setExpandedSteps([...expandedSteps, false]);
    setStepIds([...stepIds, `step-${Date.now()}`]);
  };

  // Handle removing a step
  const removeStep = (index: number) => {
    if (steps.length <= 2) return; // Maintain at least 2 steps
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);

    const newUseProperties = [...useProperties];
    newUseProperties.splice(index, 1);
    setUseProperties(newUseProperties);

    const newStepPropertyFilters = [...stepPropertyFilters];
    newStepPropertyFilters.splice(index, 1);
    setStepPropertyFilters(newStepPropertyFilters);

    const newExpandedSteps = [...expandedSteps];
    newExpandedSteps.splice(index, 1);
    setExpandedSteps(newExpandedSteps);

    const newStepIds = [...stepIds];
    newStepIds.splice(index, 1);
    setStepIds(newStepIds);
  };

  // Handle step input changes
  const updateStep = (index: number, field: keyof FunnelStep, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  // Handle step type changes
  const updateStepType = (index: number, type: "page" | "event") => {
    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      type,
    };
    setSteps(newSteps);
  };

  // Handle property filtering toggle
  const togglePropertyFiltering = (index: number, enabled: boolean) => {
    const newUseProperties = [...useProperties];
    newUseProperties[index] = enabled;
    setUseProperties(newUseProperties);

    // Clear property fields if disabling
    if (!enabled) {
      const newSteps = [...steps];
      newSteps[index] = {
        ...newSteps[index],
        eventPropertyKey: undefined,
        eventPropertyValue: undefined,
        propertyFilters: undefined,
      };
      setSteps(newSteps);
    }
  };

  let funnelArea = null;
  if (funnelData && funnelData.length) {
    funnelArea = <Funnel data={funnelData} isError={isError} error={error} isPending={isPending} steps={steps} />;
  }

  if (steps.some(step => !step.value)) {
    funnelArea = (
      <div className="flex items-center justify-center rounded-lg h-full">
        <div className="text-center p-6">
          <div className="text-lg font-medium mb-2">{t("Funnel Preview")}</div>
          <p className="text-sm text-neutral-500">{t("Configure your funnel steps")}</p>
        </div>
      </div>
    );
  }

  if (isPending) {
    funnelArea = (
      <div className="flex items-center justify-center rounded-lg h-full">
        <ThreeDotLoader />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[500px_3fr] gap-6">
        {/* Left side: Funnel configuration form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{t("Funnel Name")}</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("Enter funnel name")} />
          </div>

          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <Reorder.Group axis="y" values={stepIds} onReorder={handleReorder} className="list-none">
              {stepIds.map((id, index) => {
                const step = steps[index];
                return (
                  <Reorder.Item
                    key={id}
                    value={id}
                    transition={{ duration: 0 }}
                    dragTransition={{ bounceStiffness: 100000, bounceDamping: 100000 }}
                    className={cn(
                      "flex flex-col space-y-2 border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900",
                      index === 0 && "rounded-t-lg",
                      index === steps.length - 1 && "rounded-b-lg",
                      index !== 0 && "-mt-px"
                    )}
                  >
                    {/* Top row: Step number, type, value, expand toggle, delete */}
                    <div className="flex items-center gap-2">
                      <GripVertical className="shrink-0 h-4 w-4 cursor-grab active:cursor-grabbing text-neutral-400" />
                      <div className="shrink-0 w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                      <Select
                        value={step.type}
                        onValueChange={value => updateStepType(index, value as "page" | "event")}
                      >
                        <SelectTrigger className="min-w-[80px] max-w-[80px] border-neutral-300 dark:border-neutral-700">
                          <SelectValue placeholder={t("Type")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="page">{t("Path")}</SelectItem>
                          <SelectItem value="event">{t("Event")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex flex-col">
                        <InputWithSuggestions
                          suggestions={step.type === "page" ? pathSuggestions : eventSuggestions}
                          placeholder={step.type === "page" ? t("Path (e.g. /pricing)") : t("Event name")}
                          value={step.value}
                          className={cn(
                            "border-neutral-300 dark:border-neutral-700 w-[260px]",
                            stepUrlErrors[index] && "border-red-500 dark:border-red-500"
                          )}
                          onChange={e => updateStep(index, "value", e.target.value)}
                        />
                        {stepUrlErrors[index] && (
                          <p className="text-xs text-red-500 mt-1">
                            {t("Enter a path (e.g., /checkout), not a full URL.")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="smIcon"
                          onClick={() => {
                            const newExpandedSteps = [...expandedSteps];
                            newExpandedSteps[index] = !newExpandedSteps[index];
                            setExpandedSteps(newExpandedSteps);
                          }}
                          title={expandedSteps[index] ? t("Hide advanced options") : t("Show advanced options")}
                        >
                          {expandedSteps[index] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="smIcon"
                          onClick={() => removeStep(index)}
                          disabled={steps.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible advanced options */}
                    {expandedSteps[index] && (
                      <div className="ml-14 space-y-2 pt-2">
                        <div className="flex gap-2">
                          <InputWithSuggestions
                            suggestions={hostnameSuggestions}
                            placeholder={t("Hostname (optional)")}
                            value={step.hostname || ""}
                            className="border-neutral-300 dark:border-neutral-700 w-40"
                            onChange={e => updateStep(index, "hostname", e.target.value)}
                          />
                          <Input
                            placeholder={t("Label (optional)")}
                            className="border-neutral-300 dark:border-neutral-700 grow"
                            value={step.name || ""}
                            onChange={e => updateStep(index, "name", e.target.value)}
                          />
                        </div>
                        {/* Property filtering for both page and event steps */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={useProperties[index]}
                              onCheckedChange={checked => togglePropertyFiltering(index, checked)}
                              id={`use-properties-${index}`}
                            />
                            <Label htmlFor={`use-properties-${index}`}>
                              {step.type === "page" ? t("Filter by URL parameter") : t("Filter by event property")}
                            </Label>
                          </div>

                          {useProperties[index] && (
                            <div className="space-y-3">
                              {stepPropertyFilters[index]?.map((filter, filterIndex) => (
                                <div key={filterIndex} className="flex gap-2 items-start">
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                    <Input
                                      placeholder={step.type === "page" ? "e.g., utm_source" : "e.g., plan_type"}
                                      className="border-neutral-300 dark:border-neutral-700"
                                      value={filter.key}
                                      onChange={e => {
                                        // Create immutable copies for nested state
                                        const newStepPropertyFilters = [...stepPropertyFilters];
                                        const stepFilters = [...newStepPropertyFilters[index]];
                                        const updatedFilter = { ...stepFilters[filterIndex], key: e.target.value };
                                        stepFilters[filterIndex] = updatedFilter;
                                        newStepPropertyFilters[index] = stepFilters;
                                        setStepPropertyFilters(newStepPropertyFilters);

                                        // Update the step with propertyFilters immutably
                                        const newSteps = [...steps];
                                        newSteps[index] = { ...newSteps[index], propertyFilters: stepFilters };
                                        setSteps(newSteps);
                                      }}
                                    />
                                    <Input
                                      placeholder={step.type === "page" ? "e.g., adwords" : "e.g., premium"}
                                      className="border-neutral-300 dark:border-neutral-700"
                                      value={filter.value}
                                      onChange={e => {
                                        // Create immutable copies for nested state
                                        const newStepPropertyFilters = [...stepPropertyFilters];
                                        const stepFilters = [...newStepPropertyFilters[index]];
                                        const updatedFilter = { ...stepFilters[filterIndex], value: e.target.value };
                                        stepFilters[filterIndex] = updatedFilter;
                                        newStepPropertyFilters[index] = stepFilters;
                                        setStepPropertyFilters(newStepPropertyFilters);

                                        // Update the step with propertyFilters immutably
                                        const newSteps = [...steps];
                                        newSteps[index] = { ...newSteps[index], propertyFilters: stepFilters };
                                        setSteps(newSteps);
                                      }}
                                    />
                                  </div>
                                  {stepPropertyFilters[index].length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        // Create immutable copies for nested state
                                        const newStepPropertyFilters = [...stepPropertyFilters];
                                        const stepFilters = newStepPropertyFilters[index].filter(
                                          (_, i) => i !== filterIndex
                                        );
                                        newStepPropertyFilters[index] = stepFilters;
                                        setStepPropertyFilters(newStepPropertyFilters);

                                        // Update the step with propertyFilters immutably
                                        const newSteps = [...steps];
                                        newSteps[index] = { ...newSteps[index], propertyFilters: stepFilters };
                                        setSteps(newSteps);
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
                                onClick={() => {
                                  const newStepPropertyFilters = [...stepPropertyFilters];
                                  newStepPropertyFilters[index] = [
                                    ...newStepPropertyFilters[index],
                                    { key: "", value: "" },
                                  ];
                                  setStepPropertyFilters(newStepPropertyFilters);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                {step.type === "page" ? t("New Parameter") : t("New Property")}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
            <Button onClick={addStep} size="sm" className="mt-2">
              <Plus className="h-4 w-4" /> {t("Add Step")}
            </Button>
          </div>
        </div>
        {funnelArea}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-neutral-600 dark:text-neutral-500">
          {t("Use * to match a single path segment (e.g., /blog/*) or ** to match multiple segments (e.g., /docs/**/intro)")}
        </span>
        <div className="text-sm text-red-500">
          {(() => {
            if (isError) {
              return error instanceof Error ? error.message : t("An error occurred");
            } else if (saveError) {
              return saveError instanceof Error ? saveError.message : t("An error occurred while saving");
            }
            return null;
          })()}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t("Cancel")}
          </Button>
          <Button onClick={onSave} disabled={isSaving || hasUrlErrors} variant="success">
            <Save className="h-4 w-4" />
            {isSaving ? t("Saving...") : saveButtonText}
          </Button>
        </div>
      </div>
    </>
  );
}
