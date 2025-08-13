import { create } from "zustand";
import { NotificationChannel } from "@/api/uptime/notifications";

type ChannelType = NotificationChannel["type"];

interface NotificationsStore {
  // Dialog state
  isDialogOpen: boolean;
  selectedType: ChannelType | null;
  editingChannel: NotificationChannel | null;
  
  // Actions
  openDialog: (type: ChannelType, channel?: NotificationChannel) => void;
  closeDialog: () => void;
  resetForm: () => void;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  // Initial state
  isDialogOpen: false,
  selectedType: null,
  editingChannel: null,
  
  // Actions
  openDialog: (type, channel) => set({ 
    isDialogOpen: true, 
    selectedType: type,
    editingChannel: channel || null
  }),
  
  closeDialog: () => set({ 
    isDialogOpen: false,
    editingChannel: null
  }),
  
  resetForm: () => 
    set({ 
      selectedType: null,
      editingChannel: null
    }),
}));