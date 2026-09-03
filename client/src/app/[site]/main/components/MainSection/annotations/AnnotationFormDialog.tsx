"use client";

import type { Annotation, AnnotationColor, AnnotationScope } from "@rybbit/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateAnnotation, useUpdateAnnotation } from "@/api/analytics/hooks/useAnnotations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getTimezone, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  ANNOTATION_COLOR_OPTIONS,
  ANNOTATION_ICON_OPTIONS,
  annotationSwatch,
  pickIconFromInput,
  toDateInput,
} from "./annotationUtils";
import { useAnnotationPermissions } from "./useAnnotationPermissions";

export type AnnotationEditorState =
  | { mode: "create"; date?: Date }
  | { mode: "edit"; annotation: Annotation };

type FormValues = {
  title: string;
  date: string;
  isRange: boolean;
  endDate: string;
  description: string;
  color: AnnotationColor | null;
  icon: string | null;
  scope: AnnotationScope;
  isPublic: boolean;
};

export function AnnotationFormDialog({
  state,
  onClose,
}: {
  state: AnnotationEditorState | null;
  onClose: () => void;
}) {
  const t = useExtracted();
  const { site } = useStore();
  const timezone = getTimezone();
  const { isAdmin } = useAnnotationPermissions();
  const createAnnotation = useCreateAnnotation();
  const updateAnnotation = useUpdateAnnotation();

  const schema = useMemo(
    () =>
      z
        .object({
          title: z.string().trim().min(1, t("Title is required")).max(120, t("Keep the title under 120 characters")),
          date: z.string().min(1, t("Pick a date")),
          isRange: z.boolean(),
          endDate: z.string(),
          description: z.string().max(2000, t("Keep the note under 2000 characters")),
          color: z.enum(ANNOTATION_COLOR_OPTIONS as [AnnotationColor, ...AnnotationColor[]]).nullable(),
          icon: z.string().nullable(),
          scope: z.enum(["site", "organization"]),
          isPublic: z.boolean(),
        })
        .refine(values => !values.isRange || (values.endDate !== "" && values.endDate >= values.date), {
          message: t("End date must not be before the start date"),
          path: ["endDate"],
        }),
    [t]
  );

  const defaults = useMemo<FormValues>(() => {
    if (state?.mode === "edit") {
      const a = state.annotation;
      return {
        title: a.title,
        date: toDateInput(a.date, timezone),
        isRange: !!a.endDate,
        endDate: a.endDate ? toDateInput(a.endDate, timezone) : "",
        description: a.description ?? "",
        color: a.color,
        icon: a.icon,
        scope: a.siteId === null ? "organization" : "site",
        isPublic: a.isPublic,
      };
    }
    const clicked = state?.mode === "create" ? state.date : undefined;
    return {
      title: "",
      date: (clicked ? DateTime.fromJSDate(clicked).setZone(timezone) : DateTime.now().setZone(timezone)).toISODate() ?? "",
      isRange: false,
      endDate: "",
      description: "",
      color: null,
      icon: null,
      scope: "site",
      isPublic: false,
    };
  }, [state, timezone]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  // Each open gets fresh values for the annotation (or click) it was opened for.
  useEffect(() => {
    if (state) form.reset(defaults);
  }, [state, defaults, form]);

  const isRange = form.watch("isRange");
  const isPending = createAnnotation.isPending || updateAnnotation.isPending;

  const onSubmit = async (values: FormValues) => {
    if (!state) return;
    const existing = state.mode === "edit" ? state.annotation : undefined;
    const clicked = state.mode === "create" ? state.date : undefined;
    const clickedDay = clicked ? DateTime.fromJSDate(clicked).setZone(timezone).toISODate() : null;
    const dayStart = (day: string) => DateTime.fromISO(day, { zone: timezone }).startOf("day").toUTC().toISO() ?? day;
    const dayEnd = (day: string) => DateTime.fromISO(day, { zone: timezone }).endOf("day").toUTC().toISO() ?? day;

    // Untouched dates keep their stored instant: an hourly or API-created
    // annotation must not snap to midnight because the title was edited.
    // A click on an hour bucket likewise keeps its hour unless the day changed.
    const startIso =
      existing && values.date === defaults.date
        ? existing.date
        : clicked && clickedDay === values.date
          ? clicked.toISOString()
          : dayStart(values.date);
    const endIso = !values.isRange
      ? null
      : existing?.endDate && values.endDate === defaults.endDate
        ? existing.endDate
        : dayEnd(values.endDate);

    const body = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      date: startIso,
      endDate: endIso,
      color: values.color,
      icon: values.icon,
      isPublic: values.isPublic,
      scope: values.scope,
    };

    try {
      if (state.mode === "edit") {
        await updateAnnotation.mutateAsync({ siteId: site, annotationId: state.annotation.annotationId, body });
        toast.success(t("Annotation updated"));
      } else {
        await createAnnotation.mutateAsync({ siteId: site, body });
        toast.success(t("Annotation added"));
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Could not save the annotation"));
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{state?.mode === "edit" ? t("Edit annotation") : t("New annotation")}</DialogTitle>
          <DialogDescription>{t("A note pinned to the chart, so this moment stays explainable later.")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Title")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("What happened?")} autoFocus maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isRange ? t("Start date") : t("Date")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isRange ? (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("End date")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="flex items-end pb-2">
                  <FormField
                    control={form.control}
                    name="isRange"
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Switch id="annotation-range" checked={field.value} onCheckedChange={field.onChange} />
                        <Label htmlFor="annotation-range" className="text-sm font-normal">
                          {t("Date range")}
                        </Label>
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
            {isRange && (
              <FormField
                control={form.control}
                name="isRange"
                render={({ field }) => (
                  <div className="flex items-center gap-2 -mt-2">
                    <Switch id="annotation-range" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="annotation-range" className="text-sm font-normal">
                      {t("Date range")}
                    </Label>
                  </div>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("Note")} <span className="text-muted-foreground font-normal">({t("optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder={t("What changed and why it matters")} maxLength={2000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Color")}</FormLabel>
                    <div className="flex items-center gap-2 h-9">
                      {[null, ...ANNOTATION_COLOR_OPTIONS].map(color => (
                        <button
                          key={color ?? "neutral"}
                          type="button"
                          aria-label={color ?? t("Neutral")}
                          aria-pressed={field.value === color}
                          onClick={() => field.onChange(color)}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 border-transparent transition-shadow",
                            field.value === color && "ring-1 ring-offset-2 ring-neutral-900 dark:ring-neutral-100 ring-offset-white dark:ring-offset-neutral-900"
                          )}
                          style={{ background: annotationSwatch(color) }}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />
              {isAdmin && (
                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Applies to")}</FormLabel>
                      <div className="inline-flex h-9 items-center rounded-lg border border-neutral-150 dark:border-neutral-750 p-0.5 text-xs">
                        {(["site", "organization"] as const).map(scope => (
                          <button
                            key={scope}
                            type="button"
                            aria-pressed={field.value === scope}
                            onClick={() => field.onChange(scope)}
                            className={cn(
                              "px-2.5 h-full rounded-md transition-colors",
                              field.value === scope
                                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50"
                                : "text-muted-foreground hover:text-neutral-900 dark:hover:text-neutral-50"
                            )}
                          >
                            {scope === "site" ? t("This site") : t("All sites")}
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("Icon")} <span className="text-muted-foreground font-normal">({t("optional")})</span>
                  </FormLabel>
                  <div className="flex flex-wrap items-center gap-1">
                    {ANNOTATION_ICON_OPTIONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        aria-pressed={field.value === icon}
                        onClick={() => field.onChange(field.value === icon ? null : icon)}
                        className={cn(
                          "w-8 h-8 rounded-md border text-base leading-none transition-colors",
                          field.value === icon
                            ? "border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800"
                            : "border-neutral-150 dark:border-neutral-750 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                    {/* Any emoji: type or paste one (the OS emoji picker works here). */}
                    <Input
                      aria-label={t("Custom emoji")}
                      placeholder="＋"
                      title={t("Type or paste any emoji")}
                      value={field.value && !ANNOTATION_ICON_OPTIONS.includes(field.value) ? field.value : ""}
                      onChange={e => field.onChange(pickIconFromInput(e.target.value))}
                      className={cn(
                        "w-8 h-8 px-0 text-center text-base rounded-md",
                        field.value && !ANNOTATION_ICON_OPTIONS.includes(field.value) && "border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800"
                      )}
                    />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch id="annotation-public" checked={field.value} onCheckedChange={field.onChange} />
                  <Label htmlFor="annotation-public" className="text-sm font-normal">
                    {t("Show on public dashboard and shared links")}
                  </Label>
                </div>
              )}
            />

            <DialogFooter className="mt-1">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                {t("Cancel")}
              </Button>
              <Button type="submit" variant="success" disabled={isPending}>
                {state?.mode === "edit" ? t("Save changes") : t("Add annotation")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
