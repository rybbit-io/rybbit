export interface LogoGeneratorPlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  simpleIconSlug: string;
  colorHex: string;
  educationalContent: string;
  contextGuidelines: string;
  recommendedStyles: string[];
}

export const logoGeneratorPlatformConfigs: Record<
  string,
  LogoGeneratorPlatformConfig
> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    displayName: "Instagram Logo Generator",
    description:
      "Generate unique brand logos for Instagram with AI. Create professional logos that stand out in feeds and stories.",
    simpleIconSlug: "instagram",
    colorHex: "#E4405F",
    contextGuidelines:
      "Instagram logos should be vibrant and eye-catching. They need to work well as profile pictures (circular crop) and be recognizable at small sizes in feeds and stories.",
    educationalContent: `A strong Instagram logo is essential for brand recognition on the platform. Your logo appears as your profile picture, in comments, in DMs, and throughout the app. It needs to be instantly recognizable at small sizes.

The best Instagram logos are simple, memorable, and work well in a circular format. They should pop against both light and dark backgrounds since Instagram has light and dark modes. Consider using bold colors that align with Instagram's visual culture.`,
    recommendedStyles: [
      "Modern",
      "Playful",
      "Minimalist",
      "Abstract",
    ],
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    displayName: "X (Twitter) Logo Generator",
    description:
      "Generate professional brand logos for X (Twitter) with AI. Create memorable logos that build your presence on the platform.",
    simpleIconSlug: "x",
    colorHex: "#000000",
    contextGuidelines:
      "X logos should be clean and professional. They appear circular in most places and need to be legible at small sizes in feeds and reply threads.",
    educationalContent: `Your X (Twitter) logo represents your brand across millions of interactions. It appears in your profile, tweets, replies, retweets, and direct messages. A strong logo helps build recognition and trust.

Effective X logos are typically simple and work well in a circular format. Since X has a clean, minimalist interface, logos that are too busy can look out of place. Consider using designs that make a statement while remaining professional.`,
    recommendedStyles: [
      "Minimalist",
      "Professional",
      "Modern",
      "Geometric",
    ],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    displayName: "TikTok Logo Generator",
    description:
      "Generate creative brand logos for TikTok with AI. Create eye-catching logos that resonate with TikTok's young, creative audience.",
    simpleIconSlug: "tiktok",
    colorHex: "#000000",
    contextGuidelines:
      "TikTok logos should be creative and energetic. They need to appeal to a younger demographic and stand out in a fast-scrolling feed.",
    educationalContent: `TikTok is all about creativity and self-expression. Your logo should reflect the platform's energetic, trend-forward culture while still being professional enough for brand partnerships.

The best TikTok logos are bold, creative, and instantly recognizable. They work well as profile pictures and should be memorable enough that viewers remember your brand after scrolling past. Consider using vibrant colors and modern design elements.`,
    recommendedStyles: [
      "Playful",
      "Modern",
      "Abstract",
      "Geometric",
    ],
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    displayName: "LinkedIn Logo Generator",
    description:
      "Generate professional brand logos for LinkedIn with AI. Create polished logos that establish credibility in the business world.",
    simpleIconSlug: "linkedin",
    colorHex: "#0A66C2",
    contextGuidelines:
      "LinkedIn logos must be highly professional. They appear in a business context and need to convey trust, expertise, and credibility.",
    educationalContent: `LinkedIn is the world's largest professional network, making your logo a crucial part of your business identity. It appears on your company page, in employee profiles, job postings, and ads.

Professional LinkedIn logos tend to be clean, trustworthy, and business-appropriate. Avoid overly casual or playful designs. The logo should work well in LinkedIn's predominantly blue interface and convey professionalism at a glance.`,
    recommendedStyles: [
      "Professional",
      "Minimalist",
      "Modern",
      "Geometric",
    ],
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    displayName: "YouTube Logo Generator",
    description:
      "Generate channel logos for YouTube with AI. Create recognizable logos that build your brand across videos and thumbnails.",
    simpleIconSlug: "youtube",
    colorHex: "#FF0000",
    contextGuidelines:
      "YouTube logos should be bold and recognizable. They appear as channel icons, in comments, and sometimes in video thumbnails or watermarks.",
    educationalContent: `Your YouTube channel logo is central to your brand identity on the platform. It appears as your channel icon, in comments, in the subscription feed, and can be used as a watermark on videos.

Successful YouTube logos are typically bold and simple. They need to be recognizable at small sizes in the subscription sidebar and comments section. Many top creators use simple, memorable designs that viewers can instantly identify.`,
    recommendedStyles: [
      "Modern",
      "Playful",
      "Minimalist",
      "Abstract",
    ],
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    displayName: "Facebook Logo Generator",
    description:
      "Generate brand logos for Facebook with AI. Create professional logos for your Facebook page or business profile.",
    simpleIconSlug: "facebook",
    colorHex: "#1877F2",
    contextGuidelines:
      "Facebook logos should be versatile and professional. They appear in various sizes across the platform, from tiny comment icons to larger page headers.",
    educationalContent: `A Facebook logo represents your brand across one of the world's largest social platforms. It appears as your profile picture, in posts, comments, ads, and the Facebook business ecosystem.

Effective Facebook logos work well at multiple sizes and in Facebook's blue-tinted interface. They should be professional enough for business use while still being engaging for social interactions.`,
    recommendedStyles: [
      "Professional",
      "Modern",
      "Minimalist",
      "Playful",
    ],
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    displayName: "Pinterest Logo Generator",
    description:
      "Generate aesthetic brand logos for Pinterest with AI. Create visually appealing logos that fit Pinterest's design-focused platform.",
    simpleIconSlug: "pinterest",
    colorHex: "#BD081C",
    contextGuidelines:
      "Pinterest logos should be visually aesthetic and design-forward. The platform is highly visual, so your logo needs to complement beautiful imagery.",
    educationalContent: `Pinterest is a visual discovery platform where aesthetics matter greatly. Your logo appears alongside carefully curated pins and boards, so it needs to be visually appealing.

The best Pinterest logos are artistic, clean, and design-conscious. They should complement rather than clash with the beautiful imagery on the platform. Consider using designs that feel creative and inspiring.`,
    recommendedStyles: [
      "Minimalist",
      "Modern",
      "Abstract",
      "Hand-drawn",
    ],
  },
  discord: {
    id: "discord",
    name: "Discord",
    displayName: "Discord Logo Generator",
    description:
      "Generate server logos for Discord with AI. Create memorable icons for your Discord server or bot.",
    simpleIconSlug: "discord",
    colorHex: "#5865F2",
    contextGuidelines:
      "Discord logos should be distinctive and work well as circular server icons. They need to stand out in a sidebar full of other servers.",
    educationalContent: `Discord server icons are how members identify your community at a glance. They appear in the server sidebar, invites, and throughout the Discord interface.

Effective Discord logos are bold and distinctive. Since they appear alongside many other server icons in a small sidebar, they need to be instantly recognizable. Many successful servers use simple, memorable designs with bold colors.`,
    recommendedStyles: [
      "Modern",
      "Playful",
      "Geometric",
      "Abstract",
    ],
  },
  twitch: {
    id: "twitch",
    name: "Twitch",
    displayName: "Twitch Logo Generator",
    description:
      "Generate channel logos for Twitch with AI. Create engaging logos that build your streaming brand.",
    simpleIconSlug: "twitch",
    colorHex: "#9146FF",
    contextGuidelines:
      "Twitch logos should be energetic and gamer-friendly. They appear as channel profile pictures and need to stand out in the browse and following sections.",
    educationalContent: `Your Twitch logo is central to your streaming brand. It appears as your profile picture, in chat, in the browse section, and on your channel page.

Successful Twitch logos are often bold, colorful, and gaming-oriented. They should be recognizable at small sizes in chat and the sidebar. Many top streamers use distinctive designs that viewers can instantly identify.`,
    recommendedStyles: [
      "Modern",
      "Playful",
      "Abstract",
      "Geometric",
    ],
  },
  snapchat: {
    id: "snapchat",
    name: "Snapchat",
    displayName: "Snapchat Logo Generator",
    description:
      "Generate brand logos for Snapchat with AI. Create fun, youthful logos for your Snapchat presence.",
    simpleIconSlug: "snapchat",
    colorHex: "#FFFC00",
    contextGuidelines:
      "Snapchat logos should be fun, youthful, and bold. They appear in a platform known for casual, ephemeral content.",
    educationalContent: `Snapchat is a platform centered on fun, casual communication. Your logo should reflect this youthful, energetic spirit while still being recognizable.

Effective Snapchat logos are often playful and bold. They should work well as profile pictures and be memorable enough to stand out in a friend list. Consider using bright colors and friendly designs.`,
    recommendedStyles: [
      "Playful",
      "Modern",
      "Abstract",
      "Geometric",
    ],
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    displayName: "Reddit Logo Generator",
    description:
      "Generate community logos for Reddit with AI. Create distinctive icons for your subreddit or Reddit presence.",
    simpleIconSlug: "reddit",
    colorHex: "#FF4500",
    contextGuidelines:
      "Reddit logos should be distinctive and community-focused. They appear as subreddit icons and user avatars across the platform.",
    educationalContent: `Reddit logos represent communities and individual users across thousands of subreddits. A good logo helps your subreddit or brand stand out in feeds and sidebars.

Effective Reddit logos are often simple and recognizable. They should work well at small sizes in the subreddit sidebar and in feeds. Many successful subreddits use creative designs that reflect their community's theme.`,
    recommendedStyles: [
      "Modern",
      "Playful",
      "Minimalist",
      "Abstract",
    ],
  },
  threads: {
    id: "threads",
    name: "Threads",
    displayName: "Threads Logo Generator",
    description:
      "Generate brand logos for Threads with AI. Create clean, modern logos for Meta's text-based conversation app.",
    simpleIconSlug: "threads",
    colorHex: "#000000",
    contextGuidelines:
      "Threads logos should be clean and modern. The platform has a minimalist aesthetic similar to Twitter/X.",
    educationalContent: `Threads is Meta's text-based conversation platform with a clean, minimalist design. Your logo needs to fit this aesthetic while standing out in conversations.

Effective Threads logos are typically simple and modern. They should work well in a text-heavy interface and be recognizable at small sizes in replies and feeds.`,
    recommendedStyles: [
      "Minimalist",
      "Modern",
      "Professional",
      "Geometric",
    ],
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    displayName: "Bluesky Logo Generator",
    description:
      "Generate brand logos for Bluesky with AI. Create unique logos for the decentralized social platform.",
    simpleIconSlug: "bluesky",
    colorHex: "#0085FF",
    contextGuidelines:
      "Bluesky logos should be modern and forward-thinking. The platform attracts tech-savvy users who appreciate good design.",
    educationalContent: `Bluesky is a decentralized social platform that attracts users who value innovation and good design. Your logo should reflect these values.

Effective Bluesky logos are often modern and tech-forward. They should appeal to a design-conscious audience while remaining professional and recognizable.`,
    recommendedStyles: [
      "Modern",
      "Minimalist",
      "Geometric",
      "Abstract",
    ],
  },
  mastodon: {
    id: "mastodon",
    name: "Mastodon",
    displayName: "Mastodon Logo Generator",
    description:
      "Generate brand logos for Mastodon with AI. Create distinctive logos for the federated social network.",
    simpleIconSlug: "mastodon",
    colorHex: "#6364FF",
    contextGuidelines:
      "Mastodon logos should be distinctive and work across different instances. The decentralized nature means your logo may appear in various contexts.",
    educationalContent: `Mastodon is a federated social network with many different instances and communities. Your logo represents you across this diverse ecosystem.

Effective Mastodon logos are typically distinctive and memorable. They should work well across different instance themes and be recognizable to followers across the fediverse.`,
    recommendedStyles: [
      "Modern",
      "Minimalist",
      "Abstract",
      "Geometric",
    ],
  },
  github: {
    id: "github",
    name: "GitHub",
    displayName: "GitHub Logo Generator",
    description:
      "Generate profile logos for GitHub with AI. Create professional logos for your developer or organization profile.",
    simpleIconSlug: "github",
    colorHex: "#181717",
    contextGuidelines:
      "GitHub logos should be professional and developer-friendly. They appear in a technical context alongside code and documentation.",
    educationalContent: `GitHub is the world's largest code hosting platform, and your logo represents you in the developer community. It appears on your profile, repositories, and contributions.

Effective GitHub logos are typically clean and professional. They should convey technical competence while being distinctive. Many developers and organizations use simple, geometric designs.`,
    recommendedStyles: [
      "Minimalist",
      "Geometric",
      "Modern",
      "Professional",
    ],
  },
  medium: {
    id: "medium",
    name: "Medium",
    displayName: "Medium Logo Generator",
    description:
      "Generate publication logos for Medium with AI. Create elegant logos for your Medium publication or profile.",
    simpleIconSlug: "medium",
    colorHex: "#000000",
    contextGuidelines:
      "Medium logos should be elegant and editorial. They appear in a reading-focused platform that values clean design.",
    educationalContent: `Medium is a platform focused on quality writing and ideas. Your logo appears alongside articles and represents your publication or personal brand to readers.

Effective Medium logos are typically elegant and understated. They should complement written content rather than overshadow it. Consider using designs that feel editorial and sophisticated.`,
    recommendedStyles: [
      "Minimalist",
      "Professional",
      "Modern",
      "Hand-drawn",
    ],
  },
  substack: {
    id: "substack",
    name: "Substack",
    displayName: "Substack Logo Generator",
    description:
      "Generate newsletter logos for Substack with AI. Create distinctive logos for your Substack publication.",
    simpleIconSlug: "substack",
    colorHex: "#FF6719",
    contextGuidelines:
      "Substack logos should be distinctive and personal. They represent your newsletter brand to subscribers.",
    educationalContent: `Substack is a newsletter platform where your logo represents your personal or publication brand. It appears in subscriber inboxes, on your Substack page, and in recommendations.

Effective Substack logos are typically personal and memorable. They should help subscribers identify your newsletter at a glance. Many successful newsletters use distinctive designs that reflect their content's personality.`,
    recommendedStyles: [
      "Minimalist",
      "Modern",
      "Hand-drawn",
      "Abstract",
    ],
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    displayName: "Spotify Logo Generator",
    description:
      "Generate artist or podcast logos for Spotify with AI. Create professional logos for your Spotify presence.",
    simpleIconSlug: "spotify",
    colorHex: "#1DB954",
    contextGuidelines:
      "Spotify logos should be visually striking and work well at album/podcast cover sizes. They appear in a music and audio-focused context.",
    educationalContent: `Spotify logos represent artists, podcasts, and playlists on the world's largest audio streaming platform. Your logo appears as your profile picture and alongside your content.

Effective Spotify logos are typically bold and visually striking. They should work well at various sizes, from small profile thumbnails to larger cover displays. Consider using designs that convey your audio content's mood and style.`,
    recommendedStyles: [
      "Modern",
      "Abstract",
      "Minimalist",
      "Playful",
    ],
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    displayName: "Telegram Logo Generator",
    description:
      "Generate channel logos for Telegram with AI. Create distinctive logos for your Telegram channel or bot.",
    simpleIconSlug: "telegram",
    colorHex: "#26A5E4",
    contextGuidelines:
      "Telegram logos should be clear and distinctive. They appear as channel/bot profile pictures and need to be recognizable in chat lists.",
    educationalContent: `Telegram logos represent channels, bots, and groups on the messaging platform. Your logo appears in chat lists and at the top of your channel or group.

Effective Telegram logos are typically clear and bold. They should be recognizable at small sizes in chat lists and convey your channel's purpose at a glance.`,
    recommendedStyles: [
      "Modern",
      "Minimalist",
      "Geometric",
      "Professional",
    ],
  },
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    displayName: "WhatsApp Logo Generator",
    description:
      "Generate business logos for WhatsApp with AI. Create professional logos for your WhatsApp Business profile.",
    simpleIconSlug: "whatsapp",
    colorHex: "#25D366",
    contextGuidelines:
      "WhatsApp logos should be professional and trustworthy. They appear as business profile pictures in a personal messaging context.",
    educationalContent: `WhatsApp Business logos represent your company in customers' personal messaging space. Your logo appears in chat lists alongside messages from friends and family.

Effective WhatsApp Business logos are typically professional and trustworthy. They should make customers feel comfortable engaging with your business. Consider using designs that convey reliability and professionalism.`,
    recommendedStyles: [
      "Professional",
      "Minimalist",
      "Modern",
      "Geometric",
    ],
  },
};

export const logoGeneratorPlatformList = Object.values(
  logoGeneratorPlatformConfigs
);
