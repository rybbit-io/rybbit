import { useExtracted } from "next-intl";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions, SuggestionOption } from "@/components/ui/input-with-suggestions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Reorder, useDragControls } from "framer-motion";
import round from "lodash/round";
import { ChevronDown, ChevronUp, Funnel as FunnelIcon, GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  FunnelResponse,
  FunnelStep,
  FunnelStepType,
  hasIncompleteSteps,
} from "../../../../api/analytics/endpoints";
import { useAutocaptureValuesByType } from "../../../../api/analytics/hooks/events/useAutocaptureValues";
import { useMetric } from "../../../../api/analytics/hooks/useGetMetric";
import { ThreeDotLoader } from "../../../../components/Loaders";
import { Label } from "../../../../components/ui/label";
import { Switch } from "../../../../components/ui/switch";
import { EventTypeIcon } from "../../../../components/EventIcons";
import { EventTrackingNotice } from "../../../../components/EventTrackingNotice";
import { isAutocaptureTargetType, targetTypeToEventType } from "../../../../lib/events";
import { Funnel } from "./Funnel";

const URL_PATTERN = /^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/)/i;

type PropertyFilterDraft = { key: string; value: string };

interface FunnelFormProps {
  title: string;
  name: string;
  setName: (name: string) => void;
  steps: FunnelStep[];
  setSteps: (steps: FunnelStep[]) => void;
  onSave: () => void;
  onCancel: () => void;
  saveButtonText: string;
  isSaving: boolean;
  isError: boolean;
  isPending: boolean;
  error: unknown;
  funnelData?: FunnelResponse[];
}

interface StepCardProps {
  id: string;
  index: number;
  step: FunnelStep;
  stepTypeLabels: Record<FunnelStepType, string>;
  stepValuePlaceholders: Record<FunnelStepType, string>;
  valueSuggestions: SuggestionOption[];
  hostnameSuggestions: SuggestionOption[];
  urlError: boolean;
  expanded: boolean;
  usePropertyFilters: boolean;
  propertyFilters: PropertyFilterDraft[];
  canRemove: boolean;
  onTypeChange: (type: FunnelStepType) => void;
  onFieldChange: (field: keyof FunnelStep, value: string) => void;
  onToggleExpanded: () => void;
  onTogglePropertyFilters: (enabled: boolean) => void;
  onPropertyFiltersChange: (filters: PropertyFilterDraft[], syncToStep: boolean) => void;
  onRemove: () => void;
}

function StepCard({
  id,
  index,
  step,
  stepTypeLabels,
  stepValuePlaceholders,
  valueSuggestions,
  hostnameSuggestions,
  urlError,
  expanded,
  usePropertyFilters,
  propertyFilters,
  canRemove,
  onTypeChange,
  onFieldChange,
  onToggleExpanded,
  onTogglePropertyFilters,
  onPropertyFiltersChange,
  onRemove,
}: StepCardProps) {
  const t = useExtracted();
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={dragControls}
      transition={{ duration: 0 }}
      dragTransition={{ bounceStiffness: 100000, bounceDamping: 100000 }}
      className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-center gap-2">
        <GripVertical
          aria-hidden
          className="h-4 w-4 shrink-0 cursor-grab touch-none text-neutral-400 active:cursor-grabbing"
          onPointerDown={e => {
            e.preventDefault();
            dragControls.start(e);
          }}
        />
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs dark:bg-neutral-800">
          {index + 1}
        </div>
        <Select value={step.type} onValueChange={value => onTypeChange(value as FunnelStepType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("Type")} />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(stepTypeLabels) as FunnelStepType[]).map(type => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">
                  <EventTypeIcon type={targetTypeToEventType(type)} tooltip={false} className="h-3.5 w-3.5" />
                  {stepTypeLabels[type]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="smIcon"
          onClick={onToggleExpanded}
          title={expanded ? t("Hide advanced options") : t("Show advanced options")}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="smIcon" onClick={onRemove} disabled={!canRemove} title={t("Remove")}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2">
        <InputWithSuggestions
          suggestions={valueSuggestions}
          placeholder={stepValuePlaceholders[step.type]}
          value={step.value}
          className={cn("w-full", urlError && "border-red-500 dark:border-red-500")}
          onChange={e => onFieldChange("value", e.target.value)}
        />
        {urlError && <p className="mt-1 text-xs text-red-500">{t("Enter a path (e.g., /checkout), not a full URL.")}</p>}
        <EventTrackingNotice type={step.type} className="mt-2" />
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <div className="grid grid-cols-2 gap-2">
            <InputWithSuggestions
              suggestions={hostnameSuggestions}
              placeholder={t("Hostname (optional)")}
              value={step.hostname || ""}
              className="w-full"
              onChange={e => onFieldChange("hostname", e.target.value)}
            />
            <Input
              placeholder={t("Label (optional)")}
              value={step.name || ""}
              onChange={e => onFieldChange("name", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={usePropertyFilters}
              onCheckedChange={checked => onTogglePropertyFilters(checked)}
              id={`use-properties-${index}`}
            />
            <Label htmlFor={`use-properties-${index}`}>
              {step.type === "page" ? t("Filter by URL parameter") : t("Filter by event property")}
            </Label>
          </div>

          {usePropertyFilters && (
            <div className="space-y-2">
              {propertyFilters.map((filter, filterIndex) => (
                <div key={filterIndex} className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <Input
                      placeholder={step.type === "page" ? "e.g., utm_source" : "e.g., plan_type"}
                      value={filter.key}
                      onChange={e => {
                        const rows = [...propertyFilters];
                        rows[filterIndex] = { ...rows[filterIndex], key: e.target.value };
                        onPropertyFiltersChange(rows, true);
                      }}
                    />
                    <Input
                      placeholder={step.type === "page" ? "e.g., adwords" : "e.g., premium"}
                      value={filter.value}
                      onChange={e => {
                        const rows = [...propertyFilters];
                        rows[filterIndex] = { ...rows[filterIndex], value: e.target.value };
                        onPropertyFiltersChange(rows, true);
                      }}
                    />
                  </div>
                  {propertyFilters.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="smIcon"
                      title={t("Remove")}
                      onClick={() => {
                        onPropertyFiltersChange(
                          propertyFilters.filter((_, i) => i !== filterIndex),
                          true
                        );
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
                onClick={() => onPropertyFiltersChange([...propertyFilters, { key: "", value: "" }], false)}
              >
                <Plus className="h-4 w-4" />
                {step.type === "page" ? t("New Parameter") : t("New Property")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Reorder.Item>
  );
}

export function FunnelForm({
  title,
  name,
  setName,
  steps,
  setSteps,
  onSave,
  onCancel,
  saveButtonText,
  isSaving,
  isError,
  isPending,
  error,
  funnelData,
}: FunnelFormProps) {
  const t = useExtracted();

  const stepTypeLabels: Record<FunnelStepType, string> = {
    page: t("Path"),
    event: t("Event"),
    outbound: t("Outbound"),
    button_click: t("Button"),
    form_submit: t("Form"),
    copy: t("Copy"),
  };

  const stepValuePlaceholders: Record<FunnelStepType, string> = {
    page: t("Path (e.g. /pricing)"),
    event: t("Event name"),
    outbound: t("URL pattern (optional)"),
    button_click: t("Button text (optional)"),
    form_submit: t("Form name or ID (optional)"),
    copy: t("Copied text (optional)"),
  };

  // State to track which event steps have property filtering enabled
  const [useProperties, setUseProperties] = useState<boolean[]>(() =>
    steps.map(
      step => !!(step.propertyFilters?.length || (step.eventPropertyKey && step.eventPropertyValue !== undefined))
    )
  );

  // State for managing multiple property filters per step (store as strings in UI)
  const [stepPropertyFilters, setStepPropertyFilters] = useState<PropertyFilterDraft[][]>(() =>
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

  const hasIncomplete = hasIncompleteSteps(steps);
  const canSave = !!name.trim() && !hasIncomplete && !hasUrlErrors && !isSaving;

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
  const pathSuggestions: SuggestionOption[] = useMemo(
    () => pathsData?.data?.map(item => ({ value: item.value, label: item.value, count: item.count })) || [],
    [pathsData]
  );

  const eventSuggestions: SuggestionOption[] = useMemo(
    () => eventsData?.data?.map(item => ({ value: item.value, label: item.value, count: item.count })) || [],
    [eventsData]
  );

  const hostnameSuggestions: SuggestionOption[] = useMemo(
    () => hostnamesData?.data?.map(item => ({ value: item.value, label: item.value, count: item.count })) || [],
    [hostnamesData]
  );

  // Suggestions for autocapture step values, fetched only for types in use
  const enabledAutocaptureTypes = useMemo(
    () => new Set(steps.map(step => step.type).filter(isAutocaptureTargetType)),
    [steps]
  );
  const autocaptureValuesByType = useAutocaptureValuesByType(enabledAutocaptureTypes);

  const stepSuggestions: Record<FunnelStepType, SuggestionOption[]> = useMemo(() => {
    const toSuggestions = (values?: { value: string; count: number }[]): SuggestionOption[] =>
      values?.map(item => ({ value: item.value, label: item.value, count: item.count })) || [];

    return {
      page: pathSuggestions,
      event: eventSuggestions,
      outbound: toSuggestions(autocaptureValuesByType.outbound),
      button_click: toSuggestions(autocaptureValuesByType.button_click),
      form_submit: toSuggestions(autocaptureValuesByType.form_submit),
      copy: toSuggestions(autocaptureValuesByType.copy),
    };
  }, [pathSuggestions, eventSuggestions, autocaptureValuesByType]);

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
  const updateStepType = (index: number, type: FunnelStepType) => {
    // Property filters are interpreted differently per step type (URL params vs.
    // event props), so clear them instead of silently reinterpreting them under
    // the new type's semantics.
    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      type,
      eventPropertyKey: undefined,
      eventPropertyValue: undefined,
      propertyFilters: undefined,
    };
    setSteps(newSteps);

    const newUseProperties = [...useProperties];
    newUseProperties[index] = false;
    setUseProperties(newUseProperties);

    const newStepPropertyFilters = [...stepPropertyFilters];
    newStepPropertyFilters[index] = [{ key: "", value: "" }];
    setStepPropertyFilters(newStepPropertyFilters);
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

  // Update a step's property-filter draft rows; syncToStep is false when adding
  // an empty row so incomplete filters don't reach the preview query
  const updateFilterRows = (index: number, rows: PropertyFilterDraft[], syncToStep: boolean) => {
    const newStepPropertyFilters = [...stepPropertyFilters];
    newStepPropertyFilters[index] = rows;
    setStepPropertyFilters(newStepPropertyFilters);

    if (syncToStep) {
      const newSteps = [...steps];
      newSteps[index] = { ...newSteps[index], propertyFilters: rows };
      setSteps(newSteps);
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpandedSteps = [...expandedSteps];
    newExpandedSteps[index] = !newExpandedSteps[index];
    setExpandedSteps(newExpandedSteps);
  };

  const overallConversion =
    !hasIncomplete && funnelData?.length ? round(funnelData[funnelData.length - 1].conversion_rate, 2) : null;

  let funnelArea = null;
  if (funnelData && funnelData.length) {
    funnelArea = <Funnel data={funnelData} isError={isError} error={error} isPending={isPending} steps={steps} />;
  } else {
    funnelArea = (
      <div className="flex flex-1 items-center justify-center py-16">
        <ThreeDotLoader />
      </div>
    );
  }

  if (isError) {
    funnelArea = (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-red-500">
          {t("Error:")} {error instanceof Error ? error.message : t("Failed to analyze funnel")}
        </p>
      </div>
    );
  }

  if (isPending) {
    funnelArea = (
      <div className="flex flex-1 items-center justify-center py-16">
        <ThreeDotLoader />
      </div>
    );
  }

  if (hasIncomplete) {
    funnelArea = (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
        <FunnelIcon className="h-8 w-8 text-neutral-300 dark:text-neutral-700" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("Configure your funnel steps")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Header: title + actions */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-neutral-150 px-4 dark:border-neutral-850 md:px-6">
        <DialogTitle className="min-w-0 truncate text-base font-semibold tracking-tight">{title}</DialogTitle>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t("Cancel")}
          </Button>
          <Button onClick={onSave} disabled={!canSave} variant="success">
            <Save className="h-4 w-4" />
            {isSaving ? t("Saving...") : saveButtonText}
          </Button>
        </div>
      </div>

      {/* Body: builder pane + preview pane, independently scrolling on lg+ */}
      <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[440px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[500px_minmax(0,1fr)]">
        {/* Builder */}
        <div className="border-b border-neutral-150 dark:border-neutral-850 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="space-y-5 p-4 md:p-5">
            <div>
              <label htmlFor="funnel-name-input" className="mb-1.5 block text-sm font-medium">
                {t("Funnel Name")}
              </label>
              <Input
                id="funnel-name-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t("Enter funnel name")}
              />
            </div>

            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              <Reorder.Group axis="y" values={stepIds} onReorder={handleReorder} className="list-none space-y-2">
                {stepIds.map((id, index) => (
                  <StepCard
                    key={id}
                    id={id}
                    index={index}
                    step={steps[index]}
                    stepTypeLabels={stepTypeLabels}
                    stepValuePlaceholders={stepValuePlaceholders}
                    valueSuggestions={stepSuggestions[steps[index].type]}
                    hostnameSuggestions={hostnameSuggestions}
                    urlError={stepUrlErrors[index]}
                    expanded={expandedSteps[index]}
                    usePropertyFilters={useProperties[index]}
                    propertyFilters={stepPropertyFilters[index] || []}
                    canRemove={steps.length > 2}
                    onTypeChange={type => updateStepType(index, type)}
                    onFieldChange={(field, value) => updateStep(index, field, value)}
                    onToggleExpanded={() => toggleExpanded(index)}
                    onTogglePropertyFilters={enabled => togglePropertyFiltering(index, enabled)}
                    onPropertyFiltersChange={(rows, syncToStep) => updateFilterRows(index, rows, syncToStep)}
                    onRemove={() => removeStep(index)}
                  />
                ))}
              </Reorder.Group>
              <Button onClick={addStep} variant="outline" className="w-full">
                <Plus className="h-4 w-4" /> {t("Add Step")}
              </Button>
            </div>

            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t(
                "Use * to match a single path segment (e.g., /blog/*) or ** to match multiple segments (e.g., /docs/**/intro)"
              )}
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="flex min-h-[320px] flex-col lg:min-h-0 lg:overflow-y-auto">
          <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-neutral-150 bg-background px-4 dark:border-neutral-850 md:px-6">
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t("Funnel Preview")}</span>
            {overallConversion !== null && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold tabular-nums">{overallConversion}%</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{t("Overall conversion")}</span>
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col px-4 pb-4 md:px-6">{funnelArea}</div>
        </div>
      </div>
    </>
  );
}
