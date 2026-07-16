export interface CharacterCounterPlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  simpleIconSlug: string;
  colorHex: string;
  characterLimit: number;
  recommendedLimit?: number;
  contentType: string; // e.g., "post", "caption", "tweet", etc.
  educationalContent: string;
  countingRules: string;
  bestPractices: string[];
}

export const characterCounterPlatformConfigs: Record<
  string,
  CharacterCounterPlatformConfig
> = {
  x: {
    id: "x",
    name: "X (Twitter)",
    displayName: "X (Twitter) Character Counter",
    description:
      "Count characters for X (Twitter) posts. Stay within the 280-character limit and craft concise, engaging tweets.",
    simpleIconSlug: "x",
    colorHex: "#000000",
    characterLimit: 280,
    contentType: "tweet",
    countingRules:
      "X counts all characters including spaces, emojis, and punctuation. Links are automatically shortened to 23 characters (http) or 24 characters (https) regardless of actual length.",
    educationalContent: `X (formerly Twitter) has a strict 280-character limit per post. This constraint encourages concise, punchy communication and has become a defining feature of the platform's culture.

Effective X posts make every character count. The best tweets are clear, engaging, and often include a call-to-action or question to drive engagement. Using threads allows you to expand on ideas while keeping each post digestible.`,
    bestPractices: [
      "Keep tweets concise and focused on one idea",
      "Use line breaks for readability",
      "Remember that links count as 23-24 characters",
      "Leave room for retweets with comments",
      "Use threads for longer thoughts",
      "Emojis count as 2 characters each",
    ],
  },
  threads: {
    id: "threads",
    name: "Threads",
    displayName: "Threads Character Counter",
    description:
      "Count characters for Threads posts. Stay within the 500-character limit and create engaging conversational content.",
    simpleIconSlug: "threads",
    colorHex: "#000000",
    characterLimit: 500,
    contentType: "post",
    countingRules:
      "Threads counts all characters including spaces, emojis, and punctuation. The platform encourages more conversational, thread-based content than traditional Twitter.",
    educationalContent: `Threads, Meta's text-based conversation platform, allows up to 500 characters per post. This gives you more room than Twitter/X while still encouraging concise, engaging content.

The platform is designed for conversations and discussion, with a focus on community engagement. The 500-character limit strikes a balance between brevity and substance, allowing for more nuanced thoughts than Twitter while remaining more digestible than long-form content.`,
    bestPractices: [
      "Use the extra space for context and nuance",
      "Break longer thoughts into thread replies",
      "Engage conversationally with your audience",
      "Include calls-to-action or questions",
      "Use line breaks for better readability",
      "Stay authentic and personal in tone",
    ],
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    displayName: "Instagram Caption Character Counter",
    description:
      "Count characters for Instagram captions. Stay within the 2,200-character limit and craft compelling visual stories.",
    simpleIconSlug: "instagram",
    colorHex: "#E4405F",
    characterLimit: 2200,
    recommendedLimit: 125,
    contentType: "caption",
    countingRules:
      "Instagram allows up to 2,200 characters for captions. However, only the first 125 characters appear before the 'more' button, so front-load important information.",
    educationalContent: `Instagram captions can be up to 2,200 characters, but only the first 125 characters are visible before users tap "more." This makes the opening crucial for engagement.

Effective Instagram captions tell a story, provide context, or ask questions that drive comments. Many successful accounts use longer captions to build community and share authentic moments, while others keep it short and emoji-heavy. The key is knowing your audience and matching their preferences.`,
    bestPractices: [
      "Front-load key information in first 125 characters",
      "Use emojis for visual breaks and personality",
      "Add hashtags at the end or in first comment",
      "Include a call-to-action",
      "Use line breaks for readability (use invisible characters if needed)",
      "Match caption length to content type and audience",
    ],
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    displayName: "Facebook Post Character Counter",
    description:
      "Count characters for Facebook posts. While the limit is 63,206 characters, shorter posts typically perform better.",
    simpleIconSlug: "facebook",
    colorHex: "#1877F2",
    characterLimit: 63206,
    recommendedLimit: 250,
    contentType: "post",
    countingRules:
      "Facebook technically allows up to 63,206 characters, but posts longer than 477 characters are truncated with a 'See More' button. Research shows shorter posts (40-80 characters) often get more engagement.",
    educationalContent: `While Facebook allows extremely long posts (up to 63,206 characters), data shows that shorter posts typically perform better. Posts under 250 characters tend to get higher engagement rates.

Facebook's algorithm favors content that sparks meaningful interactions. Whether you write a short, punchy update or a longer storytelling post, focus on creating value for your audience. The platform truncates posts after about 477 characters, so front-load important information.`,
    bestPractices: [
      "Keep posts under 250 characters for best engagement",
      "Front-load key information before the 'See More' cutoff",
      "Use paragraph breaks for longer posts",
      "Include a clear call-to-action",
      "Ask questions to encourage comments",
      "Match length to content type (updates vs. stories)",
    ],
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    displayName: "LinkedIn Post Character Counter",
    description:
      "Count characters for LinkedIn posts. Stay within the 3,000-character limit and share professional insights.",
    simpleIconSlug: "linkedin",
    colorHex: "#0A66C2",
    characterLimit: 3000,
    recommendedLimit: 150,
    contentType: "post",
    countingRules:
      "LinkedIn allows up to 3,000 characters for posts. Posts longer than 140 characters are truncated with a 'see more' link in the feed, so make your opening count.",
    educationalContent: `LinkedIn posts can be up to 3,000 characters, giving you space for thought leadership and professional insights. However, only the first 140 characters appear in the feed before the 'see more' link.

The most successful LinkedIn posts balance length with value. Longer posts work well for storytelling and insights, but your opening must hook readers immediately. Many top creators use a compelling first line, then expand with bullet points, personal stories, or actionable tips.`,
    bestPractices: [
      "Hook readers in the first 140 characters",
      "Use line breaks and formatting for readability",
      "Include professional insights or value",
      "Ask questions to drive meaningful discussion",
      "Use bullet points for longer posts",
      "End with a clear call-to-action",
    ],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    displayName: "TikTok Caption Character Counter",
    description:
      "Count characters for TikTok captions. Stay within the 2,200-character limit and create engaging video descriptions.",
    simpleIconSlug: "tiktok",
    colorHex: "#000000",
    characterLimit: 2200,
    recommendedLimit: 150,
    contentType: "caption",
    countingRules:
      "TikTok allows up to 2,200 characters for video captions. However, only the first 80-100 characters are visible before users tap 'more,' so front-load your hook.",
    educationalContent: `TikTok captions can be up to 2,200 characters, but only the first 80-100 characters are visible without tapping 'more.' Since TikTok is video-first, captions often play a supporting role.

Effective TikTok captions hook viewers immediately, include relevant hashtags for discoverability, and often end with a question or call-to-action. Many creators use captions to provide context, add humor, or encourage duets and stitches. The key is complementing your video content, not repeating it.`,
    bestPractices: [
      "Hook viewers in the first 80 characters",
      "Include trending and relevant hashtags",
      "Add a call-to-action (like, comment, follow)",
      "Use emojis to convey personality",
      "Keep it concise unless adding crucial context",
      "Match caption tone to video content",
    ],
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    displayName: "YouTube Description Character Counter",
    description:
      "Count characters for YouTube video descriptions. Stay within the 5,000-character limit and optimize for search.",
    simpleIconSlug: "youtube",
    colorHex: "#FF0000",
    characterLimit: 5000,
    recommendedLimit: 200,
    contentType: "video description",
    countingRules:
      "YouTube allows up to 5,000 characters for video descriptions. Only the first 100-150 characters are visible above the 'Show more' button, so front-load important keywords and information.",
    educationalContent: `YouTube video descriptions can be up to 5,000 characters, giving you ample space for SEO, timestamps, links, and context. However, only the first 100-150 characters appear above the fold.

Great YouTube descriptions serve multiple purposes: they help your video rank in search, provide context for viewers, include timestamps for navigation, and add links to related content or products. The opening should include your primary keywords and a compelling hook that encourages viewers to read more.`,
    bestPractices: [
      "Front-load primary keywords in first 150 characters",
      "Include relevant links in the first paragraph",
      "Add detailed timestamps for longer videos",
      "Use keywords naturally throughout",
      "Include calls-to-action (subscribe, like, etc.)",
      "Add links to related videos and playlists",
    ],
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    displayName: "Pinterest Pin Description Counter",
    description:
      "Count characters for Pinterest pin descriptions. Stay within the 500-character limit and optimize for search.",
    simpleIconSlug: "pinterest",
    colorHex: "#E60023",
    characterLimit: 500,
    contentType: "pin description",
    countingRules:
      "Pinterest allows up to 500 characters for pin descriptions. The platform is search-focused, so descriptions should include relevant keywords while being helpful and descriptive.",
    educationalContent: `Pinterest pin descriptions have a 500-character limit and play a crucial role in discoverability. Pinterest is a visual search engine, so descriptions should be keyword-rich while remaining natural and helpful.

Effective pin descriptions tell users what they'll learn or achieve, include relevant keywords for search, and provide enough context to make clicking worthwhile. Since pins are often saved and repinned, clear descriptions help your content reach the right audience over time.`,
    bestPractices: [
      "Include relevant keywords naturally",
      "Describe what users will learn or achieve",
      "Front-load important information",
      "Use a friendly, helpful tone",
      "Include a call-to-action (save, click, try)",
      "Avoid keyword stuffing",
    ],
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    displayName: "Reddit Post Title Character Counter",
    description:
      "Count characters for Reddit post titles. Stay within the 300-character limit and create clear, engaging titles.",
    simpleIconSlug: "reddit",
    colorHex: "#FF4500",
    characterLimit: 300,
    contentType: "post title",
    countingRules:
      "Reddit post titles are limited to 300 characters. Titles should be clear, descriptive, and follow subreddit-specific rules. Text posts can contain up to 40,000 characters.",
    educationalContent: `Reddit post titles have a 300-character limit, though most successful titles are much shorter. Titles must be clear, descriptive, and follow each subreddit's specific rules.

Great Reddit titles balance clarity with intrigue. They should accurately represent the content while being compelling enough to earn clicks and upvotes. Many subreddits have specific title formatting requirements, so always check the rules before posting. Clickbait or misleading titles typically get downvoted or removed.`,
    bestPractices: [
      "Be clear and descriptive",
      "Follow subreddit-specific title rules",
      "Front-load the most important information",
      "Avoid clickbait or misleading titles",
      "Use proper capitalization and formatting",
      "Keep it concise when possible",
    ],
  },
  mastodon: {
    id: "mastodon",
    name: "Mastodon",
    displayName: "Mastodon Post Character Counter",
    description:
      "Count characters for Mastodon posts. Default limit is 500 characters, though this varies by instance.",
    simpleIconSlug: "mastodon",
    colorHex: "#6364FF",
    characterLimit: 500,
    contentType: "post (toot)",
    countingRules:
      "Most Mastodon instances have a 500-character limit for posts (toots), though some instances allow more. Links and mentions count toward the limit, unlike Twitter.",
    educationalContent: `Mastodon's default character limit is 500 characters per post (called a 'toot'), though individual instances can set their own limits. This gives you more space than Twitter/X for nuanced thoughts.

Mastodon culture values thoughtful, conversational posts. The decentralized nature means communities have different norms, but generally, users appreciate content warnings, alt text for images, and respectful discourse. The extra characters allow for more context and nuance than Twitter-style platforms.`,
    bestPractices: [
      "Use content warnings (CW) when appropriate",
      "Add alt text to all images for accessibility",
      "Be respectful and thoughtful in posts",
      "Engage with local and federated timelines",
      "Use hashtags for discoverability",
      "Check your instance's specific character limit",
    ],
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    displayName: "Bluesky Post Character Counter",
    description:
      "Count characters for Bluesky posts. Stay within the 300-character limit and engage in decentralized conversations.",
    simpleIconSlug: "bluesky",
    colorHex: "#1185FE",
    characterLimit: 300,
    contentType: "post",
    countingRules:
      "Bluesky has a 300-character limit per post. The platform uses a decentralized protocol (AT Protocol) and encourages concise, meaningful interactions.",
    educationalContent: `Bluesky posts are limited to 300 characters, creating a middle ground between Twitter/X's 280 and Threads' 500. As a decentralized social network built on the AT Protocol, Bluesky emphasizes user control and portability.

The platform attracts users seeking Twitter-like interactions without centralized control. Effective Bluesky posts are concise, engaging, and often part of broader conversations. The character limit encourages focused thoughts while still allowing for more context than Twitter.`,
    bestPractices: [
      "Keep posts focused and concise",
      "Engage in conversations and threads",
      "Use custom feeds to curate content",
      "Be authentic and conversational",
      "Include relevant context in threads",
      "Participate in community discussions",
    ],
  },
};

export const characterCounterPlatformList = Object.values(
  characterCounterPlatformConfigs
);
