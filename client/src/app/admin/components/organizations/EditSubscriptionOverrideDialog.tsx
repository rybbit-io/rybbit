"use client";

import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";

import { AdminOrganizationData, AdminSubscriptionOverrideInput } from "@/api/admin/endpoints";
import { useAdminSubscriptionPlans, useUpdateAdminSubscriptionOverride } from "@/api/admin/hooks/useAdminOrganizations";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { formatter } from "@/lib/utils";

type OverrideMode = "none" | "preset" | "custom";

interface EditSubscriptionOverrideDialogProps {
  organization: AdminOrganizationData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initialMode(organization: AdminOrganizationData): OverrideMode {
  if (organization.customPlan) return "custom";
  if (organization.planOverride) return "preset";
  return "none";
}

export function EditSubscriptionOverrideDialog({
  organization,
  open,
  onOpenChange,
}: EditSubscriptionOverrideDialogProps) {
  const t = useExtracted();
  const plans = useAdminSubscriptionPlans();
  const updateOverride = useUpdateAdminSubscriptionOverride(organization.id);
  const [mode, setMode] = useState<OverrideMode>(() => initialMode(organization));
  const [planOverride, setPlanOverride] = useState(organization.planOverride ?? "");
  const [events, setEvents] = useState(organization.customPlan ? String(organization.customPlan.events) : "");
  const [members, setMembers] = useState(
    organization.customPlan?.members ? String(organization.customPlan.members) : ""
  );
  const [websites, setWebsites] = useState(
    organization.customPlan?.websites ? String(organization.customPlan.websites) : ""
  );

  useEffect(() => {
    if (!open) return;
    setMode(initialMode(organization));
    setPlanOverride(organization.planOverride ?? "");
    setEvents(organization.customPlan ? String(organization.customPlan.events) : "");
    setMembers(organization.customPlan?.members ? String(organization.customPlan.members) : "");
    setWebsites(organization.customPlan?.websites ? String(organization.customPlan.websites) : "");
  }, [open, organization]);

  const parseOptionalLimit = (value: string) => (value.trim() ? Number(value) : null);

  const handleSave = async () => {
    let input: AdminSubscriptionOverrideInput;
    if (mode === "none") {
      input = { mode: "none" };
    } else if (mode === "preset") {
      if (!planOverride) {
        toast.error(t("Select a plan override"));
        return;
      }
      input = { mode: "preset", planOverride };
    } else {
      const eventLimit = Number(events);
      const memberLimit = parseOptionalLimit(members);
      const websiteLimit = parseOptionalLimit(websites);
      const invalid =
        !Number.isInteger(eventLimit) ||
        eventLimit <= 0 ||
        (memberLimit !== null && (!Number.isInteger(memberLimit) || memberLimit <= 0)) ||
        (websiteLimit !== null && (!Number.isInteger(websiteLimit) || websiteLimit <= 0));
      if (invalid) {
        toast.error(t("Limits must be positive whole numbers"));
        return;
      }
      input = {
        mode: "custom",
        customPlan: { events: eventLimit, members: memberLimit, websites: websiteLimit },
      };
    }

    try {
      await updateOverride.mutateAsync(input);
      toast.success(t("Subscription override updated"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to update subscription override"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Edit subscription override")}</DialogTitle>
          <DialogDescription>
            {t(
              "Overrides change Rybbit entitlements for {organization}. They do not modify the subscription in Stripe.",
              { organization: organization.name }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="override-mode">{t("Override type")}</Label>
            <Select value={mode} onValueChange={value => setMode(value as OverrideMode)}>
              <SelectTrigger id="override-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("No override")}</SelectItem>
                <SelectItem value="preset">{t("Preset plan")}</SelectItem>
                <SelectItem value="custom">{t("Custom limits")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "preset" && (
            <div className="space-y-2">
              <Label htmlFor="preset-plan">{t("Plan")}</Label>
              <Select value={planOverride} onValueChange={setPlanOverride} disabled={plans.isLoading}>
                <SelectTrigger id="preset-plan">
                  <SelectValue placeholder={plans.isLoading ? t("Loading...") : t("Select a plan")} />
                </SelectTrigger>
                <SelectContent>
                  {plans.data?.map(plan => (
                    <SelectItem key={plan.name} value={plan.name}>
                      {plan.name} · {formatter(plan.eventLimit)} {t("events")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "custom" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="custom-events">{t("Monthly events")}</Label>
                <Input
                  id="custom-events"
                  type="number"
                  min={1}
                  step={1}
                  value={events}
                  onChange={event => setEvents(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-members">{t("Members")}</Label>
                <Input
                  id="custom-members"
                  type="number"
                  min={1}
                  step={1}
                  value={members}
                  placeholder={t("Unlimited")}
                  onChange={event => setMembers(event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="custom-websites">{t("Websites")}</Label>
                <Input
                  id="custom-websites"
                  type="number"
                  min={1}
                  step={1}
                  value={websites}
                  placeholder={t("Unlimited")}
                  onChange={event => setWebsites(event.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="success" onClick={handleSave} disabled={updateOverride.isPending}>
            {updateOverride.isPending ? t("Saving...") : t("Save override")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
