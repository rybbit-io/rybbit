"use client";

import { Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { FormEvent, useId, useState } from "react";

import { useCreateGoal } from "@/api/analytics/hooks/goals/useCreateGoal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/sonner";
import { useStore } from "@/lib/store";

/**
 * Turns a custom event into a goal from its row. The event is already chosen,
 * so all that is left to decide is the goal's name: an event goal on this
 * name, created through the same mutation as the Goals page.
 */
export function CreateGoalPopover({ eventName }: { eventName: string }) {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const createGoal = useCreateGoal();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(eventName);
  const inputId = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createGoal.mutateAsync({
        siteId: Number(site),
        name: name.trim() || undefined,
        goalType: "event",
        config: { eventName },
      });
      toast.success(t("Goal created"));
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to save goal"));
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) setName(eventName);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="-ml-1.5 gap-1 font-normal text-neutral-500 dark:text-neutral-400"
        >
          <Plus />
          {t("Create goal")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={inputId}>{t("Goal name")}</Label>
            <Input
              id={inputId}
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder={eventName}
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t.rich("A session converts when <name></name> fires in it.", {
              name: () => <span className="font-mono text-neutral-900 dark:text-neutral-100">{eventName}</span>,
            })}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              loading={createGoal.isPending}
              loadingLabel={t("Saving...")}
            >
              {t("Create goal")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
