"use client";

import { useExtracted } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";

import { useUpdateUserTraits } from "@/api/analytics/hooks/useUpdateUserTraits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface EditTraitsDialogProps {
  userId: string;
  traits: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TraitRow {
  key: string;
  value: string;
}

type EditorMode = "fields" | "json";

// Traits can hold non-string values (numbers, booleans, objects); edit them as
// their JSON representation so they round-trip.
function serializeTraitValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function parseTraitValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

function traitsToRows(traits: Record<string, unknown> | null): TraitRow[] {
  return Object.entries(traits ?? {}).map(([key, value]) => ({ key, value: serializeTraitValue(value) }));
}

// Untouched rows keep the baseline value (and its type); edited ones are parsed
function rowsToTraits(rows: TraitRow[], baseline: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    result[key] =
      key in baseline && serializeTraitValue(baseline[key]) === row.value ? baseline[key] : parseTraitValue(row.value);
  }
  return result;
}

export function EditTraitsDialog({ userId, traits, open, onOpenChange }: EditTraitsDialogProps) {
  const t = useExtracted();
  const updateTraits = useUpdateUserTraits();
  const [rows, setRows] = useState<TraitRow[]>([]);
  // Reference for type preservation of untouched values; starts as the stored
  // traits and is replaced by the parsed object after a JSON -> fields switch
  const [baseline, setBaseline] = useState<Record<string, unknown>>({});
  const [mode, setMode] = useState<EditorMode>("fields");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState(false);

  // `open` is controlled by the parent, so onOpenChange never fires for the
  // opening transition — sync state from the current traits whenever it opens.
  // Deliberately not keyed on `traits`: a background refetch while the dialog
  // is open must not clobber in-progress edits.
  useEffect(() => {
    if (open) {
      const initial = traitsToRows(traits);
      setRows(initial.length > 0 ? initial : [{ key: "", value: "" }]);
      setBaseline(traits ?? {});
      setMode("fields");
      setJsonError(false);
    }
  }, [open]);

  const updateRow = (index: number, field: keyof TraitRow, value: string) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const parseJsonTraits = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const switchMode = (next: EditorMode) => {
    if (next === mode) return;
    if (next === "json") {
      setJsonText(JSON.stringify(rowsToTraits(rows, baseline), null, 2));
      setJsonError(false);
      setMode("json");
    } else {
      const parsed = parseJsonTraits();
      if (!parsed) {
        setJsonError(true);
        return;
      }
      const nextRows = traitsToRows(parsed);
      setRows(nextRows.length > 0 ? nextRows : [{ key: "", value: "" }]);
      setBaseline(parsed);
      setJsonError(false);
      setMode("fields");
    }
  };

  const handleSave = async () => {
    let result: Record<string, unknown>;
    if (mode === "json") {
      const parsed = parseJsonTraits();
      if (!parsed) {
        setJsonError(true);
        return;
      }
      result = parsed;
    } else {
      result = rowsToTraits(rows, baseline);
    }

    try {
      await updateTraits.mutateAsync({ userId, traits: result });
      toast.success(t("Traits updated"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to update traits"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Edit Traits")}</DialogTitle>
          <DialogDescription>{t("Add, edit, or remove attributes attached to this user.")}</DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={value => switchMode(value as EditorMode)}>
          <TabsList className="h-7 p-0.5">
            <TabsTrigger value="fields" className="h-6 px-2 py-0 text-xs">
              {t("Fields")}
            </TabsTrigger>
            <TabsTrigger value="json" className="h-6 px-2 py-0 text-xs">
              JSON
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "fields" ? (
          // Negative margin + matching padding keeps the inputs' focus rings
          // from being clipped by the scroll container
          <div className="space-y-2 max-h-[50vh] overflow-y-auto -m-1 p-1">
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={row.key}
                  onChange={e => updateRow(index, "key", e.target.value)}
                  placeholder={t("Key")}
                  aria-label={t("Key")}
                  className="flex-1"
                />
                <Input
                  value={row.value}
                  onChange={e => updateRow(index, "value", e.target.value)}
                  placeholder={t("Value")}
                  aria-label={t("Value")}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="smIcon"
                  onClick={() => setRows(prev => prev.filter((_, i) => i !== index))}
                  aria-label={t("Remove trait")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows(prev => [...prev, { key: "", value: "" }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("Add trait")}
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Textarea
              value={jsonText}
              onChange={e => {
                setJsonText(e.target.value);
                setJsonError(false);
              }}
              rows={12}
              spellCheck={false}
              aria-label="JSON"
              aria-invalid={jsonError}
              className={`font-mono text-xs max-h-[50vh] ${jsonError ? "border-red-500 dark:border-red-400" : ""}`}
            />
            {jsonError && <p className="text-xs text-red-500 dark:text-red-400">{t("Enter a valid JSON object")}</p>}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="success" onClick={handleSave} disabled={updateTraits.isPending}>
            {updateTraits.isPending ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
