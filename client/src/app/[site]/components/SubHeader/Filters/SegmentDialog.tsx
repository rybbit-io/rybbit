"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Filter, FilterParameter, Segment } from "@rybbit/shared";
import { Building2, Globe, Plus, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import {
  useCreateSegment,
  useDeleteSegment,
  useGetSegments,
  useUpdateSegment,
} from "../../../../../api/analytics/hooks/useSegments";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../../../components/ui/alert-dialog";
import { Button } from "../../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../../../components/ui/form";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../components/ui/popover";
import { toast } from "../../../../../components/ui/sonner";
import { Switch } from "../../../../../components/ui/switch";
import { Textarea } from "../../../../../components/ui/textarea";
import { authClient } from "../../../../../lib/auth";
import { useGetRegionName } from "../../../../../lib/geo";
import { applySegment, clearSegment, useStore } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import { FilterChip } from "./FilterChip";
import { FilterPicker } from "./FilterPicker";
import { formatDisplayValue, operatorNeedsValue, useParameterLabel } from "./labels";
import {
  filterListKeys,
  SEGMENT_DESCRIPTION_MAX_LENGTH,
  SEGMENT_MAX_FILTERS,
  SEGMENT_NAME_MAX_LENGTH,
} from "./segmentUtils";

const filterSchema = z.object({
  parameter: z.string().min(1),
  type: z.string().min(1),
  value: z.array(z.union([z.string(), z.number()])),
});

const formSchema = z.object({
  name: z.string().trim().min(1, "Give the segment a name").max(SEGMENT_NAME_MAX_LENGTH),
  description: z.string().trim().max(SEGMENT_DESCRIPTION_MAX_LENGTH),
  filters: z.array(filterSchema).min(1, "Add at least one filter").max(SEGMENT_MAX_FILTERS),
  scope: z.enum(["site", "organization"]),
  isPublic: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export interface SegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  /** Edit this segment; omit to create a new one. */
  segment?: Segment;
  /** Starting filters for a new segment, e.g. the dashboard's current chips. */
  initialFilters?: Filter[];
  availableFilters?: FilterParameter[];
}

/**
 * Create or edit a segment. The filters are edited inside the dialog with the
 * same chips and picker as the filter bar, so a segment can be built from
 * scratch without first applying anything to the dashboard.
 */
export function SegmentDialog(props: SegmentDialogProps) {
  const t = useExtracted();
  const { open, onOpenChange, segment } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{segment ? t("Edit segment") : t("New segment")}</DialogTitle>
          <DialogDescription>
            {segment
              ? t("Changes apply everywhere this segment is used.")
              : t("A segment is a named set of filters you can apply to any report with one click.")}
          </DialogDescription>
        </DialogHeader>
        {open && <SegmentForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function SegmentForm({ onOpenChange, siteId, segment, initialFilters, availableFilters }: SegmentDialogProps) {
  const t = useExtracted();
  const { data: site } = useGetSite(siteId);
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { getRegionName } = useGetRegionName();
  const getParameterLabel = useParameterLabel();
  const appliedSegmentId = useStore(state => state.segmentId);
  const { data: segments } = useGetSegments(siteId);
  // Applying the new segment must drop the filters the currently applied one
  // contributed, or they linger in the row as anonymous ad-hoc chips.
  const appliedSegment = segments?.find(s => s.segmentId === appliedSegmentId);

  const { mutateAsync: createSegment, isPending: isCreating } = useCreateSegment();
  const { mutateAsync: updateSegment, isPending: isUpdating } = useUpdateSegment();
  const { mutate: deleteSegment, isPending: isDeleting } = useDeleteSegment();

  const startingFilters = segment?.filters ?? initialFilters ?? [];
  const suggestedName = startingFilters
    .map(filter => (operatorNeedsValue(filter.type) ? formatDisplayValue(filter, getRegionName) : getParameterLabel(filter.parameter)))
    .filter(Boolean)
    .join(" · ");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: segment?.name ?? suggestedName,
      description: segment?.description ?? "",
      filters: startingFilters,
      scope: segment ? (segment.siteId === null ? "organization" : "site") : "site",
      isPublic: segment?.isPublic ?? false,
    },
  });

  const filters = form.watch("filters") as Filter[];
  const filterKeys = filterListKeys(filters);
  const scope = form.watch("scope");
  const setFilters = (next: Filter[]) => form.setValue("filters", next, { shouldValidate: true, shouldDirty: true });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerParameter, setPickerParameter] = useState<FilterParameter | null>(null);
  const pendingRef = useRef<() => Filter | null>(() => null);

  const addFilter = (filter: Filter) => {
    const index = filters.findIndex(f => f.parameter === filter.parameter && f.type === filter.type);
    setFilters(index === -1 ? [...filters, filter] : filters.map((f, i) => (i === index ? filter : f)));
  };

  const handlePickerOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const pending = pendingRef.current();
      if (pending) addFilter(pending);
      pendingRef.current = () => null;
      setPickerParameter(null);
    }
    setPickerOpen(isOpen);
  };

  // Org-wide scope is an admin decision on the server; only offer it when the
  // toggle can succeed, or when the segment is already org-wide.
  const canChooseScope = !!site?.isOwner || segment?.siteId === null;
  const organizationName = activeOrganization?.name;
  const isSaving = isCreating || isUpdating;

  const onSubmit = async (values: FormValues) => {
    const body = {
      name: values.name,
      description: values.description.length > 0 ? values.description : null,
      filters: values.filters as Filter[],
      isPublic: values.isPublic,
      scope: values.scope,
    };
    try {
      if (segment) {
        const updated = await updateSegment({ siteId, segmentId: segment.segmentId, body });
        // An applied segment whose filters changed is re-applied so the row
        // matches the new definition instead of silently going "edited".
        if (appliedSegmentId === segment.segmentId) applySegment(updated, segment.filters);
        toast.success(t("Saved segment “{name}”", { name: updated.name }));
      } else {
        const created = await createSegment({ siteId, body });
        applySegment(created, appliedSegment?.filters);
        toast.success(t("Saved segment “{name}”", { name: created.name }));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to save segment"));
    }
  };

  const onDelete = () => {
    if (!segment) return;
    deleteSegment(
      { siteId, segmentId: segment.segmentId },
      {
        onSuccess: () => {
          if (appliedSegmentId === segment.segmentId) clearSegment(segment.filters);
          toast.success(t("Deleted segment “{name}”", { name: segment.name }));
          onOpenChange(false);
        },
        onError: error => toast.error(error instanceof Error ? error.message : t("Failed to delete segment")),
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Name")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("e.g. Mobile organic from Germany")} autoFocus maxLength={SEGMENT_NAME_MAX_LENGTH} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="filters"
          render={() => (
            <FormItem>
              <FormLabel>{t("Filters")}</FormLabel>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter, index) => (
                  <FilterChip
                    key={filterKeys[index]}
                    filter={filter}
                    availableFilters={availableFilters}
                    onUpdate={next => setFilters(filters.map((f, i) => (i === index ? next : f)))}
                    onRemove={() => setFilters(filters.filter((_, i) => i !== index))}
                  />
                ))}
                <Popover open={pickerOpen} onOpenChange={handlePickerOpenChange}>
                  <PopoverTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      {t("Add filter")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <FilterPicker
                      availableFilters={availableFilters}
                      onCommit={addFilter}
                      onClose={() => setPickerOpen(false)}
                      pendingRef={pendingRef}
                      parameter={pickerParameter}
                      setParameter={setPickerParameter}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t("Every filter must match. Values within one filter are alternatives.")}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {canChooseScope && (
          <FormField
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Available on")}</FormLabel>
                <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  <ScopeOption
                    selected={field.value === "site"}
                    onSelect={() => field.onChange("site")}
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label={t("This site")}
                  />
                  <ScopeOption
                    selected={field.value === "organization"}
                    onSelect={() => field.onChange("organization")}
                    icon={<Building2 className="h-3.5 w-3.5" />}
                    label={
                      organizationName
                        ? t("All sites in {organization}", { organization: organizationName })
                        : t("All sites in the organization")
                    }
                  />
                </div>
                {scope === "organization" && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t("Site-specific values such as paths may not mean the same thing on every site.")}
                  </p>
                )}
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("Description")}{" "}
                <span className="font-normal text-neutral-500 dark:text-neutral-400">{t("optional")}</span>
              </FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} maxLength={SEGMENT_DESCRIPTION_MAX_LENGTH} placeholder={t("Why this group matters")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Switch id="segment-public" checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <Label htmlFor="segment-public" className="font-normal">
                {t("Show on the public dashboard and private links")}
              </Label>
            </FormItem>
          )}
        />

        <DialogFooter className="sm:justify-between gap-2">
          <div>
            {segment?.canEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="text-red-600 dark:text-red-400 gap-1.5" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4" />
                    {t("Delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("Delete segment?")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "“{name}” will be removed for everyone who uses it. Links that already expanded its filters keep working.",
                        { name: segment.name }
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>{t("Delete")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSaving}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="success" disabled={isSaving}>
              {isSaving ? t("Saving...") : segment ? t("Save changes") : t("Save segment")}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}

function ScopeOption({
  selected,
  onSelect,
  icon,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 transition-colors",
        selected
          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 font-medium"
          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
