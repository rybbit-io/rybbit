import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Tool {
  name: string;
  description: string;
  href: string;
  category: "seo" | "analytics" | "privacy" | "social-media";
  platform?: string;
  toolType?: string;
}

// Helper function to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const allTools: Tool[] = [
  // SEO Tools
  {
    name: "SEO Title Generator",
    description: "Generate optimized title tags for better rankings",
    href: "/tools/seo-title-generator",
    category: "seo",
  },
  {
    name: "Meta Description Generator",
    description: "Create compelling meta descriptions that boost CTR",
    href: "/tools/meta-description-generator",
    category: "seo",
  },
  {
    name: "OG Tag Generator",
    description: "Generate Open Graph tags for social sharing",
    href: "/tools/og-tag-generator",
    category: "seo",
  },
  {
    name: "UTM Builder",
    description: "Build campaign URLs with UTM parameters",
    href: "/tools/utm-builder",
    category: "seo",
  },

  // Calculator/Analytics Tools
  {
    name: "CTR Calculator",
    description: "Calculate click-through rates and compare to benchmarks",
    href: "/tools/ctr-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Bounce Rate Calculator",
    description: "Analyze bounce rates and identify issues",
    href: "/tools/bounce-rate-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Marketing ROI Calculator",
    description: "Calculate return on investment for marketing campaigns",
    href: "/tools/marketing-roi-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Sample Size Calculator",
    description: "Determine A/B test sample sizes for statistical significance",
    href: "/tools/sample-size-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Traffic Value Calculator",
    description: "Calculate the monetary value of your website traffic",
    href: "/tools/traffic-value-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Page Speed Calculator",
    description: "Calculate revenue impact of page speed improvements",
    href: "/tools/page-speed-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Funnel Visualizer",
    description: "Visualize and analyze conversion funnels",
    href: "/tools/funnel-visualizer",
    category: "analytics",
  },
  {
    name: "Cost Per Acquisition Calculator",
    description: "Calculate customer acquisition costs and compare benchmarks",
    href: "/tools/cost-per-acquisition-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Retention Rate Calculator",
    description: "Calculate and optimize customer retention rates",
    href: "/tools/retention-rate-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Conversion Rate Calculator",
    description: "Calculate conversion rates and optimize your funnel",
    href: "/tools/conversion-rate-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "CPM Calculator",
    description: "Calculate cost per thousand impressions across platforms",
    href: "/tools/cost-per-mille-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Customer Lifetime Value Calculator",
    description: "Calculate CLV with retention analysis and profit margins",
    href: "/tools/customer-lifetime-value-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Cost Per Lead Calculator",
    description: "Calculate CPL and compare across marketing channels",
    href: "/tools/cost-per-lead-calculator",
    category: "analytics",
    toolType: "calculator",
  },
  {
    name: "Cost Per View Calculator",
    description: "Calculate CPV for video ads across platforms",
    href: "/tools/cost-per-view-calculator",
    category: "analytics",
    toolType: "calculator",
  },

  // Privacy Tools
  {
    name: "Analytics Detector",
    description: "Detect analytics tools on any website",
    href: "/tools/analytics-detector",
    category: "privacy",
  },
  {
    name: "AI Privacy Policy Generator",
    description: "Generate GDPR-compliant privacy policies with AI",
    href: "/tools/ai-privacy-policy-generator",
    category: "privacy",
  },
  {
    name: "Privacy Policy Builder",
    description: "Build custom privacy policies for your website",
    href: "/tools/privacy-policy-builder",
    category: "privacy",
  },

  // Font Generators
  {
    name: "LinkedIn Font Generator",
    description: "Transform text into stylish Unicode fonts for LinkedIn",
    href: "/tools/linkedin-font-generator",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "Discord Font Generator",
    description: "Create unique text styles for Discord servers and chats",
    href: "/tools/discord-font-generator",
    category: "social-media",
    platform: "discord",
  },
  {
    name: "X Font Generator",
    description: "Generate eye-catching Unicode fonts for X (Twitter)",
    href: "/tools/x-font-generator",
    category: "social-media",
    platform: "x",
  },
  {
    name: "Reddit Font Generator",
    description: "Stand out in Reddit posts with stylish Unicode fonts",
    href: "/tools/reddit-font-generator",
    category: "social-media",
    platform: "reddit",
  },
  {
    name: "Facebook Font Generator",
    description: "Create distinctive text for Facebook posts and bio",
    href: "/tools/facebook-font-generator",
    category: "social-media",
    platform: "facebook",
  },
  {
    name: "Instagram Font Generator",
    description: "Enhance Instagram captions with unique Unicode fonts",
    href: "/tools/instagram-font-generator",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "Threads Font Generator",
    description: "Transform text for Threads posts and replies",
    href: "/tools/threads-font-generator",
    category: "social-media",
    platform: "threads",
  },
  {
    name: "YouTube Font Generator",
    description: "Create stylish Unicode fonts for YouTube titles and descriptions",
    href: "/tools/youtube-font-generator",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "TikTok Font Generator",
    description: "Generate trendy Unicode fonts for TikTok bios and captions",
    href: "/tools/tiktok-font-generator",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "Pinterest Font Generator",
    description: "Create eye-catching text for Pinterest pins and boards",
    href: "/tools/pinterest-font-generator",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "VK Font Generator",
    description: "Transform text into unique fonts for VK posts",
    href: "/tools/vk-font-generator",
    category: "social-media",
    platform: "vk",
  },
  {
    name: "Bluesky Font Generator",
    description: "Generate stylish Unicode fonts for Bluesky posts",
    href: "/tools/bluesky-font-generator",
    category: "social-media",
    platform: "bluesky",
  },
  {
    name: "Lemmy Font Generator",
    description: "Create distinctive text for Lemmy posts and comments",
    href: "/tools/lemmy-font-generator",
    category: "social-media",
    platform: "lemmy",
  },
  {
    name: "Slack Font Generator",
    description: "Transform text for Slack messages and status",
    href: "/tools/slack-font-generator",
    category: "social-media",
    platform: "slack",
  },
  {
    name: "Mastodon Font Generator",
    description: "Generate unique Unicode fonts for Mastodon toots",
    href: "/tools/mastodon-font-generator",
    category: "social-media",
    platform: "mastodon",
  },
  {
    name: "Warpcast Font Generator",
    description: "Create stylish text for Warpcast on Farcaster",
    href: "/tools/warpcast-font-generator",
    category: "social-media",
    platform: "warpcast",
  },
  {
    name: "Telegram Font Generator",
    description: "Transform text for Telegram messages and channels",
    href: "/tools/telegram-font-generator",
    category: "social-media",
    platform: "telegram",
  },
  {
    name: "Nostr Font Generator",
    description: "Generate Unicode fonts for Nostr notes and profiles",
    href: "/tools/nostr-font-generator",
    category: "social-media",
    platform: "nostr",
  },
  {
    name: "Dribbble Font Generator",
    description: "Create eye-catching text for Dribbble shot descriptions",
    href: "/tools/dribbble-font-generator",
    category: "social-media",
    platform: "dribbble",
  },

  // Comment Generators
  {
    name: "LinkedIn Comment Generator",
    description: "Generate professional LinkedIn comments with AI",
    href: "/tools/linkedin-comment-generator",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "Discord Comment Generator",
    description: "Generate engaging Discord comments and replies with AI",
    href: "/tools/discord-comment-generator",
    category: "social-media",
    platform: "discord",
  },
  {
    name: "X (Twitter) Comment Generator",
    description: "Generate engaging X (Twitter) replies with AI",
    href: "/tools/x-comment-generator",
    category: "social-media",
    platform: "x",
  },
  {
    name: "Reddit Comment Generator",
    description: "Generate thoughtful Reddit comments with AI",
    href: "/tools/reddit-comment-generator",
    category: "social-media",
    platform: "reddit",
  },
  {
    name: "Facebook Comment Generator",
    description: "Generate friendly Facebook comments with AI",
    href: "/tools/facebook-comment-generator",
    category: "social-media",
    platform: "facebook",
  },
  {
    name: "Instagram Comment Generator",
    description: "Generate engaging Instagram comments with AI",
    href: "/tools/instagram-comment-generator",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "Threads Comment Generator",
    description: "Generate thoughtful Threads replies with AI",
    href: "/tools/threads-comment-generator",
    category: "social-media",
    platform: "threads",
  },
  {
    name: "YouTube Comment Generator",
    description: "Generate engaging YouTube comments with AI",
    href: "/tools/youtube-comment-generator",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "TikTok Comment Generator",
    description: "Generate trendy TikTok comments with AI",
    href: "/tools/tiktok-comment-generator",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "Pinterest Comment Generator",
    description: "Generate helpful Pinterest comments with AI",
    href: "/tools/pinterest-comment-generator",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "VK Comment Generator",
    description: "Generate engaging VK comments with AI",
    href: "/tools/vk-comment-generator",
    category: "social-media",
    platform: "vk",
  },
  {
    name: "Bluesky Comment Generator",
    description: "Generate thoughtful Bluesky replies with AI",
    href: "/tools/bluesky-comment-generator",
    category: "social-media",
    platform: "bluesky",
  },
  {
    name: "Lemmy Comment Generator",
    description: "Generate thoughtful Lemmy comments with AI",
    href: "/tools/lemmy-comment-generator",
    category: "social-media",
    platform: "lemmy",
  },
  {
    name: "Slack Comment Generator",
    description: "Generate professional Slack responses with AI",
    href: "/tools/slack-comment-generator",
    category: "social-media",
    platform: "slack",
  },
  {
    name: "Mastodon Comment Generator",
    description: "Generate thoughtful Mastodon replies with AI",
    href: "/tools/mastodon-comment-generator",
    category: "social-media",
    platform: "mastodon",
  },
  {
    name: "Warpcast Comment Generator",
    description: "Generate engaging Warpcast replies with AI",
    href: "/tools/warpcast-comment-generator",
    category: "social-media",
    platform: "warpcast",
  },
  {
    name: "Telegram Comment Generator",
    description: "Generate engaging Telegram comments with AI",
    href: "/tools/telegram-comment-generator",
    category: "social-media",
    platform: "telegram",
  },
  {
    name: "Nostr Comment Generator",
    description: "Generate thoughtful Nostr replies with AI",
    href: "/tools/nostr-comment-generator",
    category: "social-media",
    platform: "nostr",
  },
  {
    name: "Dribbble Comment Generator",
    description: "Generate constructive Dribbble comments with AI",
    href: "/tools/dribbble-comment-generator",
    category: "social-media",
    platform: "dribbble",
  },

  // Page Name Generators
  {
    name: "LinkedIn Page Name Generator",
    description: "Generate professional LinkedIn page names with AI",
    href: "/tools/linkedin-page-name-generator",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "Discord Server Name Generator",
    description: "Generate creative Discord server names with AI",
    href: "/tools/discord-page-name-generator",
    category: "social-media",
    platform: "discord",
  },
  {
    name: "X (Twitter) Name Generator",
    description: "Generate catchy X (Twitter) display names with AI",
    href: "/tools/x-page-name-generator",
    category: "social-media",
    platform: "x",
  },
  {
    name: "Reddit Community Name Generator",
    description: "Generate engaging Reddit subreddit names with AI",
    href: "/tools/reddit-page-name-generator",
    category: "social-media",
    platform: "reddit",
  },
  {
    name: "Facebook Page Name Generator",
    description: "Generate professional Facebook page names with AI",
    href: "/tools/facebook-page-name-generator",
    category: "social-media",
    platform: "facebook",
  },
  {
    name: "Instagram Name Generator",
    description: "Generate creative Instagram display names with AI",
    href: "/tools/instagram-page-name-generator",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "YouTube Channel Name Generator",
    description: "Generate catchy YouTube channel names with AI",
    href: "/tools/youtube-page-name-generator",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "TikTok Name Generator",
    description: "Generate trendy TikTok display names with AI",
    href: "/tools/tiktok-page-name-generator",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "Pinterest Board Name Generator",
    description: "Generate organized Pinterest board names with AI",
    href: "/tools/pinterest-page-name-generator",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "Slack Channel Name Generator",
    description: "Generate organized Slack channel names with AI",
    href: "/tools/slack-page-name-generator",
    category: "social-media",
    platform: "slack",
  },
  {
    name: "Telegram Group Name Generator",
    description: "Generate engaging Telegram group names with AI",
    href: "/tools/telegram-page-name-generator",
    category: "social-media",
    platform: "telegram",
  },
  {
    name: "Twitch Channel Name Generator",
    description: "Generate catchy Twitch channel names with AI",
    href: "/tools/twitch-page-name-generator",
    category: "social-media",
    platform: "twitch",
  },
  {
    name: "Spotify Playlist Name Generator",
    description: "Generate creative Spotify playlist names with AI",
    href: "/tools/spotify-page-name-generator",
    category: "social-media",
    platform: "spotify",
  },
  {
    name: "GitHub Repository Name Generator",
    description: "Generate clear GitHub repository names with AI",
    href: "/tools/github-page-name-generator",
    category: "social-media",
    platform: "github",
  },
  {
    name: "Medium Publication Name Generator",
    description: "Generate compelling Medium publication names with AI",
    href: "/tools/medium-page-name-generator",
    category: "social-media",
    platform: "medium",
  },
  {
    name: "Substack Newsletter Name Generator",
    description: "Generate engaging Substack newsletter names with AI",
    href: "/tools/substack-page-name-generator",
    category: "social-media",
    platform: "substack",
  },

  // Post Generators
  {
    name: "LinkedIn Post Generator",
    description: "Generate professional LinkedIn posts with AI",
    href: "/tools/linkedin-post-generator",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "X (Twitter) Post Generator",
    description: "Generate engaging X (Twitter) posts with AI",
    href: "/tools/x-post-generator",
    category: "social-media",
    platform: "x",
  },
  {
    name: "Facebook Post Generator",
    description: "Generate engaging Facebook posts with AI",
    href: "/tools/facebook-post-generator",
    category: "social-media",
    platform: "facebook",
  },
  {
    name: "Instagram Caption Generator",
    description: "Generate creative Instagram captions with AI",
    href: "/tools/instagram-post-generator",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "Threads Post Generator",
    description: "Generate engaging Threads posts with AI",
    href: "/tools/threads-post-generator",
    category: "social-media",
    platform: "threads",
  },
  {
    name: "Reddit Post Generator",
    description: "Generate authentic Reddit posts with AI",
    href: "/tools/reddit-post-generator",
    category: "social-media",
    platform: "reddit",
  },
  {
    name: "TikTok Caption Generator",
    description: "Generate trendy TikTok captions with AI",
    href: "/tools/tiktok-post-generator",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "YouTube Description Generator",
    description: "Generate optimized YouTube descriptions with AI",
    href: "/tools/youtube-post-generator",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "Pinterest Pin Description Generator",
    description: "Generate compelling Pinterest descriptions with AI",
    href: "/tools/pinterest-post-generator",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "Medium Article Intro Generator",
    description: "Generate compelling Medium article intros with AI",
    href: "/tools/medium-post-generator",
    category: "social-media",
    platform: "medium",
  },
  {
    name: "Substack Newsletter Post Generator",
    description: "Generate engaging Substack posts with AI",
    href: "/tools/substack-post-generator",
    category: "social-media",
    platform: "substack",
  },

  // Username Generators
  {
    name: "Instagram Username Generator",
    description: "Generate creative Instagram usernames with AI",
    href: "/tools/instagram-username-generator",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "TikTok Username Generator",
    description: "Generate catchy TikTok usernames with AI",
    href: "/tools/tiktok-username-generator",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "X (Twitter) Username Generator",
    description: "Generate memorable X (Twitter) usernames with AI",
    href: "/tools/x-username-generator",
    category: "social-media",
    platform: "x",
  },
  {
    name: "Twitch Username Generator",
    description: "Generate gaming-focused Twitch usernames with AI",
    href: "/tools/twitch-username-generator",
    category: "social-media",
    platform: "twitch",
  },
  {
    name: "YouTube Username Generator",
    description: "Generate memorable YouTube handles with AI",
    href: "/tools/youtube-username-generator",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "Reddit Username Generator",
    description: "Generate creative Reddit usernames with AI",
    href: "/tools/reddit-username-generator",
    category: "social-media",
    platform: "reddit",
  },
  {
    name: "Discord Username Generator",
    description: "Generate unique Discord usernames with AI",
    href: "/tools/discord-username-generator",
    category: "social-media",
    platform: "discord",
  },
  {
    name: "GitHub Username Generator",
    description: "Generate professional GitHub usernames with AI",
    href: "/tools/github-username-generator",
    category: "social-media",
    platform: "github",
  },
  {
    name: "Pinterest Username Generator",
    description: "Generate creative Pinterest usernames with AI",
    href: "/tools/pinterest-username-generator",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "Snapchat Username Generator",
    description: "Generate fun Snapchat usernames with AI",
    href: "/tools/snapchat-username-generator",
    category: "social-media",
    platform: "snapchat",
  },
  {
    name: "Spotify Username Generator",
    description: "Generate creative Spotify usernames with AI",
    href: "/tools/spotify-username-generator",
    category: "social-media",
    platform: "spotify",
  },
  {
    name: "Steam Username Generator",
    description: "Generate gaming-focused Steam usernames with AI",
    href: "/tools/steam-username-generator",
    category: "social-media",
    platform: "steam",
  },
  {
    name: "LinkedIn Custom URL Generator",
    description: "Generate professional LinkedIn URLs with AI",
    href: "/tools/linkedin-username-generator",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "Medium Username Generator",
    description: "Generate professional Medium usernames with AI",
    href: "/tools/medium-username-generator",
    category: "social-media",
    platform: "medium",
  },
  {
    name: "Substack URL Generator",
    description: "Generate professional Substack URLs with AI",
    href: "/tools/substack-username-generator",
    category: "social-media",
    platform: "substack",
  },

  // Hashtag Generators
  {
    name: "Instagram Hashtag Generator",
    description: "Generate strategic Instagram hashtags to boost discoverability",
    href: "/tools/instagram-hashtag-generator",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "TikTok Hashtag Generator",
    description: "Generate trending TikTok hashtags to increase visibility",
    href: "/tools/tiktok-hashtag-generator",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "X (Twitter) Hashtag Generator",
    description: "Generate impactful X hashtags to join conversations",
    href: "/tools/x-hashtag-generator",
    category: "social-media",
    platform: "x",
  },
  {
    name: "LinkedIn Hashtag Generator",
    description: "Generate professional LinkedIn hashtags for networking",
    href: "/tools/linkedin-hashtag-generator",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "Facebook Hashtag Generator",
    description: "Generate effective Facebook hashtags for reach",
    href: "/tools/facebook-hashtag-generator",
    category: "social-media",
    platform: "facebook",
  },
  {
    name: "YouTube Hashtag Generator",
    description: "Generate SEO-optimized YouTube hashtags for videos",
    href: "/tools/youtube-hashtag-generator",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "Pinterest Hashtag Generator",
    description: "Generate Pinterest hashtags to improve pin discoverability",
    href: "/tools/pinterest-hashtag-generator",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "Threads Hashtag Generator",
    description: "Generate engaging Threads hashtags for conversations",
    href: "/tools/threads-hashtag-generator",
    category: "social-media",
    platform: "threads",
  },
  {
    name: "Tumblr Tag Generator",
    description: "Generate creative Tumblr tags for community discovery",
    href: "/tools/tumblr-hashtag-generator",
    category: "social-media",
    platform: "tumblr",
  },

  // Character Counters
  {
    name: "X (Twitter) Character Counter",
    description: "Count characters for X posts and stay within the 280-character limit",
    href: "/tools/x-character-counter",
    category: "social-media",
    platform: "x",
  },
  {
    name: "Threads Character Counter",
    description: "Count characters for Threads posts with 500-character limit tracking",
    href: "/tools/threads-character-counter",
    category: "social-media",
    platform: "threads",
  },
  {
    name: "Instagram Caption Character Counter",
    description: "Count characters for Instagram captions within the 2,200-character limit",
    href: "/tools/instagram-character-counter",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "Facebook Post Character Counter",
    description: "Count characters for Facebook posts with recommended length guidance",
    href: "/tools/facebook-character-counter",
    category: "social-media",
    platform: "facebook",
  },
  {
    name: "LinkedIn Post Character Counter",
    description: "Count characters for LinkedIn posts within the 3,000-character limit",
    href: "/tools/linkedin-character-counter",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "TikTok Caption Character Counter",
    description: "Count characters for TikTok captions with 2,200-character limit",
    href: "/tools/tiktok-character-counter",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "YouTube Description Character Counter",
    description: "Count characters for YouTube descriptions within 5,000-character limit",
    href: "/tools/youtube-character-counter",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "Pinterest Pin Description Counter",
    description: "Count characters for Pinterest descriptions within 500-character limit",
    href: "/tools/pinterest-character-counter",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "Reddit Post Title Character Counter",
    description: "Count characters for Reddit titles within the 300-character limit",
    href: "/tools/reddit-character-counter",
    category: "social-media",
    platform: "reddit",
  },
  {
    name: "Mastodon Post Character Counter",
    description: "Count characters for Mastodon toots with 500-character default limit",
    href: "/tools/mastodon-character-counter",
    category: "social-media",
    platform: "mastodon",
  },
  {
    name: "Bluesky Post Character Counter",
    description: "Count characters for Bluesky posts within the 300-character limit",
    href: "/tools/bluesky-character-counter",
    category: "social-media",
    platform: "bluesky",
  },

  // Bio Generators
  {
    name: "Instagram Bio Generator",
    description: "Generate compelling Instagram bios with AI within 150-character limit",
    href: "/tools/instagram-bio-generator",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "X (Twitter) Bio Generator",
    description: "Generate impactful X bios with AI within 160-character limit",
    href: "/tools/x-bio-generator",
    category: "social-media",
    platform: "x",
  },
  {
    name: "TikTok Bio Generator",
    description: "Generate engaging TikTok bios with AI within 80-character limit",
    href: "/tools/tiktok-bio-generator",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "LinkedIn Bio Generator",
    description: "Generate professional LinkedIn About sections with AI",
    href: "/tools/linkedin-bio-generator",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "Threads Bio Generator",
    description: "Generate conversational Threads bios with AI",
    href: "/tools/threads-bio-generator",
    category: "social-media",
    platform: "threads",
  },
  {
    name: "YouTube Channel Description Generator",
    description: "Generate compelling YouTube channel descriptions with AI",
    href: "/tools/youtube-bio-generator",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "Pinterest Bio Generator",
    description: "Generate Pinterest profile bios with AI",
    href: "/tools/pinterest-bio-generator",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "GitHub Bio Generator",
    description: "Generate professional GitHub bios with AI",
    href: "/tools/github-bio-generator",
    category: "social-media",
    platform: "github",
  },
  {
    name: "Twitch Bio Generator",
    description: "Generate engaging Twitch bios with AI",
    href: "/tools/twitch-bio-generator",
    category: "social-media",
    platform: "twitch",
  },
  {
    name: "Medium Bio Generator",
    description: "Generate compelling Medium bios with AI",
    href: "/tools/medium-bio-generator",
    category: "social-media",
    platform: "medium",
  },
  {
    name: "Substack Bio Generator",
    description: "Generate Substack author bios with AI",
    href: "/tools/substack-bio-generator",
    category: "social-media",
    platform: "substack",
  },
  {
    name: "Mastodon Bio Generator",
    description: "Generate thoughtful Mastodon bios with AI",
    href: "/tools/mastodon-bio-generator",
    category: "social-media",
    platform: "mastodon",
  },
  {
    name: "Bluesky Bio Generator",
    description: "Generate engaging Bluesky bios with AI",
    href: "/tools/bluesky-bio-generator",
    category: "social-media",
    platform: "bluesky",
  },
  {
    name: "Discord Bio Generator",
    description: "Generate Discord About Me bios with AI",
    href: "/tools/discord-bio-generator",
    category: "social-media",
    platform: "discord",
  },
  {
    name: "Reddit Bio Generator",
    description: "Generate Reddit profile bios with AI",
    href: "/tools/reddit-bio-generator",
    category: "social-media",
    platform: "reddit",
  },
  {
    name: "Spotify Bio Generator",
    description: "Generate Spotify artist bios with AI",
    href: "/tools/spotify-bio-generator",
    category: "social-media",
    platform: "spotify",
  },

  // Image Resizers
  {
    name: "Facebook Photo Resizer",
    description: "Resize images for Facebook profiles, covers, posts, and stories",
    href: "/tools/facebook-image-resizer",
    category: "social-media",
    platform: "facebook",
  },
  {
    name: "Instagram Photo Resizer",
    description: "Crop and resize photos for Instagram posts, stories, and profiles",
    href: "/tools/instagram-image-resizer",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "X (Twitter) Photo Resizer",
    description: "Resize images for X posts, headers, and profile pictures",
    href: "/tools/x-image-resizer",
    category: "social-media",
    platform: "x",
  },
  {
    name: "LinkedIn Photo Resizer",
    description: "Professional image resizing for LinkedIn profiles and banners",
    href: "/tools/linkedin-image-resizer",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "YouTube Photo Resizer",
    description: "Create perfect YouTube thumbnails and channel art",
    href: "/tools/youtube-image-resizer",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "TikTok Photo Resizer",
    description: "Resize images for TikTok profile pictures and video covers",
    href: "/tools/tiktok-image-resizer",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "Pinterest Photo Resizer",
    description: "Create perfectly sized Pins and board covers",
    href: "/tools/pinterest-image-resizer",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "Discord Photo Resizer",
    description: "Resize images for Discord avatars, server icons, and banners",
    href: "/tools/discord-image-resizer",
    category: "social-media",
    platform: "discord",
  },
  {
    name: "Reddit Photo Resizer",
    description: "Resize images for Reddit community icons, banners, and posts",
    href: "/tools/reddit-image-resizer",
    category: "social-media",
    platform: "reddit",
  },
  {
    name: "Twitch Photo Resizer",
    description: "Create Twitch offline screens, profile banners, and panel images",
    href: "/tools/twitch-image-resizer",
    category: "social-media",
    platform: "twitch",
  },
  {
    name: "Bluesky Photo Resizer",
    description: "Resize images for Bluesky profiles and posts",
    href: "/tools/bluesky-image-resizer",
    category: "social-media",
    platform: "bluesky",
  },
  {
    name: "Threads Photo Resizer",
    description: "Resize photos for Threads profiles and posts",
    href: "/tools/threads-image-resizer",
    category: "social-media",
    platform: "threads",
  },
  {
    name: "Mastodon Photo Resizer",
    description: "Resize images for Mastodon profiles and headers",
    href: "/tools/mastodon-image-resizer",
    category: "social-media",
    platform: "mastodon",
  },
  {
    name: "Snapchat Photo Resizer",
    description: "Create content for Snapchat Stories and ads",
    href: "/tools/snapchat-image-resizer",
    category: "social-media",
    platform: "snapchat",
  },
  {
    name: "Spotify Photo Resizer",
    description: "Resize images for Spotify playlists and artist profiles",
    href: "/tools/spotify-image-resizer",
    category: "social-media",
    platform: "spotify",
  },
  {
    name: "Steam Photo Resizer",
    description: "Create Steam avatars and workshop images",
    href: "/tools/steam-image-resizer",
    category: "social-media",
    platform: "steam",
  },
  {
    name: "VK Photo Resizer",
    description: "Resize images for VK posts, communities, and profiles",
    href: "/tools/vk-image-resizer",
    category: "social-media",
    platform: "vk",
  },
  {
    name: "Tumblr Photo Resizer",
    description: "Resize images for Tumblr blogs and posts",
    href: "/tools/tumblr-image-resizer",
    category: "social-media",
    platform: "tumblr",
  },
  {
    name: "Substack Photo Resizer",
    description: "Resize publication logos and cover images for Substack",
    href: "/tools/substack-image-resizer",
    category: "social-media",
    platform: "substack",
  },
  {
    name: "Telegram Photo Resizer",
    description: "Resize images for Telegram profiles and channels",
    href: "/tools/telegram-image-resizer",
    category: "social-media",
    platform: "telegram",
  },
  {
    name: "Nostr Photo Resizer",
    description: "Resize images for Nostr clients",
    href: "/tools/nostr-image-resizer",
    category: "social-media",
    platform: "nostr",
  },
  {
    name: "Dribbble Photo Resizer",
    description: "Format your design shots for Dribbble",
    href: "/tools/dribbble-image-resizer",
    category: "social-media",
    platform: "dribbble",
  },
  {
    name: "Lemmy Photo Resizer",
    description: "Resize icons and banners for Lemmy communities",
    href: "/tools/lemmy-image-resizer",
    category: "social-media",
    platform: "lemmy",
  },
  {
    name: "Slack Photo Resizer",
    description: "Create perfect Slack profile photos and emojis",
    href: "/tools/slack-image-resizer",
    category: "social-media",
    platform: "slack",
  },
  {
    name: "Medium Photo Resizer",
    description: "Resize images for Medium articles and profiles",
    href: "/tools/medium-image-resizer",
    category: "social-media",
    platform: "medium",
  },
  {
    name: "GitHub Photo Resizer",
    description: "Resize images for GitHub profiles and social previews",
    href: "/tools/github-image-resizer",
    category: "social-media",
    platform: "github",
  },
  {
    name: "Warpcast Photo Resizer",
    description: "Resize images for Farcaster/Warpcast profiles",
    href: "/tools/warpcast-image-resizer",
    category: "social-media",
    platform: "warpcast",
  },

  // Logo Generators
  {
    name: "Instagram Logo Generator",
    description: "Generate unique brand logos for Instagram with AI",
    href: "/tools/instagram-logo-generator",
    category: "social-media",
    platform: "instagram",
  },
  {
    name: "X (Twitter) Logo Generator",
    description: "Generate professional brand logos for X with AI",
    href: "/tools/x-logo-generator",
    category: "social-media",
    platform: "x",
  },
  {
    name: "TikTok Logo Generator",
    description: "Generate creative brand logos for TikTok with AI",
    href: "/tools/tiktok-logo-generator",
    category: "social-media",
    platform: "tiktok",
  },
  {
    name: "LinkedIn Logo Generator",
    description: "Generate professional brand logos for LinkedIn with AI",
    href: "/tools/linkedin-logo-generator",
    category: "social-media",
    platform: "linkedin",
  },
  {
    name: "YouTube Logo Generator",
    description: "Generate channel logos for YouTube with AI",
    href: "/tools/youtube-logo-generator",
    category: "social-media",
    platform: "youtube",
  },
  {
    name: "Facebook Logo Generator",
    description: "Generate brand logos for Facebook with AI",
    href: "/tools/facebook-logo-generator",
    category: "social-media",
    platform: "facebook",
  },
  {
    name: "Pinterest Logo Generator",
    description: "Generate aesthetic brand logos for Pinterest with AI",
    href: "/tools/pinterest-logo-generator",
    category: "social-media",
    platform: "pinterest",
  },
  {
    name: "Discord Logo Generator",
    description: "Generate server logos for Discord with AI",
    href: "/tools/discord-logo-generator",
    category: "social-media",
    platform: "discord",
  },
  {
    name: "Twitch Logo Generator",
    description: "Generate channel logos for Twitch with AI",
    href: "/tools/twitch-logo-generator",
    category: "social-media",
    platform: "twitch",
  },
  {
    name: "Snapchat Logo Generator",
    description: "Generate brand logos for Snapchat with AI",
    href: "/tools/snapchat-logo-generator",
    category: "social-media",
    platform: "snapchat",
  },
  {
    name: "Reddit Logo Generator",
    description: "Generate community logos for Reddit with AI",
    href: "/tools/reddit-logo-generator",
    category: "social-media",
    platform: "reddit",
  },
  {
    name: "Threads Logo Generator",
    description: "Generate brand logos for Threads with AI",
    href: "/tools/threads-logo-generator",
    category: "social-media",
    platform: "threads",
  },
  {
    name: "Bluesky Logo Generator",
    description: "Generate brand logos for Bluesky with AI",
    href: "/tools/bluesky-logo-generator",
    category: "social-media",
    platform: "bluesky",
  },
  {
    name: "Mastodon Logo Generator",
    description: "Generate brand logos for Mastodon with AI",
    href: "/tools/mastodon-logo-generator",
    category: "social-media",
    platform: "mastodon",
  },
  {
    name: "GitHub Logo Generator",
    description: "Generate profile logos for GitHub with AI",
    href: "/tools/github-logo-generator",
    category: "social-media",
    platform: "github",
  },
  {
    name: "Medium Logo Generator",
    description: "Generate publication logos for Medium with AI",
    href: "/tools/medium-logo-generator",
    category: "social-media",
    platform: "medium",
  },
  {
    name: "Substack Logo Generator",
    description: "Generate newsletter logos for Substack with AI",
    href: "/tools/substack-logo-generator",
    category: "social-media",
    platform: "substack",
  },
  {
    name: "Spotify Logo Generator",
    description: "Generate artist or podcast logos for Spotify with AI",
    href: "/tools/spotify-logo-generator",
    category: "social-media",
    platform: "spotify",
  },
  {
    name: "Telegram Logo Generator",
    description: "Generate channel logos for Telegram with AI",
    href: "/tools/telegram-logo-generator",
    category: "social-media",
    platform: "telegram",
  },
  {
    name: "WhatsApp Logo Generator",
    description: "Generate business logos for WhatsApp with AI",
    href: "/tools/whatsapp-logo-generator",
    category: "social-media",
    platform: "whatsapp",
  },
];

interface RelatedToolsProps {
  currentToolHref: string;
  category?: "seo" | "analytics" | "privacy" | "social-media";
  maxTools?: number;
}

export function RelatedTools({ currentToolHref, category, maxTools = 6 }: RelatedToolsProps) {
  // Determine current tool properties
  const currentTool = allTools.find(t => t.href === currentToolHref);
  const currentPlatform = currentTool?.platform;
  const currentToolType = currentTool?.toolType;

  let relatedTools = allTools.filter(tool => tool.href !== currentToolHref);

  // For social media tools: prioritize same platform, randomized
  if (category === "social-media" && currentPlatform) {
    const samePlatform = relatedTools.filter(t => t.platform === currentPlatform);
    const otherTools = relatedTools.filter(t => t.platform !== currentPlatform);
    // Shuffle same-platform tools for link equity distribution
    relatedTools = [...shuffleArray(samePlatform), ...shuffleArray(otherTools)];
  }
  // For calculators: prioritize other calculators, randomized
  else if (currentToolType === "calculator") {
    const otherCalculators = relatedTools.filter(t => t.toolType === "calculator");
    const otherTools = relatedTools.filter(t => t.toolType !== "calculator");
    relatedTools = [...shuffleArray(otherCalculators), ...shuffleArray(otherTools)];
  }
  // Default: prioritize same category
  else if (category) {
    const sameCategory = relatedTools.filter(t => t.category === category);
    const otherCategory = relatedTools.filter(t => t.category !== category);
    relatedTools = [...sameCategory, ...otherCategory];
  }

  // Limit to maxTools
  relatedTools = relatedTools.slice(0, maxTools);

  if (relatedTools.length === 0) {
    return null;
  }

  return (
    <div className="mt-20 pt-16 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">Related Tools</h2>
        <ul className="space-y-3">
          {relatedTools.map(tool => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="group flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                <ArrowRight className="w-4 h-4 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                <span className="font-medium">{tool.name}</span>
                <span className="text-sm text-neutral-500 dark:text-neutral-500">— {tool.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium transition-colors"
        >
          View all tools
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
