export interface UsernameGeneratorPlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  simpleIconSlug: string;
  colorHex: string;
  characterLimit?: number;
  minLength?: number;
  allowedCharacters: string;
  educationalContent: string;
  contextGuidelines: string;
  usernamePrefix?: string; // e.g., "@" for Twitter
}

export const usernameGeneratorPlatformConfigs: Record<
  string,
  UsernameGeneratorPlatformConfig
> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    displayName: "Instagram Username Generator",
    description:
      "Generate creative Instagram usernames with AI. Create memorable handles that are unique, brandable, and perfect for your profile.",
    simpleIconSlug: "instagram",
    colorHex: "#E4405F",
    characterLimit: 30,
    minLength: 1,
    allowedCharacters: "letters, numbers, periods, and underscores",
    usernamePrefix: "@",
    contextGuidelines:
      "Instagram usernames should be memorable, easy to spell, and reflect your brand or personality. They can't contain spaces or special characters (except periods and underscores).",
    educationalContent: `Your Instagram username (handle) is your unique identifier on the platform. It appears in your profile URL, in @mentions, and in DMs. A good username is memorable, easy to spell, and helps people find and remember you.

Effective Instagram usernames are short, brandable, and relevant to your content or niche. They avoid excessive numbers or underscores that make them hard to remember. The best usernames are instantly recognizable and easy to share verbally.`,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    displayName: "TikTok Username Generator",
    description:
      "Generate catchy TikTok usernames with AI. Create unique handles that stand out and attract followers in TikTok's creative community.",
    simpleIconSlug: "tiktok",
    colorHex: "#000000",
    characterLimit: 24,
    minLength: 1,
    allowedCharacters: "letters, numbers, periods, and underscores",
    usernamePrefix: "@",
    contextGuidelines:
      "TikTok usernames should be creative, memorable, and fit the platform's fun, trendy vibe. Avoid excessive numbers or characters that make them hard to type.",
    educationalContent: `Your TikTok username is your identity on the platform and appears in all your videos, comments, and profile interactions. It's crucial for brand recognition and discoverability.

Effective TikTok usernames are creative, catchy, and reflect your content niche or personality. They're easy to remember and pronounce, making them shareable. The best usernames hint at your content style or vibe without being too literal.`,
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    displayName: "X (Twitter) Username Generator",
    description:
      "Generate memorable X (Twitter) usernames with AI. Create unique handles that are professional, brandable, and easy to remember.",
    simpleIconSlug: "x",
    colorHex: "#000000",
    characterLimit: 15,
    minLength: 4,
    allowedCharacters: "letters, numbers, and underscores",
    usernamePrefix: "@",
    contextGuidelines:
      "X/Twitter usernames must be 4-15 characters and can only contain letters, numbers, and underscores. They should be memorable and professional.",
    educationalContent: `Your X (Twitter) username (@handle) is permanent and appears in your profile URL, @mentions, and replies. It's a critical part of your brand identity on the platform.

Effective X usernames are concise, memorable, and professional. They avoid excessive numbers or underscores that make them hard to remember or type. The best usernames are short enough to fit easily in tweets and memorable enough to be shared verbally.`,
  },
  twitch: {
    id: "twitch",
    name: "Twitch",
    displayName: "Twitch Username Generator",
    description:
      "Generate gaming-focused Twitch usernames with AI. Create memorable handles that resonate with gaming and streaming communities.",
    simpleIconSlug: "twitch",
    colorHex: "#9146FF",
    characterLimit: 25,
    minLength: 4,
    allowedCharacters: "letters, numbers, and underscores",
    usernamePrefix: "",
    contextGuidelines:
      "Twitch usernames should be gaming-appropriate, memorable, and easy to pronounce for voice chat. They become your channel URL and brand identity.",
    educationalContent: `Your Twitch username is your channel identity and appears in your URL, chat, and all platform interactions. It's permanent (though you can change it once every 60 days) and crucial for building your streaming brand.

Effective Twitch usernames are memorable, easy to pronounce (important for voice chat), and often relate to gaming or your content niche. They avoid confusing characters or excessive numbers. The best usernames are brandable and work well for potential merch or branding.`,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    displayName: "YouTube Username Generator",
    description:
      "Generate memorable YouTube channel handles with AI. Create unique usernames that help viewers find and remember your channel.",
    simpleIconSlug: "youtube",
    colorHex: "#FF0000",
    characterLimit: 30,
    minLength: 3,
    allowedCharacters: "letters, numbers, periods, and underscores",
    usernamePrefix: "@",
    contextGuidelines:
      "YouTube handles should be memorable, reflect your channel's content, and be easy to spell. They appear in your channel URL and @mentions.",
    educationalContent: `YouTube handles (@username) are unique identifiers that make your channel easy to find and mention. They appear in URLs, comments, and when people tag your channel.

Effective YouTube handles are memorable, relevant to your content, and easy to spell. They're short enough to be easily shared but descriptive enough to give viewers an idea of your content. The best handles are brandable and work across other social platforms.`,
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    displayName: "Reddit Username Generator",
    description:
      "Generate creative Reddit usernames with AI. Create memorable handles that reflect your personality and Reddit's unique culture.",
    simpleIconSlug: "reddit",
    colorHex: "#FF4500",
    characterLimit: 20,
    minLength: 3,
    allowedCharacters: "letters, numbers, underscores, and hyphens",
    usernamePrefix: "u/",
    contextGuidelines:
      "Reddit usernames are permanent and should reflect your personality or interests. They can be humorous, creative, or descriptive.",
    educationalContent: `Your Reddit username (u/username) is permanent and appears on all your posts, comments, and interactions. It's a key part of your Reddit identity and reputation.

Effective Reddit usernames are creative, memorable, and often humorous or clever. They might reference memes, puns, or personal interests. Unlike other platforms, Reddit culture appreciates quirky, creative usernames. The best usernames are unique without being too cryptic.`,
  },
  discord: {
    id: "discord",
    name: "Discord",
    displayName: "Discord Username Generator",
    description:
      "Generate unique Discord usernames with AI. Create memorable handles for gaming communities and friend groups.",
    simpleIconSlug: "discord",
    colorHex: "#5865F2",
    characterLimit: 32,
    minLength: 2,
    allowedCharacters: "letters, numbers, periods, and underscores",
    usernamePrefix: "",
    contextGuidelines:
      "Discord usernames should be memorable and appropriate for gaming/community contexts. They can be creative, funny, or cool.",
    educationalContent: `Discord usernames identify you across servers and in DMs. While you can have different nicknames in different servers, your username is your core identity on Discord.

Effective Discord usernames are memorable, appropriate for gaming/community contexts, and easy to type. They can be creative, funny, or reflect your interests. The best usernames work well in both casual and organized communities.`,
  },
  github: {
    id: "github",
    name: "GitHub",
    displayName: "GitHub Username Generator",
    description:
      "Generate professional GitHub usernames with AI. Create handles that reflect your developer identity and look good on your resume.",
    simpleIconSlug: "github",
    colorHex: "#181717",
    characterLimit: 39,
    minLength: 1,
    allowedCharacters: "letters, numbers, and hyphens",
    usernamePrefix: "",
    contextGuidelines:
      "GitHub usernames should be professional since they appear on your profile URL and in all contributions. Many developers use their real name or a professional handle.",
    educationalContent: `Your GitHub username appears in your profile URL, on all your repositories, and in your contribution history. Many employers and collaborators will see it, making professionalism important.

Effective GitHub usernames are professional, memorable, and often related to your real name or developer identity. They avoid excessive numbers or random characters. The best usernames are brandable and appropriate for sharing with potential employers or clients.`,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    displayName: "Pinterest Username Generator",
    description:
      "Generate creative Pinterest usernames with AI. Create memorable handles that reflect your style and attract followers.",
    simpleIconSlug: "pinterest",
    colorHex: "#E60023",
    characterLimit: 30,
    minLength: 3,
    allowedCharacters: "letters, numbers, and underscores",
    usernamePrefix: "@",
    contextGuidelines:
      "Pinterest usernames should be memorable, brandable, and reflect your niche or style. They appear in your profile URL and when people @mention you.",
    educationalContent: `Your Pinterest username appears in your profile URL, in mentions, and when people share your pins. It's an important part of your brand on the platform.

Effective Pinterest usernames are creative, reflect your niche (e.g., DIY, fashion, recipes), and are easy to remember. They're brandable and work well for potential business use. The best usernames give viewers an idea of what content to expect.`,
  },
  snapchat: {
    id: "snapchat",
    name: "Snapchat",
    displayName: "Snapchat Username Generator",
    description:
      "Generate fun Snapchat usernames with AI. Create unique handles that are creative, memorable, and perfect for your snap identity.",
    simpleIconSlug: "snapchat",
    colorHex: "#FFFC00",
    characterLimit: 15,
    minLength: 3,
    allowedCharacters: "letters, numbers, periods, underscores, and hyphens",
    usernamePrefix: "",
    contextGuidelines:
      "Snapchat usernames are permanent (can't be changed), so choose carefully. They should be fun, memorable, and easy to share with friends.",
    educationalContent: `Your Snapchat username is permanent and is how friends add you on the platform. Unlike your display name (which can be changed), your username can never be changed, so choose wisely.

Effective Snapchat usernames are fun, easy to remember, and easy to spell when sharing with friends. They're often creative or playful, reflecting Snapchat's casual, personal nature. The best usernames are short and memorable enough to share verbally.`,
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    displayName: "Spotify Username Generator",
    description:
      "Generate creative Spotify usernames with AI. Create memorable handles for your music profile and playlists.",
    simpleIconSlug: "spotify",
    colorHex: "#1DB954",
    characterLimit: 30,
    minLength: 1,
    allowedCharacters: "letters, numbers, periods, and underscores",
    usernamePrefix: "",
    contextGuidelines:
      "Spotify usernames appear on your profile and playlists. They should be memorable and reflect your music taste or personality.",
    educationalContent: `Your Spotify username identifies your profile and appears on your public playlists. While your display name can be changed, your username is more permanent.

Effective Spotify usernames are memorable and often reflect music taste, personality, or your real name. They're brandable if you're building a curator presence. The best usernames work well if you're sharing playlists publicly or building a following.`,
  },
  steam: {
    id: "steam",
    name: "Steam",
    displayName: "Steam Username Generator",
    description:
      "Generate gaming-focused Steam usernames with AI. Create memorable handles for your gaming profile and friend connections.",
    simpleIconSlug: "steam",
    colorHex: "#000000",
    characterLimit: 32,
    minLength: 2,
    allowedCharacters: "letters, numbers, and underscores",
    usernamePrefix: "",
    contextGuidelines:
      "Steam usernames (account names) are permanent and used for login. Choose something memorable but professional enough for your gaming identity.",
    educationalContent: `Your Steam username (account name) is permanent and used for login, while your profile name (display name) can be changed. The username is less visible but still important for account management.

Effective Steam usernames are memorable, gaming-appropriate, and professional enough for long-term use. While less visible than your display name, it's permanent, so choose something you won't regret.`,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    displayName: "LinkedIn Custom URL Generator",
    description:
      "Generate professional LinkedIn custom URLs with AI. Create clean, professional profile URLs that look great on resumes and business cards.",
    simpleIconSlug: "linkedin",
    colorHex: "#0A66C2",
    characterLimit: 100,
    minLength: 3,
    allowedCharacters: "letters, numbers, and hyphens",
    usernamePrefix: "linkedin.com/in/",
    contextGuidelines:
      "LinkedIn custom URLs should be professional and typically use your name. They appear on your resume, business cards, and in your profile link.",
    educationalContent: `Your LinkedIn custom URL (vanity URL) appears in your profile link and is what you share on resumes, business cards, and professional materials. A clean URL looks more professional than the default random string.

Effective LinkedIn URLs typically use your name or a professional variation. They're short, professional, and easy to remember. The best URLs use your full name if available, or a professional abbreviation. Avoid numbers unless necessary.`,
  },
  medium: {
    id: "medium",
    name: "Medium",
    displayName: "Medium Username Generator",
    description:
      "Generate professional Medium usernames with AI. Create memorable handles for your writing profile and articles.",
    simpleIconSlug: "medium",
    colorHex: "#000000",
    characterLimit: 30,
    minLength: 1,
    allowedCharacters: "letters, numbers, and underscores",
    usernamePrefix: "@",
    contextGuidelines:
      "Medium usernames appear in your profile URL and when you publish articles. They should be professional and reflect your writing identity.",
    educationalContent: `Your Medium username appears in your profile URL, on your articles, and when people mention you. It's an important part of your writer identity on the platform.

Effective Medium usernames are professional, memorable, and often related to your name or writing niche. They're brandable and appropriate for professional contexts. The best usernames work well if you're building a writing portfolio or personal brand.`,
  },
  substack: {
    id: "substack",
    name: "Substack",
    displayName: "Substack URL Generator",
    description:
      "Generate professional Substack subdomain URLs with AI. Create memorable URLs for your newsletter that are easy to share and remember.",
    simpleIconSlug: "substack",
    colorHex: "#FF6719",
    characterLimit: 63,
    minLength: 1,
    allowedCharacters: "letters, numbers, and hyphens",
    usernamePrefix: "",
    contextGuidelines:
      "Substack subdomains become your newsletter URL (yourname.substack.com). They should be professional, memorable, and related to your newsletter's name or topic.",
    educationalContent: `Your Substack subdomain is your newsletter's primary URL (yourname.substack.com) and is crucial for branding and shareability. It's one of the first things potential subscribers see.

Effective Substack URLs are professional, memorable, and related to your newsletter name or topic. They're short enough to be easily shared and remembered. The best URLs reflect your newsletter's brand and are appropriate for professional promotion.`,
  },
};

export const usernameGeneratorPlatformList = Object.values(
  usernameGeneratorPlatformConfigs
);
