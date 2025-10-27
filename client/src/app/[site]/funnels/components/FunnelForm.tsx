import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions, SuggestionOption } from "@/components/ui/input-with-suggestions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { FunnelResponse, FunnelStep } from "../../../../api/analytics/funnels/useGetFunnel";
import { useSingleCol } from "../../../../api/analytics/useSingleCol";
import { ThreeDotLoader } from "../../../../components/Loaders";
import { Label } from "../../../../components/ui/label";
import { Switch } from "../../../../components/ui/switch";
import { Funnel } from "./Funnel";

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
  // State to track which event steps have property filtering enabled
  const [useProperties, setUseProperties] = useState<boolean[]>(() =>
    steps.map(step => !!step.eventPropertyKey && step.eventPropertyValue !== undefined)
  );

  // Fetch suggestions for paths, events, and hostnames
  const { data: pathsData } = useSingleCol({
    parameter: "pathname",
    limit: 1000,
    useFilters: false,
  });

  const { data: eventsData } = useSingleCol({
    parameter: "event_name",
    limit: 1000,
    useFilters: false,
  });

  const { data: hostnamesData } = useSingleCol({
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

  // Handle adding a new step
  const addStep = () => {
    setSteps([...steps, { type: "page", value: "", name: "" }]);
    setUseProperties([...useProperties, false]);
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
      // Clear property fields if switching from event to page
      ...(type === "page" ? { eventPropertyKey: undefined, eventPropertyValue: undefined } : {}),
    };
    setSteps(newSteps);

    // Disable property filtering if switching to page type
    if (type === "page" && useProperties[index]) {
      const newUseProperties = [...useProperties];
      newUseProperties[index] = false;
      setUseProperties(newUseProperties);
    }
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
      <div className="flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 rounded-lg h-full">
        <div className="text-center p-6">
          <div className="text-lg font-medium mb-2">Funnel Preview</div>
          <p className="text-sm text-neutral-500">
            Configure your funnel steps and click "Query Funnel" to preview results
          </p>
        </div>
      </div>
    );
  }

  if (isPending) {
    funnelArea = (
      <div className="flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 rounded-lg h-full">
        <ThreeDotLoader />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[600px_3fr] gap-6">
        {/* Left side: Funnel configuration form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Funnel Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter funnel name" />
          </div>

          {/* Funnel Steps in a boxed container */}
          <Card className="border border-neutral-200 dark:border-neutral-800">
            <CardHeader className="p-3 flex flex-row justify-between items-center">
              <CardTitle className="text-base">Funnel Steps</CardTitle>
              <Button onClick={addStep} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Step
              </Button>
            </CardHeader>
            <CardContent className="p-3 space-y-4 max-h-[calc(100vh-340px)] overflow-y-auto">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex flex-col space-y-2 border border-neutral-750 p-4 rounded-lg bg-neutral-850"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full border border-neutral-400 bg-neutral-750 flex items-center justify-center text-xs mt-1.5">
                      {index + 1}
                    </div>
                    <Select value={step.type} onValueChange={value => updateStepType(index, value as "page" | "event")}>
                      <SelectTrigger className="min-w-[80px] max-w-[80px] dark:border-neutral-700">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="page">Path</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex-grow space-y-2">
                      <div className="flex gap-2">
                        <InputWithSuggestions
                          suggestions={hostnameSuggestions}
                          placeholder="Hostname (optional)"
                          value={step.hostname || ""}
                          className="dark:border-neutral-700 w-30"
                          onChange={e => updateStep(index, "hostname", e.target.value)}
                        />
                        <InputWithSuggestions
                          suggestions={step.type === "page" ? pathSuggestions : eventSuggestions}
                          placeholder={step.type === "page" ? "Path (e.g. /pricing)" : "Event name"}
                          value={step.value}
                          className="dark:border-neutral-700 w-56"
                          onChange={e => updateStep(index, "value", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Label (optional)"
                          className="dark:border-neutral-700"
                          value={step.name || ""}
                          onChange={e => updateStep(index, "name", e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(index)}
                          disabled={steps.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Property filtering for event steps */}
                      {step.type === "event" && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={useProperties[index]}
                              onCheckedChange={checked => togglePropertyFiltering(index, checked)}
                              id={`use-properties-${index}`}
                            />
                            <Label htmlFor={`use-properties-${index}`}>Filter by event property</Label>
                          </div>

                          {useProperties[index] && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Input
                                placeholder="Property key"
                                className="dark:border-neutral-700"
                                value={step.eventPropertyKey || ""}
                                onChange={e => updateStep(index, "eventPropertyKey", e.target.value)}
                              />
                              <Input
                                placeholder="Property value"
                                className="dark:border-neutral-700"
                                value={step.eventPropertyValue !== undefined ? String(step.eventPropertyValue) : ""}
                                onChange={e => updateStep(index, "eventPropertyValue", e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        {funnelArea}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-neutral-500 ">
          Use * to match a single path segment (e.g., /blog/*) or ** to match multiple segments (e.g., /docs/**/intro)
        </span>
        <div className="text-sm text-red-500">
          {(() => {
            if (isError) {
              return error instanceof Error ? error.message : "An error occurred";
            } else if (saveError) {
              return saveError instanceof Error ? saveError.message : "An error occurred while saving";
            }
            return null;
          })()}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving} variant="success">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : saveButtonText}
          </Button>
        </div>
      </div>
    </>
  );
}
