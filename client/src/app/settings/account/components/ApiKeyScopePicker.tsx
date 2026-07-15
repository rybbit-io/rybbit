"use client";

import { SCOPE_DESCRIPTORS, SCOPE_MATRIX, type ScopeAction, type ScopeResource } from "@rybbit/shared";
import { useExtracted } from "next-intl";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Label } from "../../../../components/ui/label";

export type ScopeSelection = Partial<Record<ScopeResource, ScopeAction[]>>;

interface ApiKeyScopePickerProps {
  value: ScopeSelection;
  onChange: (next: ScopeSelection) => void;
}

// write implies read on the server, so selecting write keeps read on and
// locked — but only for resources that actually support read (ingest is
// write-only, and adding read there produces a combination the server rejects).
function toggleAction(
  current: ScopeAction[] | undefined,
  action: ScopeAction,
  checked: boolean,
  available: readonly ScopeAction[]
): ScopeAction[] {
  const set = new Set(current ?? []);
  if (checked) {
    set.add(action);
    if (action === "write" && available.includes("read")) set.add("read");
  } else {
    set.delete(action);
    if (action === "read") set.delete("write");
  }
  return (["read", "write"] as ScopeAction[]).filter(a => set.has(a));
}

export function ApiKeyScopePicker({ value, onChange }: ApiKeyScopePickerProps) {
  const t = useExtracted();

  const setResource = (resource: ScopeResource, actions: ScopeAction[]) => {
    const next = { ...value };
    if (actions.length > 0) {
      next[resource] = actions;
    } else {
      delete next[resource];
    }
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-neutral-500">
        <span>{t("Resource")}</span>
        <div className="flex gap-6 pr-1">
          <span className="w-10 text-center">{t("Read")}</span>
          <span className="w-10 text-center">{t("Write")}</span>
        </div>
      </div>
      {SCOPE_DESCRIPTORS.map(descriptor => {
        const available = SCOPE_MATRIX[descriptor.resource] as readonly ScopeAction[];
        const selected = value[descriptor.resource] ?? [];
        return (
          <div key={descriptor.resource} className="flex items-center justify-between gap-4 px-3 py-2">
            <div className="min-w-0">
              <Label htmlFor={`scope-${descriptor.resource}`} className="text-sm">
                {descriptor.label}
              </Label>
              <p className="text-xs text-neutral-500 truncate">{descriptor.description}</p>
            </div>
            <div className="flex gap-6 pr-1 shrink-0">
              {(["read", "write"] as ScopeAction[]).map(action => {
                const supported = available.includes(action);
                // read is forced on (and disabled) when write is selected.
                const forcedByWrite = action === "read" && selected.includes("write");
                return (
                  <div key={action} className="w-10 flex justify-center">
                    {supported ? (
                      <Checkbox
                        id={action === "read" ? `scope-${descriptor.resource}` : undefined}
                        checked={selected.includes(action)}
                        disabled={forcedByWrite}
                        onCheckedChange={checked =>
                          setResource(descriptor.resource, toggleAction(selected, action, !!checked, available))
                        }
                        aria-label={`${descriptor.label} ${action}`}
                      />
                    ) : (
                      <span className="text-neutral-300 dark:text-neutral-700">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
