"use client";

import { Minus, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PatternExclusionManagerProps {
  label: string;
  description: string;
  placeholder: string;
  addLabel: string;
  loadingLabel: string;
  maxLabel: string;
  values: string[] | undefined;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (values: string[]) => Promise<unknown>;
  disabled?: boolean;
  max?: number;
}

/**
 * Generic list editor for string-pattern exclusions (paths, hostnames, user agents).
 * Owns the unsaved-changes editing state; the parent wires up the fetch/update hooks.
 */
export function PatternExclusionManager({
  label,
  description,
  placeholder,
  addLabel,
  loadingLabel,
  maxLabel,
  values,
  isLoading,
  isSaving,
  onSave,
  disabled = false,
  max = 100,
}: PatternExclusionManagerProps) {
  const t = useExtracted();
  const [list, setList] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  React.useEffect(() => {
    if (values) {
      setList(values.length > 0 ? values : [""]);
      setHasUnsavedChanges(false);
    } else if (!isLoading) {
      setList([""]);
    }
  }, [values, isLoading]);

  const addField = () => {
    setList([...list, ""]);
    setHasUnsavedChanges(true);
  };

  const removeField = (index: number) => {
    if (list.length > 1) {
      setList(list.filter((_, i) => i !== index));
      setHasUnsavedChanges(true);
    }
  };

  const updateField = (index: number, value: string) => {
    const newList = [...list];
    newList[index] = value;
    setList(newList);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    const filtered = list.map(v => v.trim()).filter(v => v !== "");
    try {
      await onSave(filtered);
      setHasUnsavedChanges(false);
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleReset = () => {
    setList(values && values.length > 0 ? values : [""]);
    setHasUnsavedChanges(false);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">{loadingLabel}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-foreground block">{label}</Label>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="space-y-2">
        {list.map((value, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Input
              value={value}
              onChange={e => updateField(index, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
            />
            {list.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeField(index)}
                disabled={disabled}
                className="shrink-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          disabled={disabled || list.length >= max}
          className="flex items-center space-x-1"
        >
          <Plus className="h-4 w-4" />
          <span>{addLabel}</span>
        </Button>

        {list.length >= max && <span className="text-xs text-muted-foreground">{maxLabel}</span>}
      </div>

      {hasUnsavedChanges && (
        <div className="flex items-center space-x-2 pt-2">
          <Button onClick={handleSave} disabled={disabled || isSaving} size="sm">
            {isSaving ? t("Saving...") : t("Save Changes")}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={disabled || isSaving} size="sm">
            {t("Reset")}
          </Button>
        </div>
      )}
    </div>
  );
}
