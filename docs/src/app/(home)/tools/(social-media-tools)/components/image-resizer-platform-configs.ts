export interface ImageDimension {
  label: string;
  width: number;
  height: number;
  aspectRatio?: number; // width / height
  description?: string;
}

export interface ImageResizerPlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  educationalContent: string;
  simpleIconSlug: string;
  colorHex: string;
  dimensions: ImageDimension[];
}

export const imageResizerPlatformConfigs: Record<string, ImageResizerPlatformConfig> = {
  facebook: {
    id: "facebook",
    name: "Facebook",
    displayName: "Facebook Photo Resizer",
    description:
      "Resize and crop images for Facebook profiles, covers, posts, and stories. Ensure your content looks perfect on all devices.",
    educationalContent:
      "Facebook has specific image dimensions for different placement types to ensure optimal display quality. Using the correct size prevents automatic cropping or compression artifacts.",
    simpleIconSlug: "facebook",
    colorHex: "0866FF",
    dimensions: [
      {
        label: "Profile Picture",
        width: 170,
        height: 170,
        aspectRatio: 1,
        description: "Displays at 170x170 on desktop, 128x128 on smartphones.",
      },
      {
        label: "Cover Photo",
        width: 851,
        height: 315,
        aspectRatio: 851 / 315,
        description: "Displays at 820x312 on desktop, 640x360 on smartphones.",
      },
      {
        label: "Shared Image (Post)",
        width: 1200,
        height: 630,
        aspectRatio: 1.91,
        description: "Recommended size for shared link images.",
      },
      { label: "Story", width: 1080, height: 1920, aspectRatio: 9 / 16, description: "Full screen vertical image." },
      {
        label: "Event Cover",
        width: 1920,
        height: 1005,
        aspectRatio: 1920 / 1005,
        description: "For Facebook events.",
      },
    ],
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    displayName: "Instagram Photo Resizer",
    description:
      "Crop and resize photos for Instagram posts, stories, and profile pictures. Create perfect squares or vertical visuals.",
    educationalContent:
      "Instagram is a visual-first platform. High-quality, correctly sized images are essential for engagement. It supports square, landscape, and portrait orientations.",
    simpleIconSlug: "instagram",
    colorHex: "E4405F",
    dimensions: [
      { label: "Profile Picture", width: 320, height: 320, aspectRatio: 1, description: "Circular crop." },
      { label: "Square Post", width: 1080, height: 1080, aspectRatio: 1, description: "The classic Instagram format." },
      {
        label: "Portrait Post",
        width: 1080,
        height: 1350,
        aspectRatio: 4 / 5,
        description: "Takes up more vertical screen space.",
      },
      { label: "Landscape Post", width: 1080, height: 566, aspectRatio: 1.91, description: "Cinematic wide format." },
      {
        label: "Story / Reel Cover",
        width: 1080,
        height: 1920,
        aspectRatio: 9 / 16,
        description: "Full screen vertical format.",
      },
    ],
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    displayName: "X (Twitter) Photo Resizer",
    description: "Resize images for X posts, headers, and profile pictures. Optimize your visuals for the timeline.",
    educationalContent:
      "On X (formerly Twitter), images in the timeline are often cropped if they don't match standard aspect ratios. Using the right dimensions ensures your full image is visible.",
    simpleIconSlug: "x",
    colorHex: "000000",
    dimensions: [
      { label: "Profile Picture", width: 400, height: 400, aspectRatio: 1, description: "Circular display." },
      { label: "Header Photo", width: 1500, height: 500, aspectRatio: 3, description: "Top banner on profile." },
      { label: "In-Stream Photo", width: 1600, height: 900, aspectRatio: 16 / 9, description: "Standard post image." },
      { label: "Card Image", width: 1200, height: 628, aspectRatio: 1.91, description: "For link previews." },
    ],
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    displayName: "LinkedIn Photo Resizer",
    description:
      "Professional image resizing for LinkedIn profiles, banners, and company pages. Look your best in the professional network.",
    educationalContent:
      "LinkedIn requires professional-looking imagery. Pixelated or badly cropped images can harm your personal brand or company image.",
    simpleIconSlug: "linkedin",
    colorHex: "0A66C2",
    dimensions: [
      { label: "Profile Picture", width: 400, height: 400, aspectRatio: 1, description: "Personal profile photo." },
      {
        label: "Profile Background",
        width: 1584,
        height: 396,
        aspectRatio: 4,
        description: "Personal profile banner.",
      },
      { label: "Company Logo", width: 300, height: 300, aspectRatio: 1, description: "Company page logo." },
      {
        label: "Company Cover",
        width: 1128,
        height: 191,
        aspectRatio: 1128 / 191,
        description: "Company page banner.",
      },
      { label: "Shared Image", width: 1200, height: 627, aspectRatio: 1.91, description: "Post image." },
    ],
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    displayName: "YouTube Photo Resizer",
    description:
      "Create perfect YouTube thumbnails, channel art, and profile pictures. maximize your click-through rates.",
    educationalContent:
      "YouTube thumbnails are critical for CTR. Channel art needs to be responsive across TV, desktop, and mobile.",
    simpleIconSlug: "youtube",
    colorHex: "FF0000",
    dimensions: [
      { label: "Channel Profile", width: 800, height: 800, aspectRatio: 1, description: "Circular channel icon." },
      {
        label: "Channel Art (Banner)",
        width: 2560,
        height: 1440,
        aspectRatio: 16 / 9,
        description: "Safe area is 1546x423.",
      },
      { label: "Video Thumbnail", width: 1280, height: 720, aspectRatio: 16 / 9, description: "Standard HD format." },
    ],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    displayName: "TikTok Photo Resizer",
    description:
      "Resize images for TikTok profile pictures and video covers. Optimize your profile for the For You page.",
    educationalContent:
      "While video-centric, your TikTok profile picture is your brand. Ensure it's clear and centered.",
    simpleIconSlug: "tiktok",
    colorHex: "000000",
    dimensions: [
      { label: "Profile Picture", width: 200, height: 200, aspectRatio: 1, description: "Circular display." },
      {
        label: "Video Cover",
        width: 1080,
        height: 1920,
        aspectRatio: 9 / 16,
        description: "For uploading custom covers.",
      },
    ],
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    displayName: "Pinterest Photo Resizer",
    description: "Create perfectly sized Pins and board covers. Optimize your images for discovery and saving.",
    educationalContent:
      "Pinterest favors vertical images. Taller images take up more screen real estate and get more attention.",
    simpleIconSlug: "pinterest",
    colorHex: "E60023",
    dimensions: [
      { label: "Profile Picture", width: 165, height: 165, aspectRatio: 1, description: "Circular display." },
      {
        label: "Standard Pin",
        width: 1000,
        height: 1500,
        aspectRatio: 2 / 3,
        description: "Recommended vertical ratio.",
      },
      { label: "Square Pin", width: 1000, height: 1000, aspectRatio: 1, description: "For carousel pins." },
      { label: "Board Cover", width: 600, height: 600, aspectRatio: 1, description: "Square thumbnail for boards." },
    ],
  },
  discord: {
    id: "discord",
    name: "Discord",
    displayName: "Discord Photo Resizer",
    description:
      "Resize images for Discord avatars, server icons, and banners. Customize your server and profile appearance.",
    educationalContent:
      "Discord relies heavily on icons and banners for server identity. Animated GIFs are also supported for Nitro users (static supported here).",
    simpleIconSlug: "discord",
    colorHex: "5865F2",
    dimensions: [
      { label: "Profile Avatar", width: 128, height: 128, aspectRatio: 1, description: "User profile picture." },
      { label: "Server Icon", width: 512, height: 512, aspectRatio: 1, description: "Server logo." },
      {
        label: "Server Banner",
        width: 960,
        height: 540,
        aspectRatio: 16 / 9,
        description: "Background for server list/invite.",
      },
      { label: "Profile Banner", width: 600, height: 240, aspectRatio: 2.5, description: "User profile background." },
    ],
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    displayName: "Reddit Photo Resizer",
    description:
      "Resize images for Reddit community icons, banners, and posts. Customize your subreddit or user profile.",
    educationalContent:
      "Subreddits need specific icon and banner sizes to look professional. User profiles also support banners.",
    simpleIconSlug: "reddit",
    colorHex: "FF4500",
    dimensions: [
      { label: "Community Icon", width: 256, height: 256, aspectRatio: 1, description: "Subreddit logo." },
      {
        label: "Community Banner",
        width: 4000,
        height: 128,
        aspectRatio: 4000 / 128,
        description: "Top banner for subreddit (Small).",
      },
      {
        label: "Community Banner (Large)",
        width: 4000,
        height: 192,
        aspectRatio: 4000 / 192,
        description: "Top banner for subreddit (Medium).",
      },
      { label: "Profile Avatar", width: 256, height: 256, aspectRatio: 1, description: "User profile picture." },
      {
        label: "Profile Banner",
        width: 1280,
        height: 384,
        aspectRatio: 10 / 3,
        description: "User profile background.",
      },
    ],
  },
  twitch: {
    id: "twitch",
    name: "Twitch",
    displayName: "Twitch Photo Resizer",
    description: "Create Twitch offline screens, profile banners, and panel images. Brand your streaming channel.",
    educationalContent:
      "Consistent branding across your Twitch channel helps retain viewers. Panels are crucial for conveying info.",
    simpleIconSlug: "twitch",
    colorHex: "9146FF",
    dimensions: [
      { label: "Profile Picture", width: 256, height: 256, aspectRatio: 1, description: "Channel avatar." },
      { label: "Profile Banner", width: 1200, height: 480, aspectRatio: 2.5, description: "Header background." },
      { label: "Video Player Banner", width: 1920, height: 1080, aspectRatio: 16 / 9, description: "Offline screen." },
      {
        label: "Panel Image",
        width: 320,
        height: 160,
        aspectRatio: 2,
        description: "Info panels below stream (Width fixed 320px).",
      },
    ],
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    displayName: "Bluesky Photo Resizer",
    description: "Resize images for Bluesky profiles and posts. Get your decentralized identity looking sharp.",
    educationalContent: "Bluesky uses standard aspect ratios similar to X/Twitter.",
    simpleIconSlug: "bluesky",
    colorHex: "1185FE",
    dimensions: [
      { label: "Profile Picture", width: 400, height: 400, aspectRatio: 1, description: "Circular avatar." },
      { label: "Profile Banner", width: 1500, height: 500, aspectRatio: 3, description: "Header image." },
    ],
  },
  threads: {
    id: "threads",
    name: "Threads",
    displayName: "Threads Photo Resizer",
    description: "Resize photos for Threads profiles and posts. Optimize for Meta's conversation app.",
    educationalContent: "Threads imports from Instagram often, but standalone setup requires specific dimensions.",
    simpleIconSlug: "threads",
    colorHex: "000000",
    dimensions: [
      { label: "Profile Picture", width: 320, height: 320, aspectRatio: 1, description: "Circular avatar." },
      { label: "Post Image", width: 1080, height: 1080, aspectRatio: 1, description: "Square posts work best." },
    ],
  },
  mastodon: {
    id: "mastodon",
    name: "Mastodon",
    displayName: "Mastodon Photo Resizer",
    description: "Resize images for Mastodon profiles and headers. Perfect for the Fediverse.",
    educationalContent: "Mastodon instances may vary, but standard dimensions apply across most servers.",
    simpleIconSlug: "mastodon",
    colorHex: "6364FF",
    dimensions: [
      { label: "Profile Picture", width: 400, height: 400, aspectRatio: 1, description: "Avatar." },
      { label: "Header Image", width: 1500, height: 500, aspectRatio: 3, description: "Profile banner." },
    ],
  },
  snapchat: {
    id: "snapchat",
    name: "Snapchat",
    displayName: "Snapchat Photo Resizer",
    description: "Create content for Snapchat Stories and ads. Vertical format is key.",
    educationalContent: "Snapchat is exclusively vertical. Full screen content works best.",
    simpleIconSlug: "snapchat",
    colorHex: "FFFC00",
    dimensions: [
      { label: "Story / Snap", width: 1080, height: 1920, aspectRatio: 9 / 16, description: "Full screen vertical." },
      { label: "Geofilter", width: 1080, height: 2340, aspectRatio: 6 / 13, description: "Overlay image." },
    ],
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    displayName: "Spotify Photo Resizer",
    description:
      "Resize images for Spotify playlists and artist profiles. Professionalize your music or podcast presence.",
    educationalContent: "Playlist covers are often the first thing listeners see.",
    simpleIconSlug: "spotify",
    colorHex: "1DB954",
    dimensions: [
      { label: "Playlist Cover", width: 640, height: 640, aspectRatio: 1, description: "Square image." },
      {
        label: "Artist Header",
        width: 2660,
        height: 1140,
        aspectRatio: 2660 / 1140,
        description: "Banner for artist profiles.",
      },
      { label: "Artist Avatar", width: 750, height: 750, aspectRatio: 1, description: "Profile picture." },
    ],
  },
  steam: {
    id: "steam",
    name: "Steam",
    displayName: "Steam Photo Resizer",
    description: "Create Steam avatars and workshop images. Customize your gaming profile.",
    educationalContent: "Steam avatars appear in many sizes (184px, 64px, 32px).",
    simpleIconSlug: "steam",
    colorHex: "000000",
    dimensions: [{ label: "Avatar", width: 184, height: 184, aspectRatio: 1, description: "Main profile avatar." }],
  },
  vk: {
    id: "vk",
    name: "VK",
    displayName: "VK Photo Resizer",
    description: "Resize images for VK posts, communities, and profiles.",
    educationalContent: "VK supports high resolution uploads.",
    simpleIconSlug: "vk",
    colorHex: "0077FF",
    dimensions: [
      {
        label: "Profile Photo",
        width: 200,
        height: 500,
        aspectRatio: 2 / 5,
        description: "Can be rectangular vertical.",
      },
      { label: "Community Cover", width: 1590, height: 530, aspectRatio: 3, description: "Header for groups." },
      { label: "Post Image", width: 700, height: 500, aspectRatio: 1.4, description: "Standard post." },
    ],
  },
  tumblr: {
    id: "tumblr",
    name: "Tumblr",
    displayName: "Tumblr Photo Resizer",
    description: "Resize images for Tumblr blogs and posts.",
    educationalContent: "Tumblr is flexible but specific dimensions help themes look better.",
    simpleIconSlug: "tumblr",
    colorHex: "36465D",
    dimensions: [
      { label: "Profile Avatar", width: 128, height: 128, aspectRatio: 1, description: "Square icon." },
      { label: "Header Image", width: 3000, height: 1055, aspectRatio: 3000 / 1055, description: "Blog header." },
    ],
  },
  substack: {
    id: "substack",
    name: "Substack",
    displayName: "Substack Photo Resizer",
    description: "Resize publication logos and cover images for Substack.",
    educationalContent: "Clean visuals help newsletters stand out in inboxes.",
    simpleIconSlug: "substack",
    colorHex: "FF6719",
    dimensions: [
      { label: "Publication Logo", width: 256, height: 256, aspectRatio: 1, description: "Square logo." },
      { label: "Cover Image", width: 600, height: 600, aspectRatio: 1, description: "Social preview image." },
    ],
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    displayName: "Telegram Photo Resizer",
    description: "Resize images for Telegram profiles and channels.",
    educationalContent: "Telegram uses circular crops for profiles and channels.",
    simpleIconSlug: "telegram",
    colorHex: "26A5E4",
    dimensions: [
      { label: "Profile Photo", width: 640, height: 640, aspectRatio: 1, description: "User or channel icon." },
    ],
  },
  nostr: {
    id: "nostr",
    name: "Nostr",
    displayName: "Nostr Photo Resizer",
    description: "Resize images for Nostr clients.",
    educationalContent: "Nostr clients often use standard social media dimensions.",
    simpleIconSlug: "nostr",
    colorHex: "8E30EB",
    dimensions: [
      { label: "Profile Picture", width: 400, height: 400, aspectRatio: 1, description: "Avatar." },
      { label: "Banner", width: 1500, height: 500, aspectRatio: 3, description: "Profile header." },
    ],
  },
  dribbble: {
    id: "dribbble",
    name: "Dribbble",
    displayName: "Dribbble Photo Resizer",
    description: "Format your design shots for Dribbble.",
    educationalContent: "Dribbble shots have very specific requirements to look crisp.",
    simpleIconSlug: "dribbble",
    colorHex: "EA4C89",
    dimensions: [
      {
        label: "Shot",
        width: 1600,
        height: 1200,
        aspectRatio: 4 / 3,
        description: "Standard shot size (High DPI recommended).",
      },
    ],
  },
  lemmy: {
    id: "lemmy",
    name: "Lemmy",
    displayName: "Lemmy Photo Resizer",
    description: "Resize icons and banners for Lemmy communities.",
    educationalContent: "Lemmy UI is similar to Reddit.",
    simpleIconSlug: "lemmy",
    colorHex: "000000",
    dimensions: [
      { label: "Community Icon", width: 256, height: 256, aspectRatio: 1, description: "Square icon." },
      { label: "Community Banner", width: 1000, height: 200, aspectRatio: 5, description: "Header image." },
    ],
  },
  slack: {
    id: "slack",
    name: "Slack",
    displayName: "Slack Photo Resizer",
    description: "Create perfect Slack profile photos and emojis.",
    educationalContent: "Slack avatars are small, so clarity is key.",
    simpleIconSlug: "slack",
    colorHex: "4A154B",
    dimensions: [
      {
        label: "Profile Picture",
        width: 512,
        height: 512,
        aspectRatio: 1,
        description: "Upload large, Slack scales it down.",
      },
    ],
  },
  medium: {
    id: "medium",
    name: "Medium",
    displayName: "Medium Photo Resizer",
    description: "Resize images for Medium articles and profiles.",
    educationalContent: "High quality hero images improve article engagement.",
    simpleIconSlug: "medium",
    colorHex: "000000",
    dimensions: [
      { label: "Profile Picture", width: 1000, height: 1000, aspectRatio: 1, description: "Circular avatar." },
      { label: "Background Image", width: 1500, height: 750, aspectRatio: 2, description: "Publication header." },
    ],
  },
  github: {
    id: "github",
    name: "GitHub",
    displayName: "GitHub Photo Resizer",
    description: "Resize images for GitHub profiles and social previews.",
    educationalContent: "Professional avatars build trust in open source.",
    simpleIconSlug: "github",
    colorHex: "181717",
    dimensions: [
      { label: "Profile Picture", width: 500, height: 500, aspectRatio: 1, description: "Square avatar." },
      { label: "Social Preview", width: 1280, height: 640, aspectRatio: 2, description: "Repo social card." },
    ],
  },
  warpcast: {
    id: "warpcast",
    name: "Warpcast",
    displayName: "Warpcast Photo Resizer",
    description: "Resize images for Farcaster/Warpcast profiles.",
    educationalContent: "Farcaster clients use standard dimensions.",
    simpleIconSlug: "farcaster",
    colorHex: "855DCD",
    dimensions: [{ label: "Profile Picture", width: 320, height: 320, aspectRatio: 1, description: "Avatar." }],
  },
};

export const imageResizerPlatformList = Object.values(imageResizerPlatformConfigs);
