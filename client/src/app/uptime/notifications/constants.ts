import { Mail, Smartphone } from "lucide-react";
import { SiDiscord, SiSlack } from "@icons-pack/react-simple-icons";

export interface ChannelConfigItem {
  icon: typeof Mail;
  title: string;
  description: string;
  disabled?: boolean;
}

export const CHANNEL_CONFIG: Record<string, ChannelConfigItem> = {
  email: {
    icon: Mail,
    title: "Email",
    description: "Send notifications to an email address",
  },
  discord: {
    icon: SiDiscord,
    title: "Discord",
    description: "Send notifications to a Discord channel via webhook",
  },
  slack: {
    icon: SiSlack,
    title: "Slack",
    description: "Send notifications to a Slack channel",
  },
  sms: {
    icon: Smartphone,
    title: "SMS",
    description: "Send notifications via SMS",
  },
};
