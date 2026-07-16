export interface CommentPlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  characterLimit?: number;
  simpleIconSlug: string;
  colorHex: string;
  educationalContent: string;
  contextGuidelines: string;
}

export const commentPlatformConfigs: Record<string, CommentPlatformConfig> = {
  discord: {
    id: "discord",
    name: "Discord",
    displayName: "Discord Comment Generator",
    description:
      "Generate engaging Discord comments and replies with AI. Create authentic responses for gaming communities, study groups, and Discord servers.",
    characterLimit: 2000,
    simpleIconSlug: "discord",
    colorHex: "#5865F2",
    contextGuidelines:
      "Discord is a casual, community-focused platform. Comments should feel conversational and match the server's vibe. Emojis and reactions are common.",
    educationalContent: `Discord is a platform built around communities and real-time conversation. Comments and replies are essential for building relationships, participating in discussions, and contributing to server culture.

Effective Discord comments are conversational, contextual, and respectful of the community's tone. Whether you're in a gaming server, study group, or hobby community, your comments should add value to the discussion while matching the server's atmosphere.`,
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    displayName: "X (Twitter) Comment Generator",
    description:
      "Generate engaging X (Twitter) replies with AI. Create thoughtful responses and join conversations with authentic, concise comments.",
    characterLimit: 280,
    simpleIconSlug: "x",
    colorHex: "#000000",
    contextGuidelines:
      "X/Twitter prioritizes brevity and impact. Comments should be concise, engaging, and often use hashtags or mentions strategically.",
    educationalContent: `X (formerly Twitter) is a fast-paced platform where replies and comments drive conversations and engagement. The 280-character limit means every word counts.

Effective X comments are concise, timely, and add meaningful perspective to the conversation. They can spark discussions, build connections, or showcase expertise. The best replies balance brevity with substance.`,
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    displayName: "Reddit Comment Generator",
    description:
      "Generate thoughtful Reddit comments with AI. Create detailed responses for discussions, threads, and subreddit conversations.",
    characterLimit: 10000,
    simpleIconSlug: "reddit",
    colorHex: "#FF4500",
    contextGuidelines:
      "Reddit values substance and authenticity. Comments should be detailed, well-reasoned, and respect subreddit culture. Avoid self-promotion.",
    educationalContent: `Reddit thrives on in-depth discussion and community-driven conversations. Comments can range from brief reactions to comprehensive explanations, and quality content is rewarded with upvotes.

Effective Reddit comments demonstrate understanding of the topic, add unique insights, and respect subreddit rules and culture. The best comments are detailed without being verbose, helpful without being condescending.`,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    displayName: "Facebook Comment Generator",
    description:
      "Generate friendly Facebook comments with AI. Create authentic responses for posts, groups, and page discussions.",
    characterLimit: 8000,
    simpleIconSlug: "facebook",
    colorHex: "#1877F2",
    contextGuidelines:
      "Facebook is personal and relationship-focused. Comments should be friendly, supportive, and appropriate for a mixed audience of friends and family.",
    educationalContent: `Facebook comments appear on posts from friends, family, pages, and groups. They're essential for maintaining relationships and participating in community discussions.

Effective Facebook comments are warm, genuine, and appropriate for a broad audience. They acknowledge the original post, add personal perspective, and maintain a friendly tone. Context matters—comments on a friend's achievement differ from comments on a news article.`,
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    displayName: "Instagram Comment Generator",
    description:
      "Generate engaging Instagram comments with AI. Create authentic responses for posts, reels, and stories with the perfect tone.",
    characterLimit: 2200,
    simpleIconSlug: "instagram",
    colorHex: "#E4405F",
    contextGuidelines:
      "Instagram is visual and positive. Comments should be brief, supportive, and often include emojis. Engagement is key.",
    educationalContent: `Instagram comments drive engagement and build community around visual content. Whether on photos, reels, or carousel posts, comments help you connect with creators and participate in conversations.

Effective Instagram comments are positive, authentic, and concise. They reference specific elements of the post, use emojis naturally, and feel genuine rather than generic. The best comments spark conversation or show meaningful appreciation.`,
  },
  threads: {
    id: "threads",
    name: "Threads",
    displayName: "Threads Comment Generator",
    description:
      "Generate thoughtful Threads replies with AI. Create engaging comments for conversations on Meta's text-based platform.",
    characterLimit: 500,
    simpleIconSlug: "threads",
    colorHex: "#000000",
    contextGuidelines:
      "Threads combines Instagram's casual vibe with Twitter's conversation style. Comments should be conversational and encourage dialogue.",
    educationalContent: `Threads by Meta is designed for text-based conversations and real-time discussions. Replies and comments are central to building connections and participating in trending topics.

Effective Threads comments are conversational, timely, and contribute to ongoing discussions. They balance casual tone with substance, and often invite further conversation through questions or thoughtful perspectives.`,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    displayName: "YouTube Comment Generator",
    description:
      "Generate engaging YouTube comments with AI. Create thoughtful responses for videos, timestamps, and community discussions.",
    characterLimit: 10000,
    simpleIconSlug: "youtube",
    colorHex: "#FF0000",
    contextGuidelines:
      "YouTube comments can reference video content, timestamps, or broader discussions. They should add value to the conversation and be respectful.",
    educationalContent: `YouTube comments create community around video content. They can highlight favorite moments, ask questions, share insights, or discuss topics raised in the video.

Effective YouTube comments reference specific parts of the video (often with timestamps), add unique perspective, or ask thoughtful questions. The best comments contribute to discussion without spoiling content or spamming.`,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    displayName: "TikTok Comment Generator",
    description:
      "Generate trendy TikTok comments with AI. Create engaging responses that match TikTok's unique culture and style.",
    characterLimit: 150,
    simpleIconSlug: "tiktok",
    colorHex: "#000000",
    contextGuidelines:
      "TikTok comments are often playful, trend-aware, and use platform-specific language. They should be brief and engaging.",
    educationalContent: `TikTok comments are fast-paced and culturally specific. They reference trends, sounds, inside jokes, and viral formats while building community around short-form video content.

Effective TikTok comments are witty, timely, and culturally aware. They might reference sounds, trends, or popular formats. The best comments balance humor with authenticity and feel native to the platform's unique culture.`,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    displayName: "Pinterest Comment Generator",
    description:
      "Generate helpful Pinterest comments with AI. Create thoughtful responses on pins, boards, and creative projects.",
    characterLimit: 500,
    simpleIconSlug: "pinterest",
    colorHex: "#E60023",
    contextGuidelines:
      "Pinterest is inspirational and helpful. Comments should appreciate creativity, ask practical questions, or share related ideas.",
    educationalContent: `Pinterest comments appear on pins and help build community around creative inspiration, DIY projects, recipes, and ideas. They're often practical and appreciative.

Effective Pinterest comments show genuine appreciation, ask helpful questions, or share related tips. They might request more details, share success with a project, or suggest complementary ideas. The tone is supportive and constructive.`,
  },
  vk: {
    id: "vk",
    name: "VK",
    displayName: "VK Comment Generator",
    description:
      "Generate engaging VK comments with AI. Create authentic responses for posts and discussions on VKontakte.",
    characterLimit: 16384,
    simpleIconSlug: "vk",
    colorHex: "#0077FF",
    contextGuidelines:
      "VK is popular in Russia and Eastern Europe. Comments should be respectful, detailed, and appropriate for the community context.",
    educationalContent: `VK (VKontakte) is a major social platform in Russia and Eastern Europe. Comments are essential for participating in community discussions, group conversations, and social interactions.

Effective VK comments are thoughtful, respectful, and contextual. They consider cultural norms, add substance to discussions, and maintain appropriate tone for the community. Comments can range from brief reactions to detailed perspectives.`,
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    displayName: "Bluesky Comment Generator",
    description:
      "Generate thoughtful Bluesky replies with AI. Create engaging comments for the decentralized social network.",
    characterLimit: 300,
    simpleIconSlug: "bluesky",
    colorHex: "#1185FE",
    contextGuidelines:
      "Bluesky values authentic conversation and community. Comments should be substantive, respectful, and contribute meaningfully to discussions.",
    educationalContent: `Bluesky is a decentralized social network that emphasizes authentic conversation. Replies and comments are central to building community and participating in discussions.

Effective Bluesky comments are thoughtful, genuine, and respectful. They add unique perspective, ask good questions, or build on ideas. The platform values quality over virality, so substance matters more than being first.`,
  },
  lemmy: {
    id: "lemmy",
    name: "Lemmy",
    displayName: "Lemmy Comment Generator",
    description:
      "Generate thoughtful Lemmy comments with AI. Create detailed responses for discussions in federated communities.",
    characterLimit: 10000,
    simpleIconSlug: "lemmy",
    colorHex: "#00BC8C",
    contextGuidelines:
      "Lemmy is Reddit-like and federated. Comments should be detailed, well-reasoned, and respect community guidelines. Substance is valued.",
    educationalContent: `Lemmy is a federated link aggregator similar to Reddit. Comments drive discussion in communities across different instances, and quality content rises through voting.

Effective Lemmy comments are substantive, well-reasoned, and respect community culture. They demonstrate understanding of the topic, add unique insights, and follow instance and community rules. The federated nature means diverse communities with different norms.`,
  },
  slack: {
    id: "slack",
    name: "Slack",
    displayName: "Slack Comment Generator",
    description:
      "Generate professional Slack responses with AI. Create helpful replies for team channels and workplace discussions.",
    characterLimit: 4000,
    simpleIconSlug: "slack",
    colorHex: "#4A154B",
    contextGuidelines:
      "Slack is professional and team-focused. Comments should be clear, helpful, and appropriate for workplace communication. Respect async work.",
    educationalContent: `Slack is a workplace communication platform where comments and replies happen in threads, channels, and direct messages. Effective communication keeps teams aligned and projects moving.

Effective Slack comments are clear, concise, and actionable. They respect people's time, use threads appropriately, and maintain professional tone while matching team culture. The best replies answer questions completely, provide context, and move discussions forward.`,
  },
  mastodon: {
    id: "mastodon",
    name: "Mastodon",
    displayName: "Mastodon Comment Generator",
    description:
      "Generate thoughtful Mastodon replies with AI. Create engaging comments for the federated social network.",
    characterLimit: 500,
    simpleIconSlug: "mastodon",
    colorHex: "#6364FF",
    contextGuidelines:
      "Mastodon is federated and community-driven. Comments should be respectful, substantive, and mindful of instance culture and content warnings.",
    educationalContent: `Mastodon is a federated social network with diverse communities across different instances. Replies and comments should respect instance rules, community norms, and content warning practices.

Effective Mastodon comments are thoughtful, respectful, and contextual. They consider the instance culture, use content warnings when appropriate, and contribute meaningfully to conversations. The federated nature means diverse communities with different expectations.`,
  },
  warpcast: {
    id: "warpcast",
    name: "Warpcast",
    displayName: "Warpcast Comment Generator",
    description:
      "Generate engaging Warpcast replies with AI. Create thoughtful comments for Farcaster protocol conversations.",
    characterLimit: 320,
    simpleIconSlug: "farcaster",
    colorHex: "#8A63D2",
    contextGuidelines:
      "Warpcast is crypto-native and tech-forward. Comments should be substantive, insightful, and contribute to the decentralized social graph.",
    educationalContent: `Warpcast is the primary client for Farcaster, a decentralized social protocol. Comments and replies build your on-chain social graph and reputation.

Effective Warpcast comments are thoughtful, technically informed, and contribute value to conversations. They demonstrate understanding of crypto/tech topics, ask good questions, or provide unique insights. Quality engagement builds reputation in the protocol.`,
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    displayName: "Telegram Comment Generator",
    description:
      "Generate engaging Telegram comments with AI. Create thoughtful responses for channels, groups, and discussions.",
    characterLimit: 4096,
    simpleIconSlug: "telegram",
    colorHex: "#26A5E4",
    contextGuidelines:
      "Telegram spans casual to professional contexts. Comments should match the channel/group culture and be clear and respectful.",
    educationalContent: `Telegram comments appear in channels and group chats, ranging from casual conversations to professional announcements. The context determines appropriate tone and style.

Effective Telegram comments are clear, contextual, and respectful. They consider whether it's a public channel, private group, or discussion thread. The best comments add value without cluttering important channels.`,
  },
  nostr: {
    id: "nostr",
    name: "Nostr",
    displayName: "Nostr Comment Generator",
    description:
      "Generate thoughtful Nostr replies with AI. Create engaging comments for the decentralized protocol.",
    characterLimit: undefined,
    simpleIconSlug: "nostr",
    colorHex: "#8E30EB",
    contextGuidelines:
      "Nostr is decentralized and censorship-resistant. Comments should be substantive and contribute to open discourse.",
    educationalContent: `Nostr is a decentralized protocol for social communication. Comments and replies are cryptographically signed and distributed across relays, creating censorship-resistant conversations.

Effective Nostr comments are thoughtful, substantive, and contribute to open discourse. They demonstrate understanding of decentralization principles while maintaining respectful dialogue. The protocol's nature emphasizes authenticity and free expression.`,
  },
  dribbble: {
    id: "dribbble",
    name: "Dribbble",
    displayName: "Dribbble Comment Generator",
    description:
      "Generate constructive Dribbble comments with AI. Create thoughtful feedback on design work and creative projects.",
    characterLimit: undefined,
    simpleIconSlug: "dribbble",
    colorHex: "#EA4C89",
    contextGuidelines:
      "Dribbble is a design community. Comments should be constructive, specific, and appreciate the creative work while offering helpful feedback.",
    educationalContent: `Dribbble is a community for designers to share work and receive feedback. Comments should be constructive, specific, and help creators improve while appreciating their effort.

Effective Dribbble comments are detailed, constructive, and demonstrate design understanding. They might highlight specific elements, suggest improvements, or ask about design decisions. The best feedback is actionable, respectful, and balances praise with helpful critique.`,
  },
};

export const commentPlatformList = Object.values(commentPlatformConfigs);
