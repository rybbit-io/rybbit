import {
  Calendar,
  DollarSign,
  ExternalLink,
  FileQuestion,
  FileText,
  Handshake,
  Headphones,
  HelpCircle,
  Link,
  Mail,
  Monitor,
  Search,
  ShoppingCart,
  Users,
  Video,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Favicon } from "./Favicon";
import { Badge } from "./ui/badge";

export const ChannelIcon = ({ channel, className }: { channel: string; className?: string }) => {
  switch (channel) {
    case "Direct":
      return <Link className={cn("w-4 h-4", className)} />;
    case "Organic Search":
      return <Search className={cn("w-4 h-4", className)} />;
    case "Referral":
      return <ExternalLink className={cn("w-4 h-4", className)} />;
    case "Organic Social":
      return <Users className={cn("w-4 h-4", className)} />;
    case "Email":
      return <Mail className={cn("w-4 h-4", className)} />;
    case "Unknown":
      return <HelpCircle className={cn("w-4 h-4", className)} />;
    case "Paid Search":
      return <Search className={cn("w-4 h-4", className)} />;
    case "Paid Unknown":
      return <DollarSign className={cn("w-4 h-4", className)} />;
    case "Paid Social":
      return <Users className={cn("w-4 h-4", className)} />;
    case "Display":
      return <Monitor className={cn("w-4 h-4", className)} />;
    case "Organic Video":
      return <Video className={cn("w-4 h-4", className)} />;
    case "Affiliate":
      return <Handshake className={cn("w-4 h-4", className)} />;
    case "Content":
      return <FileText className={cn("w-4 h-4", className)} />;
    case "Organic Shopping":
      return <ShoppingCart className={cn("w-4 h-4", className)} />;
    case "Event":
      return <Calendar className={cn("w-4 h-4", className)} />;
    case "Audio":
      return <Headphones className={cn("w-4 h-4", className)} />;
    default:
      return <FileQuestion className={cn("w-4 h-4", className)} />;
  }
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
    "perplexity.ai": "Perplexity",
    "www.perplexity.ai": "Perplexity",
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

export function Channel({ channel, referrer }: { channel: string; referrer: string }) {
  const domain = extractDomain(referrer);

  if (domain) {
    const displayName = getDisplayName(domain);
    return (
      <Badge className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
        <Favicon domain={domain} className="w-4 h-4" />
        <span>{displayName}</span>
      </Badge>
    );
  }

  return (
    <Badge className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
      <ChannelIcon channel={channel} />
      <span>{channel}</span>
    </Badge>
  );
}
