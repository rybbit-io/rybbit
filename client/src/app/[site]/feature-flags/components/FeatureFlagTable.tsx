"use client";

import { useDeleteFeatureFlag, useUpdateFeatureFlag } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import type { FeatureFlag } from "@/api/analytics/endpoints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Edit2, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { formatFlagValue, getConditionSetPayload } from "../lib/form";
import { useFlagTypeLabel, useRuntimeLabel } from "../lib/labels";
import { FeatureFlagDialog } from "./FeatureFlagDialog";

function FlagStats({ flag }: { flag: FeatureFlag }) {
  const topStats = flag.stats.slice(0, 2);
  if (topStats.length === 0) return <span className="text-neutral-400">-</span>;

  return (
    <div className="flex flex-col gap-1">
      {topStats.map(stat => (
        <div key={`${stat.flag_value}-${stat.sessions}`} className="flex items-center gap-2 text-xs">
          <span className="max-w-24 truncate font-mono text-neutral-700 dark:text-neutral-200">
            {stat.flag_value || "(empty)"}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">{stat.sessions.toLocaleString()} sessions</span>
        </div>
      ))}
    </div>
  );
}

function FlagValueSummary({ flag }: { flag: FeatureFlag }) {
  const t = useExtracted();
  const getFlagTypeLabel = useFlagTypeLabel();
  const firstConditionSet = flag.conditionSets[0];
  const variants = firstConditionSet?.variants || flag.variants;

  if (flag.flagType === "multivariate") {
    return (
      <div className="flex max-w-56 flex-col gap-1">
        <Badge variant="outline" className="w-fit">
          {getFlagTypeLabel(flag.flagType)}
        </Badge>
        <div className="flex flex-wrap gap-1">
          {variants.slice(0, 3).map(variant => (
            <span
              key={variant.key}
              className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800"
            >
              {variant.key} {variant.rolloutPercentage}%
            </span>
          ))}
          {variants.length > 3 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">+{variants.length - 3}</span>
          )}
        </div>
      </div>
    );
  }

  if (flag.flagType === "remote_config") {
    return (
      <div className="flex max-w-48 flex-col gap-1">
        <Badge variant="outline" className="w-fit">
          {getFlagTypeLabel(flag.flagType)}
        </Badge>
        <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {formatFlagValue(getConditionSetPayload(flag, firstConditionSet)) || t("Payload")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex max-w-48 flex-col gap-1">
      <Badge variant="outline" className="w-fit">
        {getFlagTypeLabel(flag.flagType)}
      </Badge>
      {(firstConditionSet?.payload !== undefined || (flag.payload !== undefined && flag.payload !== null)) && (
        <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {formatFlagValue(getConditionSetPayload(flag, firstConditionSet))}
        </span>
      )}
    </div>
  );
}

function FlagRolloutSummary({ flag }: { flag: FeatureFlag }) {
  if (flag.flagType === "remote_config") {
    return <span className="text-neutral-400">-</span>;
  }

  const firstConditionSet = flag.conditionSets[0];
  const rolloutPercentage =
    flag.flagType === "multivariate"
      ? Math.min(
          100,
          (firstConditionSet?.variants || flag.variants).reduce((sum, variant) => sum + variant.rolloutPercentage, 0)
        )
      : (firstConditionSet?.rolloutPercentage ?? flag.rolloutPercentage);

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={cn("h-2 rounded-full bg-accent-500", rolloutPercentage === 0 && "bg-transparent")}
          style={{ width: `${rolloutPercentage}%` }}
        />
      </div>
      <span className="text-sm tabular-nums">{rolloutPercentage}%</span>
    </div>
  );
}

export function FeatureFlagTable({ flags }: { flags: FeatureFlag[] }) {
  const t = useExtracted();
  const getRuntimeLabel = useRuntimeLabel();
  const updateMutation = useUpdateFeatureFlag();
  const deleteMutation = useDeleteFeatureFlag();

  const handleDelete = async (flag: FeatureFlag) => {
    if (!window.confirm(t("Delete this feature flag?"))) return;

    try {
      await deleteMutation.mutateAsync(flag.flagId);
      toast.success(t("Feature flag deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to delete feature flag"));
    }
  };

  return (
    <div className="rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Flag")}</TableHead>
            <TableHead>{t("Status")}</TableHead>
            <TableHead>{t("Value")}</TableHead>
            <TableHead>{t("Rollout")}</TableHead>
            <TableHead>{t("Rules")}</TableHead>
            <TableHead>{t("Traffic")}</TableHead>
            <TableHead className="w-24 text-right">{t("Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map(flag => (
            <TableRow key={flag.flagId}>
              <TableCell>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{flag.key}</span>
                    <Badge variant="secondary">v{flag.version}</Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={flag.enabled}
                    disabled={updateMutation.isPending}
                    onCheckedChange={enabled => updateMutation.mutate({ flagId: flag.flagId, payload: { enabled } })}
                  />
                  <Badge variant={flag.enabled ? "success" : "secondary"}>{flag.enabled ? t("On") : t("Off")}</Badge>
                  <Badge variant="outline">{getRuntimeLabel(flag.runtime)}</Badge>
                </div>
              </TableCell>
              <TableCell>
                <FlagValueSummary flag={flag} />
              </TableCell>
              <TableCell>
                <FlagRolloutSummary flag={flag} />
              </TableCell>
              <TableCell>
                {flag.conditionSets.length.toLocaleString()} /{" "}
                {flag.conditionSets.reduce((sum, conditionSet) => sum + conditionSet.rules.length, 0).toLocaleString()}
              </TableCell>
              <TableCell>
                <FlagStats flag={flag} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <FeatureFlagDialog
                    flag={flag}
                    trigger={
                      <Button size="smIcon" variant="ghost" aria-label={t("Edit")}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    size="smIcon"
                    variant="ghost"
                    aria-label={t("Delete")}
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(flag)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
