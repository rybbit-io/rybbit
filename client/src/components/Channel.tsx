import {
  Link,
  Search,
  ExternalLink,
  Users,
  Mail,
  HelpCircle,
  MousePointerClick,
  DollarSign,
  Monitor,
  Video,
  Handshake,
  FileText,
  ShoppingCart,
  Calendar,
  Headphones,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Favicon } from "./Favicon";

export const getChannelIcon = (channel: string) => {
  switch (channel) {
    case "Direct":
      return <Link className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Organic Search":
      return <Search className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Referral":
      return <ExternalLink className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Organic Social":
      return <Users className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Email":
      return <Mail className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Unknown":
      return <HelpCircle className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Paid Search":
      return <Search className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Paid Unknown":
      return <DollarSign className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Paid Social":
      return <Users className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Display":
      return <Monitor className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Organic Video":
      return <Video className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Affiliate":
      return <Handshake className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Content":
      return <FileText className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Organic Shopping":
      return <ShoppingCart className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Event":
      return <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    case "Audio":
      return <Headphones className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
    default:
      return null;
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
      {getChannelIcon(channel)}
      <span>{channel}</span>
    </Badge>
  );
}
