export interface HashtagGeneratorPlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  simpleIconSlug: string;
  colorHex: string;
  maxHashtags?: number;
  characterLimit?: number;
  educationalContent: string;
  contextGuidelines: string;
  hashtagStrategies: string[];
}

export const hashtagGeneratorPlatformConfigs: Record<
  string,
  HashtagGeneratorPlatformConfig
> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    displayName: "Instagram Hashtag Generator",
    description:
      "Generate strategic Instagram hashtags with AI. Create hashtag sets that boost discoverability and reach your target audience.",
    simpleIconSlug: "instagram",
    colorHex: "#E4405F",
    maxHashtags: 30,
    characterLimit: undefined,
    contextGuidelines:
      "Instagram allows up to 30 hashtags per post. Use a mix of popular, niche, and branded hashtags for maximum reach and engagement.",
    educationalContent: `Instagram hashtags are crucial for discoverability and reaching new audiences. The right hashtag strategy can significantly increase your post's reach, engagement, and follower growth.

Effective Instagram hashtag strategies use a mix of popular hashtags (for broad reach), niche hashtags (for targeted engagement), and branded hashtags (for community building). The best approach balances visibility with relevance to attract your ideal audience.`,
    hashtagStrategies: [
      "Viral/Trending",
      "Niche-Specific",
      "Engagement-Focused",
      "Community Building",
      "Location-Based",
      "Mixed Strategy",
    ],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    displayName: "TikTok Hashtag Generator",
    description:
      "Generate trending TikTok hashtags with AI. Create hashtag combinations that increase visibility and help your videos go viral.",
    simpleIconSlug: "tiktok",
    colorHex: "#000000",
    maxHashtags: undefined,
    characterLimit: 100,
    contextGuidelines:
      "TikTok hashtags should include trending tags, niche tags, and content descriptors. Focus on discoverability and FYP (For You Page) optimization.",
    educationalContent: `TikTok hashtags help your content get discovered and can significantly impact whether your video reaches the For You Page (FYP). Strategic hashtag use is essential for visibility and growth.

Effective TikTok hashtag strategies combine trending hashtags (for viral potential), niche hashtags (for targeted reach), and descriptive hashtags (for content categorization). The best approach keeps hashtags current with trends while staying relevant to your content.`,
    hashtagStrategies: [
      "Viral/Trending",
      "FYP Optimized",
      "Niche Community",
      "Content Category",
      "Challenge/Trend",
      "Mixed Strategy",
    ],
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    displayName: "X (Twitter) Hashtag Generator",
    description:
      "Generate impactful X (Twitter) hashtags with AI. Create concise hashtag sets that join conversations and increase engagement.",
    simpleIconSlug: "x",
    colorHex: "#000000",
    maxHashtags: undefined,
    characterLimit: 280,
    contextGuidelines:
      "X/Twitter hashtags should be concise and relevant. 1-2 hashtags per tweet often perform better than many. Use trending hashtags to join conversations.",
    educationalContent: `X (Twitter) hashtags help you join conversations, increase discoverability, and engage with trending topics. Unlike Instagram, fewer hashtags (1-3) often perform better on X.

Effective X hashtag strategies focus on relevance over quantity. Trending hashtags can increase visibility dramatically but should be used authentically. The best approach uses targeted hashtags that connect your content to ongoing conversations.`,
    hashtagStrategies: [
      "Trending Topics",
      "Industry-Specific",
      "Event/News Related",
      "Community Tags",
      "Brand Hashtags",
      "Mixed Strategy",
    ],
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    displayName: "LinkedIn Hashtag Generator",
    description:
      "Generate professional LinkedIn hashtags with AI. Create hashtag sets that increase post visibility in professional networks.",
    simpleIconSlug: "linkedin",
    colorHex: "#0A66C2",
    maxHashtags: undefined,
    characterLimit: 3000,
    contextGuidelines:
      "LinkedIn recommends 3-5 hashtags per post. Focus on professional, industry-specific hashtags that help the right professionals find your content.",
    educationalContent: `LinkedIn hashtags help your content reach professionals interested in your topics. They're essential for expanding reach beyond your immediate network and establishing thought leadership.

Effective LinkedIn hashtag strategies use 3-5 professional, industry-specific hashtags. Popular hashtags increase visibility while niche hashtags attract targeted engagement. The best approach balances broad professional topics with specific industry keywords.`,
    hashtagStrategies: [
      "Industry Leadership",
      "Professional Development",
      "Business/Industry",
      "Skills & Expertise",
      "Trending Professional",
      "Mixed Strategy",
    ],
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    displayName: "Facebook Hashtag Generator",
    description:
      "Generate effective Facebook hashtags with AI. Create hashtag sets that increase post reach and engagement in groups and pages.",
    simpleIconSlug: "facebook",
    colorHex: "#1877F2",
    maxHashtags: undefined,
    characterLimit: 63206,
    contextGuidelines:
      "Facebook hashtags are less critical than on other platforms but can help with discoverability. Use 1-3 relevant hashtags focused on your topic or community.",
    educationalContent: `Facebook hashtags help with content discovery, especially in groups and public posts. While not as essential as on Instagram or TikTok, strategic hashtag use can increase reach.

Effective Facebook hashtag strategies use 1-3 highly relevant hashtags. Focus on community-specific or topic-focused tags rather than generic popular hashtags. The best approach targets your specific audience or local community.`,
    hashtagStrategies: [
      "Community-Focused",
      "Topic/Interest Based",
      "Local/Regional",
      "Event-Specific",
      "Brand/Group Tags",
      "Mixed Strategy",
    ],
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    displayName: "YouTube Hashtag Generator",
    description:
      "Generate SEO-optimized YouTube hashtags with AI. Create hashtag sets that improve video discoverability and search rankings.",
    simpleIconSlug: "youtube",
    colorHex: "#FF0000",
    maxHashtags: 15,
    characterLimit: 5000,
    contextGuidelines:
      "YouTube allows hashtags in titles and descriptions (max 15, first 3 appear above title). Focus on searchable, descriptive hashtags that improve SEO.",
    educationalContent: `YouTube hashtags improve video discoverability and SEO. The first 3 hashtags appear above your video title and are especially important for search and suggestions.

Effective YouTube hashtag strategies use descriptive, searchable keywords. Focus on video topic, content category, and related searches. The best approach balances popular search terms with specific niche descriptors that accurately represent your content.`,
    hashtagStrategies: [
      "SEO/Search Optimized",
      "Topic/Category",
      "Tutorial/How-To",
      "Trending/Viral",
      "Series/Brand Tags",
      "Mixed Strategy",
    ],
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    displayName: "Pinterest Hashtag Generator",
    description:
      "Generate Pinterest hashtags with AI. Create hashtag sets that improve pin discoverability and drive traffic to your content.",
    simpleIconSlug: "pinterest",
    colorHex: "#E60023",
    maxHashtags: 20,
    characterLimit: 500,
    contextGuidelines:
      "Pinterest recommends up to 20 hashtags. Focus on descriptive, searchable keywords that match user search intent and pin content.",
    educationalContent: `Pinterest hashtags help your pins appear in search results and related pin suggestions. They're searchable and categorize your content for users actively looking for ideas.

Effective Pinterest hashtag strategies use descriptive keywords that match search intent. Focus on specific topics, styles, or use cases rather than broad generic terms. The best approach uses hashtags that describe what users will learn, make, or achieve with your pin.`,
    hashtagStrategies: [
      "Search-Optimized",
      "DIY/Tutorial",
      "Style/Aesthetic",
      "Seasonal/Occasion",
      "How-To/Guide",
      "Mixed Strategy",
    ],
  },
  threads: {
    id: "threads",
    name: "Threads",
    displayName: "Threads Hashtag Generator",
    description:
      "Generate engaging Threads hashtags with AI. Create hashtag sets that increase post visibility and join trending conversations.",
    simpleIconSlug: "threads",
    colorHex: "#000000",
    maxHashtags: undefined,
    characterLimit: 500,
    contextGuidelines:
      "Threads hashtags work similarly to Instagram. Use relevant hashtags to increase discoverability and join conversations.",
    educationalContent: `Threads hashtags help your posts get discovered beyond your followers. As Meta's text-based platform, hashtags function similarly to Instagram but in a conversation-focused context.

Effective Threads hashtag strategies balance trending topics with niche interests. Focus on conversation starters and community tags. The best approach uses hashtags that encourage discussion and connect you with like-minded users.`,
    hashtagStrategies: [
      "Trending Conversations",
      "Community Topics",
      "Interest-Based",
      "Discussion Starters",
      "Meta Ecosystem",
      "Mixed Strategy",
    ],
  },
  tumblr: {
    id: "tumblr",
    name: "Tumblr",
    displayName: "Tumblr Tag Generator",
    description:
      "Generate creative Tumblr tags with AI. Create tag sets that help your posts get discovered in Tumblr's community-driven platform.",
    simpleIconSlug: "tumblr",
    colorHex: "#36465D",
    maxHashtags: 30,
    characterLimit: undefined,
    contextGuidelines:
      "Tumblr tags (not hashtags with #) are crucial for discoverability. Use up to 30 tags that describe content, fandom, aesthetic, or topic. First 5 tags are most important.",
    educationalContent: `Tumblr tags are essential for content discovery and community connection. Unlike other platforms, tags don't use the # symbol and can include spaces. The first 5 tags are indexed for search and most important.

Effective Tumblr tag strategies use a mix of broad and specific tags. Include fandom tags, content type, aesthetic descriptors, and relevant topics. The best approach balances popular tags with niche community tags that connect you to your target audience.`,
    hashtagStrategies: [
      "Fandom/Community",
      "Aesthetic/Style",
      "Content Type",
      "Popular/Trending",
      "Niche Interest",
      "Mixed Strategy",
    ],
  },
};

export const hashtagGeneratorPlatformList = Object.values(
  hashtagGeneratorPlatformConfigs
);
