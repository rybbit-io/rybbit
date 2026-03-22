"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Bell, Edit, MoreHorizontal, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import {
  NotificationChannel,
  useDeleteChannel,
  useNotificationChannels,
  useTestChannel,
  useUpdateChannel,
} from "../../../api/uptime/notifications";
import { StandardPage } from "../../../components/StandardPage";
import { NotificationDialog } from "./components/NotificationDialog";
import { CHANNEL_CONFIG } from "./constants";
import { useNotificationsStore } from "./notificationsStore";

type ChannelType = NotificationChannel["type"];

export default function NotificationsPage() {
  const { data, isLoading } = useNotificationChannels();
  const updateChannel = useUpdateChannel();
  const deleteChannel = useDeleteChannel();
  const testChannel = useTestChannel();
  const { openDialog } = useNotificationsStore();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<NotificationChannel | null>(null);

  const handleToggleChannel = async (channel: NotificationChannel) => {
    try {
      await updateChannel.mutateAsync({
        id: channel.id,
        data: { enabled: !channel.enabled },
      });
      toast.success(channel.enabled ? "Channel disabled" : "Channel enabled");
    } catch (error) {
      toast.error("Failed to update channel");
    }
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;

    try {
      await deleteChannel.mutateAsync(channelToDelete.id);
      toast.success("Channel deleted");
      setChannelToDelete(null);
    } catch (error) {
      toast.error("Failed to delete channel");
      throw error; // Re-throw to show error in modal
    }
  };

  const openDeleteModal = (channel: NotificationChannel) => {
    setChannelToDelete(channel);
    setDeleteModalOpen(true);
  };

  const handleTestChannel = async (channel: NotificationChannel) => {
    try {
      await testChannel.mutateAsync(channel.id);
      toast.success("Test notification sent");
    } catch (error) {
      toast.error("Failed to send test notification");
    }
  };

  const openCreateDialog = (type: ChannelType) => {
    if (CHANNEL_CONFIG[type].disabled) {
      toast.info("This channel type is coming soon");
      return;
    }
    openDialog(type);
  };

  const openEditDialog = (channel: NotificationChannel) => {
    openDialog(channel.type, channel);
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure how you want to be notified about monitor incidents</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {Object.entries(CHANNEL_CONFIG).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <div
              key={type}
              className={cn(
                "bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center justify-between"
              )}
              onClick={() => openCreateDialog(type as ChannelType)}
            >
              <div className="flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4")} />
                  <span className="text-base">{config.title}</span>
                </CardTitle>
                <CardDescription>
                  {config.description}
                  {config.disabled && " - Coming soon"}
                </CardDescription>
              </div>
              <Button variant="success" disabled={config.disabled}>
                Create
              </Button>
            </div>
          );
        })}
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Active Channels</h2>
        {data?.channels?.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-neutral-500">
              No notification channels configured yet
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell>
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-8 w-8 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  : data?.channels?.map(channel => {
                      const config = CHANNEL_CONFIG[channel.type];
                      const Icon = config.icon;
                      return (
                        <TableRow key={channel.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {channel.name}
                              {!channel.enabled && (
                                <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span className="capitalize">{channel.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-neutral-500">
                            {channel.type === "email" && channel.config?.email}
                            {channel.type === "discord" && "Discord webhook"}
                            {channel.type === "slack" && `Slack ${channel.config?.slackChannel || "webhook"}`}
                            {channel.type === "sms" && channel.config?.phoneNumber}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleToggleChannel(channel)}>
                                  <Power className="h-4 w-4" />
                                  {channel.enabled ? "Disable" : "Enable"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleTestChannel(channel)}
                                  disabled={!channel.enabled}
                                >
                                  <Bell className="h-4 w-4" />
                                  Test
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(channel)}>
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openDeleteModal(channel)} className="text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      <NotificationDialog />
      <ConfirmationModal
        isOpen={deleteModalOpen}
        setIsOpen={setDeleteModalOpen}
        onConfirm={handleDeleteChannel}
        title="Delete Notification Channel"
        description={
          channelToDelete ? (
            <>
              Are you sure you want to delete the notification channel <strong>{channelToDelete.name}</strong>? This
              action cannot be undone.
            </>
          ) : (
            "Are you sure you want to delete this notification channel?"
          )
        }
        primaryAction={{
          children: "Delete Channel",
          variant: "destructive",
        }}
      />
    </>
  );
}
