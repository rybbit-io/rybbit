export interface PageNamePlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  simpleIconSlug: string;
  colorHex: string;
  pageType: string; // e.g., "Page", "Community", "Server", "Channel", "Group"
  characterLimit?: number;
  educationalContent: string;
  contextGuidelines: string;
}

export const pageNamePlatformConfigs: Record<
  string,
  PageNamePlatformConfig
> = {
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    displayName: "LinkedIn Page Name Generator",
    description:
      "Generate professional LinkedIn company page names with AI. Create memorable names for your business page that attract followers and establish credibility.",
    simpleIconSlug: "linkedin",
    colorHex: "#0A66C2",
    pageType: "Company Page",
    characterLimit: 100,
    contextGuidelines:
      "LinkedIn page names should be professional, clear, and reflect your brand identity. They appear in search results and help people find your business.",
    educationalContent: `LinkedIn company pages are essential for businesses to establish their professional presence, share updates, and attract talent. A strong page name is memorable, searchable, and clearly communicates what your organization does.

Effective LinkedIn page names are professional, concise, and optimized for search. They should reflect your brand while being easy to remember and type. The best names balance creativity with clarity.`,
  },
  discord: {
    id: "discord",
    name: "Discord",
    displayName: "Discord Server Name Generator",
    description:
      "Generate creative Discord server names with AI. Create unique, engaging names for gaming communities, study groups, and Discord servers.",
    simpleIconSlug: "discord",
    colorHex: "#5865F2",
    pageType: "Server",
    characterLimit: 100,
    contextGuidelines:
      "Discord server names should reflect the community's theme and be memorable. They can be fun, creative, or descriptive depending on your server's purpose.",
    educationalContent: `Discord servers are communities built around shared interests, games, or topics. Your server name is the first thing potential members see and sets the tone for your community.

Effective Discord server names are creative, memorable, and reflect the community's purpose. They can be playful, professional, or thematic depending on your audience. The best names make people curious to join.`,
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    displayName: "X (Twitter) Name Generator",
    description:
      "Generate catchy X (Twitter) display names with AI. Create memorable names that stand out in the timeline and attract followers.",
    simpleIconSlug: "x",
    colorHex: "#000000",
    pageType: "Display Name",
    characterLimit: 50,
    contextGuidelines:
      "X/Twitter display names should be memorable and reflect your brand or personality. They appear next to your @handle and help you stand out.",
    educationalContent: `Your X (Twitter) display name appears next to your @username and is what most people will see when you tweet. It can include spaces, emojis, and special characters, making it more flexible than your @handle.

Effective X display names are memorable, searchable, and reflect your brand or personality. They help you stand out in crowded feeds and make it easy for people to recognize your content.`,
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    displayName: "Reddit Community Name Generator",
    description:
      "Generate engaging Reddit subreddit names with AI. Create memorable community names that attract subscribers and define your niche.",
    simpleIconSlug: "reddit",
    colorHex: "#FF4500",
    pageType: "Subreddit",
    characterLimit: 21,
    contextGuidelines:
      "Reddit community names (subreddits) should be concise, descriptive, and easy to remember. They're permanent and define your community's identity.",
    educationalContent: `Subreddit names are permanent identifiers for your Reddit community. They must be unique, concise (max 21 characters), and clearly communicate what the community is about.

Effective subreddit names are short, descriptive, and memorable. They often use portmanteaus, abbreviations, or clear descriptors. The best names make the community's purpose immediately obvious.`,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    displayName: "Facebook Page Name Generator",
    description:
      "Generate professional Facebook business page names with AI. Create memorable names that attract likes and establish your brand presence.",
    simpleIconSlug: "facebook",
    colorHex: "#1877F2",
    pageType: "Business Page",
    characterLimit: 75,
    contextGuidelines:
      "Facebook page names should clearly represent your business or brand. They're searchable and help people find and recognize your page.",
    educationalContent: `Facebook business pages represent your organization on the world's largest social network. Your page name is crucial for discoverability and brand recognition.

Effective Facebook page names are clear, professional, and include relevant keywords for search. They should match your business name or clearly describe what you do. The best names are easy to remember and share.`,
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    displayName: "Instagram Name Generator",
    description:
      "Generate creative Instagram display names with AI. Create memorable names that complement your username and attract followers.",
    simpleIconSlug: "instagram",
    colorHex: "#E4405F",
    pageType: "Display Name",
    characterLimit: 30,
    contextGuidelines:
      "Instagram names appear on your profile and should complement your username. They can include emojis and help define your brand.",
    educationalContent: `Your Instagram name (different from your @username) appears prominently on your profile and is searchable. It can include spaces, emojis, and special characters.

Effective Instagram names are creative, memorable, and reflect your brand or niche. They often include keywords that help people find your account and understand what you post about.`,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    displayName: "YouTube Channel Name Generator",
    description:
      "Generate catchy YouTube channel names with AI. Create memorable names that attract subscribers and define your content niche.",
    simpleIconSlug: "youtube",
    colorHex: "#FF0000",
    pageType: "Channel",
    characterLimit: 50,
    contextGuidelines:
      "YouTube channel names should be memorable, searchable, and reflect your content niche. They're crucial for branding and discoverability.",
    educationalContent: `Your YouTube channel name is your primary brand identifier and appears on all your videos, comments, and community posts. It's crucial for discoverability and building recognition.

Effective YouTube channel names are unique, memorable, and hint at your content niche. They should be easy to spell, pronounce, and remember. The best names help viewers understand what type of content you create.`,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    displayName: "TikTok Name Generator",
    description:
      "Generate trendy TikTok display names with AI. Create catchy names that attract followers and fit TikTok's creative culture.",
    simpleIconSlug: "tiktok",
    colorHex: "#000000",
    pageType: "Display Name",
    characterLimit: 30,
    contextGuidelines:
      "TikTok names should be catchy, creative, and memorable. They can include emojis and should reflect your content style or personality.",
    educationalContent: `Your TikTok display name appears on your profile and in comments. It's separate from your @username and can be changed, making it flexible for rebranding.

Effective TikTok names are creative, trendy, and memorable. They often use wordplay, emojis, or aesthetic styling. The best names reflect your content niche and help you stand out in a creative platform.`,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    displayName: "Pinterest Board Name Generator",
    description:
      "Generate organized Pinterest board names with AI. Create descriptive names that help users find and save your curated content.",
    simpleIconSlug: "pinterest",
    colorHex: "#E60023",
    pageType: "Board",
    characterLimit: 50,
    contextGuidelines:
      "Pinterest board names should be descriptive and keyword-rich. They help users find your boards and understand what content they contain.",
    educationalContent: `Pinterest boards organize your pins by topic or theme. Board names are crucial for searchability and helping users find content they're interested in.

Effective Pinterest board names are descriptive, keyword-rich, and clear. They should tell users exactly what type of content they'll find. The best names use popular search terms while remaining specific.`,
  },
  slack: {
    id: "slack",
    name: "Slack",
    displayName: "Slack Channel Name Generator",
    description:
      "Generate organized Slack channel names with AI. Create clear, purposeful names that help teams stay organized and communicate effectively.",
    simpleIconSlug: "slack",
    colorHex: "#4A154B",
    pageType: "Channel",
    characterLimit: 80,
    contextGuidelines:
      "Slack channel names should be clear, purposeful, and follow naming conventions. They help teams stay organized and find the right conversations.",
    educationalContent: `Slack channels organize team conversations by topic, project, or department. Good channel names make it easy for team members to find relevant discussions and understand each channel's purpose.

Effective Slack channel names are lowercase, use hyphens instead of spaces, and follow consistent naming conventions (e.g., #proj-name, #team-name). The best names are immediately understandable and searchable.`,
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    displayName: "Telegram Group Name Generator",
    description:
      "Generate engaging Telegram group and channel names with AI. Create memorable names that attract members and define your community.",
    simpleIconSlug: "telegram",
    colorHex: "#26A5E4",
    pageType: "Group/Channel",
    characterLimit: 255,
    contextGuidelines:
      "Telegram group names should be clear and descriptive. They help potential members understand the group's purpose and decide whether to join.",
    educationalContent: `Telegram groups and channels bring people together around shared interests or information. Your group name is the first thing potential members see and determines whether they'll join.

Effective Telegram group names clearly describe the community's purpose, are easy to search for, and are memorable. They can be professional or casual depending on your audience.`,
  },
  twitch: {
    id: "twitch",
    name: "Twitch",
    displayName: "Twitch Channel Name Generator",
    description:
      "Generate catchy Twitch channel names with AI. Create memorable names that attract viewers and stand out in the streaming community.",
    simpleIconSlug: "twitch",
    colorHex: "#9146FF",
    pageType: "Channel",
    characterLimit: 25,
    contextGuidelines:
      "Twitch channel names should be unique, memorable, and easy to spell. They're your permanent identity on the platform and crucial for branding.",
    educationalContent: `Your Twitch channel name is your permanent username and brand identity. It appears in your stream URL, chat, and all interactions on the platform.

Effective Twitch names are unique, memorable, and easy to spell. They should be pronounceable for voice chat and short enough to be easily typed. The best names reflect your personality or content niche without being too generic.`,
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    displayName: "Spotify Playlist Name Generator",
    description:
      "Generate creative Spotify playlist names with AI. Create memorable names that capture your playlist's mood and attract listeners.",
    simpleIconSlug: "spotify",
    colorHex: "#1DB954",
    pageType: "Playlist",
    characterLimit: 100,
    contextGuidelines:
      "Spotify playlist names should capture the mood, theme, or purpose of the music. Creative names attract listeners and make playlists shareable.",
    educationalContent: `Spotify playlist names set the tone for your curated music collection. They help listeners discover your playlist and understand the vibe before they hit play.

Effective Spotify playlist names are creative, descriptive, and evoke the mood of the music. They can be poetic, humorous, or straightforward. The best names make people want to click and listen.`,
  },
  github: {
    id: "github",
    name: "GitHub",
    displayName: "GitHub Repository Name Generator",
    description:
      "Generate clear GitHub repository names with AI. Create descriptive names that communicate your project's purpose to developers.",
    simpleIconSlug: "github",
    colorHex: "#181717",
    pageType: "Repository",
    characterLimit: 100,
    contextGuidelines:
      "GitHub repository names should be lowercase, use hyphens, and clearly describe the project. Good names improve discoverability and professionalism.",
    educationalContent: `GitHub repository names are permanent identifiers for your code projects. They appear in URLs, git commands, and search results, making clarity essential.

Effective GitHub repo names use lowercase letters, hyphens for spaces, and clearly describe the project's purpose. They should be concise, descriptive, and follow common naming conventions (e.g., "react-todo-app" not "My_Project123").`,
  },
  medium: {
    id: "medium",
    name: "Medium",
    displayName: "Medium Publication Name Generator",
    description:
      "Generate compelling Medium publication names with AI. Create memorable names for your publication that attract readers and writers.",
    simpleIconSlug: "medium",
    colorHex: "#000000",
    pageType: "Publication",
    characterLimit: 60,
    contextGuidelines:
      "Medium publication names should be memorable and reflect your editorial focus. They help readers understand your content and attract contributors.",
    educationalContent: `Medium publications are curated collections of stories around a theme or topic. Your publication name is crucial for attracting both readers and contributing writers.

Effective Medium publication names are memorable, reflect your editorial focus, and hint at the type of content readers will find. The best names are unique enough to stand out but clear enough to be understood.`,
  },
  substack: {
    id: "substack",
    name: "Substack",
    displayName: "Substack Newsletter Name Generator",
    description:
      "Generate engaging Substack newsletter names with AI. Create memorable names that attract subscribers and define your niche.",
    simpleIconSlug: "substack",
    colorHex: "#FF6719",
    pageType: "Newsletter",
    characterLimit: 60,
    contextGuidelines:
      "Substack newsletter names should clearly communicate your topic or perspective. They're crucial for attracting subscribers and establishing your brand.",
    educationalContent: `Your Substack newsletter name is your brand identity in the creator economy. It appears in your URL, emails, and when people recommend your work.

Effective Substack names clearly communicate your topic, perspective, or value proposition. They should be memorable, searchable, and give potential subscribers a reason to sign up. The best names balance clarity with creativity.`,
  },
};

export const pageNamePlatformList = Object.values(pageNamePlatformConfigs);
