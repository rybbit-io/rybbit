"use client";

import { useExtracted } from "next-intl";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Label } from "../../../../components/ui/label";

// Display copy of the scope taxonomy. Kept in sync with the server's source of
// truth in @rybbit/shared (SCOPE_MATRIX); it is inlined here rather than
// imported because the client only ever uses that package for erased types —
// importing its runtime values would force Turbopack to bundle a `file:`
// workspace package, which it cannot resolve. This is a labels-and-layout
// concern only; the server validates the permissions that are actually sent.
const SCOPE_MATRIX = {
  analytics: ["read"],
  sessions: ["read"],
  events: ["read"],
  users: ["read", "write"],
  goals: ["read", "write"],
  funnels: ["read", "write"],
  dashboards: ["read", "write"],
  flags: ["read", "write"],
  experiments: ["read", "write"],
  sites: ["read", "write"],
  gsc: ["read", "write"],
  org: ["read", "write"],
  replay: ["read", "write"],
  sql: ["read"],
  ingest: ["write"],
} as const;

type ScopeResource = keyof typeof SCOPE_MATRIX;
type ScopeAction = "read" | "write";

const SCOPE_DESCRIPTORS: { resource: ScopeResource; label: string; description: string }[] = [
  { resource: "analytics", label: "Analytics", description: "Traffic overview, metrics, retention, journeys, performance, and errors" },
  { resource: "sessions", label: "Sessions", description: "Visitor sessions and their locations" },
  { resource: "events", label: "Events", description: "Raw events, custom event names, and properties" },
  { resource: "users", label: "Users", description: "Visitor profiles and traits; write covers identify and deletion" },
  { resource: "goals", label: "Goals", description: "Conversion goals" },
  { resource: "funnels", label: "Funnels", description: "Saved and ad-hoc conversion funnels" },
  { resource: "dashboards", label: "Dashboards", description: "Saved dashboards" },
  { resource: "flags", label: "Feature flags", description: "Feature flag definitions and evaluation" },
  { resource: "experiments", label: "Experiments", description: "A/B experiments and their results" },
  { resource: "sites", label: "Sites", description: "Site configuration; write covers create, update, and delete" },
  { resource: "gsc", label: "Search Console", description: "Google Search Console connection and data" },
  { resource: "org", label: "Organization", description: "Members and teams; write covers management" },
  { resource: "replay", label: "Session replay", description: "Recorded replays; write covers deletion" },
  { resource: "sql", label: "Custom SQL", description: "Read-only ClickHouse queries" },
  { resource: "ingest", label: "Event ingestion", description: "Trusted server-side event tracking" },
];

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
