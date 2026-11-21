import {
  Bell,
  Bot,
  Briefcase,
  Calendar,
  CornerDownRight,
  DollarSign,
  ExternalLink,
  FileQuestion,
  FileText,
  Handshake,
  Headphones,
  HelpCircle,
  Link,
  Mail,
  Megaphone,
  MessageSquare,
  Monitor,
  Network,
  Newspaper,
  Search,
  ShoppingCart,
  Users,
  Video,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Favicon } from "./Favicon";
import { Badge } from "./ui/badge";

export function getChannelIconComponent(channel: string) {
  switch (channel) {
    case "Direct":
      return Link;
    case "Internal":
      return CornerDownRight;
    case "Organic Search":
    case "Paid Search":
      return Search;
    case "Referral":
      return ExternalLink;
    case "Organic Social":
    case "Paid Social":
      return Users;
    case "Email":
      return Mail;
    case "Unknown":
      return HelpCircle;
    case "Paid Unknown":
      return DollarSign;
    case "Display":
      return Monitor;
    case "Organic Video":
    case "Paid Video":
      return Video;
    case "Affiliate":
      return Handshake;
    case "Content":
      return FileText;
    case "Organic Shopping":
    case "Paid Shopping":
      return ShoppingCart;
    case "Event":
      return Calendar;
    case "Audio":
    case "Paid Audio":
      return Headphones;
    case "Influencer":
    case "Paid Influencer":
      return Megaphone;
    case "Push":
      return Bell;
    case "SMS":
      return MessageSquare;
    case "News":
      return Newspaper;
    case "Productivity":
      return Briefcase;
    case "Cross-Network":
      return Network;
    case "AI":
    case "Paid AI":
      return Bot;
    default:
      return FileQuestion;
  }
}

export const ChannelIcon = ({ channel, className }: { channel: string; className?: string }) => {
  const Icon = getChannelIconComponent(channel);
  return <Icon className={cn("w-4 h-4", className)} />;
};

export const getDisplayName = (hostname: string): string => {
  // Handle Google domains with startsWith
  if (hostname.startsWith("google.") || hostname.startsWith("www.google.")) {
    return "Google";
  }
  if (hostname === "accounts.google.com") return "Google";
  if (hostname === "mail.google.com") return "Gmail";

  const commonSites: Record<string, string> = {
    "bing.com": "Bing",
    "cn.bing.com": "Bing",
    "www.bing.com": "Bing",
    "baidu.com": "Baidu",
    "www.baidu.com": "Baidu",
    "naver.com": "Naver",
    "m.search.naver.com": "Naver",
    "search.naver.com": "Naver",
    "www.naver.com": "Naver",
    "facebook.com": "Facebook",
    "www.facebook.com": "Facebook",
    "m.facebook.com": "Facebook",
    "l.facebook.com": "Facebook",
    "lm.facebook.com": "Facebook",
    "instagram.com": "Instagram",
    "www.instagram.com": "Instagram",
    "l.instagram.com": "Instagram",
    "youtube.com": "YouTube",
    "www.youtube.com": "YouTube",
    "reddit.com": "Reddit",
    "www.reddit.com": "Reddit",
    "out.reddit.com": "Reddit",
    "twitter.com": "Twitter",
    "x.com": "X",
    "t.co": "X",
    "linkedin.com": "LinkedIn",
    "www.linkedin.com": "LinkedIn",
    "github.com": "GitHub",
    "duckduckgo.com": "DuckDuckGo",
    "yandex.ru": "Yandex",
    "ya.ru": "Yandex",
    "yahoo.com": "Yahoo",
    "search.yahoo.com": "Yahoo",
    "tiktok.com": "TikTok",
    "www.tiktok.com": "TikTok",
    "pinterest.com": "Pinterest",
    "www.pinterest.com": "Pinterest",
    "chatgpt.com": "ChatGPT",
    "chat.openai.com": "ChatGPT",
    "claude.ai": "Claude",
    "gemini.google.com": "Gemini",
    "copilot.microsoft.com": "Copilot",
    "copilot.cloud.microsoft": "Copilot",
    "m365.cloud.microsoft": "Copilot",
    "edgeservices.bing.com": "Copilot",
    "aistudio.google.com": "Google AI Studio",
    "notebooklm.google.com": "NotebookLM",
    "duck.ai": "Duck.ai",
    "kimi.com": "Kimi",
    "doubao.com": "Doubao",
    "manus.im": "Manus",
    "threads.com": "Threads",
    "www.threads.com": "Threads",
    "threads.net": "Threads",
    "www.threads.net": "Threads",
    "bsky.app": "Bluesky",
    "outlook.live.com": "Outlook",
    "chat.deepseek.com": "DeepSeek",
    "deepseek.com": "DeepSeek",
    "chat.mistral.ai": "Mistral",
    "mistral.ai": "Mistral",
    "meta.ai": "Meta AI",
    "poe.com": "Poe",
    "grok.com": "Grok",
    "pi.ai": "Pi",
    "character.ai": "Character.AI",
    "perplexity.ai": "Perplexity",
    "www.perplexity.ai": "Perplexity",
    "phind.com": "Phind",
    "andi.com": "Andi",
    "you.com": "You.com",
    "cursor.com": "Cursor",
    "jasper.ai": "Jasper",
    "news.ycombinator.com": "Hacker News",
    "stripe.com": "Stripe",
    "checkout.stripe.com": "Stripe",
    "substack.com": "Substack",
    "discord.com": "Discord",
    "wikipedia.org": "Wikipedia",
    "en.wikipedia.org": "Wikipedia",
    "www.wikipedia.org": "Wikipedia",
  };

  return commonSites[hostname] || hostname;
};

export const extractDomain = (url: string): string | null => {
  try {
    if (!url || url === "direct") return null;
    if (url.startsWith("android-app://")) {
      const match = url.match(/android-app:\/\/([^/]+)/);
      return match ? match[1] : null;
    }
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
};

export function Channel({
  channel,
  referrer,
  onClick,
}: {
  channel: string;
  referrer: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const domain = extractDomain(referrer);

  if (domain) {
    const displayName = getDisplayName(domain);
    return (
      <Badge
        className={`flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 ${onClick ? "cursor-pointer hover:opacity-70" : ""}`}
        onClick={onClick}
      >
        <Favicon domain={domain} className="w-4 h-4" />
        <span>{displayName}</span>
      </Badge>
    );
  }

  return (
    <Badge
      className={`flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 ${onClick ? "cursor-pointer hover:opacity-70" : ""}`}
      onClick={onClick}
    >
      <ChannelIcon channel={channel} />
      <span>{channel}</span>
    </Badge>
  );
}
