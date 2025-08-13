import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "../utils";

export interface NotificationChannel {
  id: number;
  organizationId: string;
  type: "email" | "discord" | "slack" | "sms";
  name: string;
  enabled: boolean;
  config: {
    email?: string;
    webhookUrl?: string;
    slackWebhookUrl?: string;
    slackChannel?: string;
    phoneNumber?: string;
    provider?: string;
  };
  monitorIds: number[] | null; // null = all monitors
  triggerEvents: string[];
  cooldownMinutes: number;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Channels API
async function getChannels() {
  return authedFetch<{ channels: NotificationChannel[] }>("/uptime/notification-channels");
}

async function createChannel(data: {
  type: NotificationChannel["type"];
  name: string;
  config: NotificationChannel["config"];
  monitorIds?: number[] | null;
  triggerEvents?: string[];
  cooldownMinutes?: number;
}) {
  return authedFetch(
    `/uptime/notification-channels`,
    undefined,
    { method: 'POST', data }
  );
}

async function updateChannel(
  id: number,
  data: {
    name?: string;
    enabled?: boolean;
    config?: NotificationChannel["config"];
    monitorIds?: number[] | null;
    triggerEvents?: string[];
    cooldownMinutes?: number;
  }
) {
  return authedFetch(
    `/uptime/notification-channels/${id}`,
    undefined,
    { method: 'PUT', data }
  );
}

async function deleteChannel(id: number) {
  return authedFetch(
    `/uptime/notification-channels/${id}`,
    undefined,
    { method: 'DELETE' }
  );
}

async function testChannel(id: number) {
  return authedFetch(
    `/uptime/notification-channels/${id}/test`,
    undefined,
    { method: 'POST', data: {} }
  );
}


// Hooks
export function useNotificationChannels() {
  return useQuery({
    queryKey: ["notification-channels"],
    queryFn: getChannels,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-channels"] });
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateChannel>[1] }) =>
      updateChannel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-channels"] });
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-channels"] });
    },
  });
}

export function useTestChannel() {
  return useMutation({
    mutationFn: testChannel,
  });
}