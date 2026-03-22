"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useNotificationsStore } from "../notificationsStore";
import { NotificationChannel, useCreateChannel, useUpdateChannel } from "@/api/uptime/notifications";
import { CHANNEL_CONFIG } from "../constants";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import * as React from "react";
import { useMonitors } from "@/api/uptime/monitors";
import { MultiSelect } from "@/components/ui/multi-select";

type FormData = {
  name: string;
  email?: string;
  webhookUrl?: string;
  slackWebhookUrl?: string;
  slackChannel?: string;
  phoneNumber?: string;
};

export function NotificationDialog() {
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const {
    isDialogOpen,
    selectedType,
    editingChannel,
    closeDialog,
    resetForm: resetStoreForm,
  } = useNotificationsStore();
  const { data: monitorsData, isLoading: monitorsLoading } = useMonitors({ enabled: true });
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      webhookUrl: "",
      slackWebhookUrl: "",
      slackChannel: "",
      phoneNumber: "",
    },
  });

  // Reset form when dialog closes or populate with editing data
  useEffect(() => {
    if (!isDialogOpen) {
      reset();
      setSelectedMonitorIds([]);
    } else if (editingChannel) {
      // Populate form with existing channel data
      reset({
        name: editingChannel.name,
        email: editingChannel.config?.email || "",
        webhookUrl: editingChannel.config?.webhookUrl || "",
        slackWebhookUrl: editingChannel.config?.slackWebhookUrl || "",
        slackChannel: editingChannel.config?.slackChannel || "",
        phoneNumber: editingChannel.config?.phoneNumber || "",
      });
      setSelectedMonitorIds(editingChannel.monitorIds?.map(id => id.toString()) || []);
    }
  }, [isDialogOpen, editingChannel, reset]);

  const monitorOptions = React.useMemo(() => {
    if (!monitorsData) return [];
    return monitorsData.map(monitor => ({
      value: monitor.id.toString(),
      label:
        monitor.name ||
        (monitor.monitorType === "http"
          ? monitor.httpConfig?.url || "HTTP Monitor"
          : `${monitor.tcpConfig?.host}:${monitor.tcpConfig?.port}` || "TCP Monitor"),
    }));
  }, [monitorsData]);

  const onSubmit = async (data: FormData) => {
    if (!selectedType) return;
    const config: Partial<NotificationChannel["config"]> = {};
    if (selectedType === "email" && data.email) config.email = data.email;
    if (selectedType === "discord" && data.webhookUrl) config.webhookUrl = data.webhookUrl;
    if (selectedType === "slack") {
      if (data.slackWebhookUrl) config.slackWebhookUrl = data.slackWebhookUrl;
      if (data.slackChannel) config.slackChannel = data.slackChannel;
    }
    if (selectedType === "sms" && data.phoneNumber) config.phoneNumber = data.phoneNumber;

    try {
      const monitorIds = selectedMonitorIds.length > 0 ? selectedMonitorIds.map(id => parseInt(id, 10)) : null;

      if (editingChannel) {
        await updateChannel.mutateAsync({
          id: editingChannel.id,
          data: {
            name: data.name,
            config,
            monitorIds,
          },
        });
        toast.success("Notification channel updated");
      } else {
        await createChannel.mutateAsync({
          type: selectedType,
          name: data.name,
          config,
          monitorIds,
        });
        toast.success("Notification channel created");
      }
      closeDialog();
      resetStoreForm();
      reset();
      setSelectedMonitorIds([]);
    } catch (error) {
      toast.error(editingChannel ? "Failed to update channel" : "Failed to create channel");
    }
  };

  // Determine if form is valid based on selected channel type
  const isFormValid = () => {
    const values = watch();
    if (!values.name?.trim()) return false;

    switch (selectedType) {
      case "email":
        return !!values.email?.trim();
      case "discord":
        return !!values.webhookUrl?.trim();
      case "slack":
        return !!values.slackWebhookUrl?.trim();
      case "sms":
        return !!values.phoneNumber?.trim();
      default:
        return false;
    }
  };

  const selectedConfig = selectedType ? CHANNEL_CONFIG[selectedType] : null;
  const Icon = selectedConfig ? selectedConfig.icon : null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {Icon && <Icon />}
            {editingChannel ? "Edit" : "Add"} {selectedConfig && selectedConfig.title} Channel
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              placeholder="e.g., Team Alerts"
              {...register("name", {
                required: "Channel name is required",
                minLength: { value: 1, message: "Channel name is required" },
              })}
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {selectedType === "email" && (
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="alerts@example.com"
                {...register("email", {
                  required: "Email address is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
            </div>
          )}

          {selectedType === "discord" && (
            <div>
              <Label htmlFor="webhookUrl">Discord Webhook URL</Label>
              <Input
                id="webhookUrl"
                placeholder="https://discord.com/api/webhooks/..."
                {...register("webhookUrl", {
                  required: "Discord webhook URL is required",
                  pattern: {
                    value: /^https:\/\/discord\.com\/api\/webhooks\/.+/,
                    message: "Invalid Discord webhook URL",
                  },
                })}
              />
              <p className="text-xs text-neutral-500 mt-1">Create a webhook in your Discord server settings</p>
              {errors.webhookUrl && <p className="text-sm text-red-500 mt-1">{errors.webhookUrl.message}</p>}
            </div>
          )}

          {selectedType === "slack" && (
            <>
              <div>
                <Label htmlFor="slackWebhookUrl">Slack Webhook URL</Label>
                <Input
                  id="slackWebhookUrl"
                  placeholder="https://hooks.slack.com/services/..."
                  {...register("slackWebhookUrl", {
                    required: "Slack webhook URL is required",
                    pattern: {
                      value: /^https:\/\/hooks\.slack\.com\/(services|workflows)\/.+/,
                      message: "Invalid Slack webhook URL",
                    },
                  })}
                />
                {errors.slackWebhookUrl && (
                  <p className="text-sm text-red-500 mt-1">{errors.slackWebhookUrl.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="slackChannel">Channel (optional)</Label>
                <Input id="slackChannel" placeholder="#alerts" {...register("slackChannel")} />
              </div>
            </>
          )}

          {selectedType === "sms" && (
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                placeholder="+1234567890"
                {...register("phoneNumber", {
                  required: "Phone number is required",
                  pattern: {
                    value: /^\+[1-9]\d{1,14}$/,
                    message: "Phone number must be in E.164 format (e.g., +14155552671)",
                  },
                })}
              />
              <p className="text-xs text-neutral-500 mt-1">Use international E.164 format: +[country code][number]</p>
              {errors.phoneNumber && <p className="text-sm text-red-500 mt-1">{errors.phoneNumber.message}</p>}
            </div>
          )}

          {/* Monitor Selection */}
          <div className="space-y-2">
            <Label>Monitors</Label>
            <MultiSelect
              options={monitorOptions}
              value={selectedMonitorIds}
              onValueChange={setSelectedMonitorIds}
              placeholder="Select monitors..."
              searchPlaceholder="Search monitors..."
              emptyText="No monitors found."
              disabled={monitorsLoading}
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Leave empty to receive alerts from all monitors
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              disabled={!isFormValid() || createChannel.isPending || updateChannel.isPending}
            >
              {editingChannel
                ? updateChannel.isPending
                  ? "Updating..."
                  : "Update Channel"
                : createChannel.isPending
                  ? "Creating..."
                  : "Create Channel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
