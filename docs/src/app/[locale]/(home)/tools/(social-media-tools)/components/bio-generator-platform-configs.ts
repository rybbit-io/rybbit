export interface BioGeneratorPlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  simpleIconSlug: string;
  colorHex: string;
  characterLimit: number;
  bioType: string; // "bio", "about", "description", etc.
  educationalContent: string;
  contextGuidelines: string;
  tones: string[];
}

export const bioGeneratorPlatformConfigs: Record<
  string,
  BioGeneratorPlatformConfig
> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    displayName: "Instagram Bio Generator",
    description:
      "Generate compelling Instagram bios with AI. Create bios within the 150-character limit that showcase your personality and drive engagement.",
    simpleIconSlug: "instagram",
    colorHex: "#E4405F",
    characterLimit: 150,
    bioType: "bio",
    contextGuidelines:
      "Instagram bios are limited to 150 characters. Make every character count with a clear value proposition, personality, and call-to-action. Use line breaks and emojis strategically.",
    educationalContent: `Instagram bios have a strict 150-character limit, making them one of the most constrained bio formats. Your bio is prime real estate that appears at the top of your profile and in search results.

Effective Instagram bios quickly communicate who you are, what you do, and why people should follow you. The best bios use emojis for visual breaks, line breaks for readability, and include a clear call-to-action. Many successful accounts use their bio to establish credibility, showcase personality, and direct traffic to their link.`,
    tones: [
      "Professional",
      "Casual & Friendly",
      "Witty & Humorous",
      "Creative & Artistic",
      "Minimalist",
      "Bold & Confident",
    ],
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    displayName: "X (Twitter) Bio Generator",
    description:
      "Generate impactful X (Twitter) bios with AI. Craft bios within the 160-character limit that make a strong first impression.",
    simpleIconSlug: "x",
    colorHex: "#000000",
    characterLimit: 160,
    bioType: "bio",
    contextGuidelines:
      "X bios are limited to 160 characters. Focus on your expertise, interests, or unique perspective. Many users include their location, profession, and a touch of personality.",
    educationalContent: `X (Twitter) bios have a 160-character limit—just 10 more characters than Instagram. Your bio appears on your profile and in search results, making it crucial for first impressions.

Great X bios balance professionalism with personality. They often include your profession or expertise, key interests, and sometimes a hint of humor or unique perspective. Location can be important for local networking. The best bios make it clear why someone should follow you and what value you provide.`,
    tones: [
      "Professional",
      "Casual & Friendly",
      "Witty & Humorous",
      "Thought Leader",
      "Minimalist",
      "Bold & Confident",
    ],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    displayName: "TikTok Bio Generator",
    description:
      "Generate engaging TikTok bios with AI. Create bios within the 80-character limit that capture attention and drive follows.",
    simpleIconSlug: "tiktok",
    colorHex: "#000000",
    characterLimit: 80,
    bioType: "bio",
    contextGuidelines:
      "TikTok bios are extremely limited at just 80 characters. Be concise and catchy. Focus on your content niche and use emojis to save space while adding personality.",
    educationalContent: `TikTok has the most restrictive bio limit at just 80 characters. This extreme constraint forces you to be incredibly concise while still capturing attention and communicating your value.

Effective TikTok bios often use emojis to replace words, focus on a clear content niche, and include just enough personality to intrigue visitors. Since TikTok is all about the content, your bio should quickly tell viewers what kind of videos to expect. The best bios are memorable, on-brand, and leave viewers wanting to see your content.`,
    tones: [
      "Fun & Playful",
      "Trendy & Cool",
      "Creative",
      "Inspirational",
      "Minimalist",
      "Bold & Confident",
    ],
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    displayName: "LinkedIn Bio Generator",
    description:
      "Generate professional LinkedIn bios (About section) with AI. Create compelling professional narratives that showcase your expertise and career story.",
    simpleIconSlug: "linkedin",
    colorHex: "#0A66C2",
    characterLimit: 2600,
    bioType: "About section",
    contextGuidelines:
      "LinkedIn About sections can be up to 2,600 characters. Use this space to tell your professional story, highlight achievements, showcase expertise, and include keywords for searchability. Only the first 300 characters are visible before 'see more.'",
    educationalContent: `LinkedIn's About section allows up to 2,600 characters, giving you room to tell your full professional story. However, only the first 300 characters appear before the "see more" button, so front-load key information.

Great LinkedIn About sections balance professional achievements with personality. They often include your current role, expertise, career highlights, what drives you, and a call-to-action. The best bios use storytelling to make you memorable, include keywords for search optimization, and speak directly to your target audience (recruiters, clients, or collaborators).`,
    tones: [
      "Professional & Polished",
      "Approachable Professional",
      "Thought Leader",
      "Achievement-Focused",
      "Storytelling",
      "Passionate & Driven",
    ],
  },
  threads: {
    id: "threads",
    name: "Threads",
    displayName: "Threads Bio Generator",
    description:
      "Generate conversational Threads bios with AI. Create bios within the 150-character limit that invite connection and discussion.",
    simpleIconSlug: "threads",
    colorHex: "#000000",
    characterLimit: 150,
    bioType: "bio",
    contextGuidelines:
      "Threads bios are limited to 150 characters, same as Instagram. Focus on being conversational and authentic. Threads culture values genuine connection over polished branding.",
    educationalContent: `Threads bios have a 150-character limit, matching Instagram. As Meta's text-first platform, Threads emphasizes conversation and authentic connection over visual branding.

Effective Threads bios are conversational, genuine, and often more casual than other platforms. They focus on interests, perspectives, or what you like to discuss rather than selling or promoting. The best bios invite connection and make it clear what kind of conversations you're interested in having.`,
    tones: [
      "Casual & Friendly",
      "Conversational",
      "Witty & Humorous",
      "Thoughtful",
      "Minimalist",
      "Authentic",
    ],
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    displayName: "YouTube Channel Description Generator",
    description:
      "Generate compelling YouTube channel descriptions with AI. Create descriptions within the 1,000-character limit that attract subscribers.",
    simpleIconSlug: "youtube",
    colorHex: "#FF0000",
    characterLimit: 1000,
    bioType: "channel description",
    contextGuidelines:
      "YouTube channel descriptions can be up to 1,000 characters. Describe your content, upload schedule, and what viewers can expect. Include keywords for search optimization and links to social media.",
    educationalContent: `YouTube channel descriptions have a 1,000-character limit and play a crucial role in channel discovery. Your description appears on your channel page and helps YouTube understand what your content is about.

Great YouTube channel descriptions clearly explain what your channel is about, what viewers will learn or gain, and how often you upload. They include relevant keywords for search optimization, showcase your unique perspective, and often list social media links. The best descriptions balance SEO with personality, making it clear why someone should subscribe.`,
    tones: [
      "Professional",
      "Enthusiastic & Engaging",
      "Educational",
      "Entertaining",
      "Inspiring",
      "Authentic",
    ],
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    displayName: "Pinterest Bio Generator",
    description:
      "Generate Pinterest profile bios with AI. Create bios within the 160-character limit that showcase your interests and drive engagement.",
    simpleIconSlug: "pinterest",
    colorHex: "#E60023",
    characterLimit: 160,
    bioType: "bio",
    contextGuidelines:
      "Pinterest bios are limited to 160 characters. Focus on your interests, what you pin about, and who you help. Include keywords that match what people search for on Pinterest.",
    educationalContent: `Pinterest bios have a 160-character limit and should focus on what you create, curate, or inspire. Pinterest is a visual search engine, so your bio should include keywords people search for.

Effective Pinterest bios describe your niche, what people can expect from your pins, and who you help. They often include interests, creative focus, or expertise areas. The best bios make it clear what value you provide and use keywords that match Pinterest search behavior.`,
    tones: [
      "Inspiring",
      "Creative & Artistic",
      "Helpful & Informative",
      "Passionate",
      "Minimalist",
      "Friendly",
    ],
  },
  github: {
    id: "github",
    name: "GitHub",
    displayName: "GitHub Bio Generator",
    description:
      "Generate professional GitHub bios with AI. Create bios within the 160-character limit that showcase your technical expertise.",
    simpleIconSlug: "github",
    colorHex: "#181717",
    characterLimit: 160,
    bioType: "bio",
    contextGuidelines:
      "GitHub bios are limited to 160 characters. Focus on your tech stack, areas of expertise, current projects, or what you're learning. Keep it professional but show personality.",
    educationalContent: `GitHub bios have a 160-character limit and appear prominently on your profile. They're your chance to make a first impression on potential collaborators, employers, or contributors.

Great GitHub bios clearly communicate your technical expertise, current focus, or what you're building. They often include tech stacks, roles (developer, maintainer, etc.), and areas of interest. The best bios balance technical credibility with approachability, making it clear what you work on and inviting collaboration.`,
    tones: [
      "Professional",
      "Technical & Precise",
      "Collaborative",
      "Passionate Developer",
      "Minimalist",
      "Innovative",
    ],
  },
  twitch: {
    id: "twitch",
    name: "Twitch",
    displayName: "Twitch Bio Generator",
    description:
      "Generate engaging Twitch bios with AI. Create bios within the 300-character limit that connect with your community.",
    simpleIconSlug: "twitch",
    colorHex: "#9146FF",
    characterLimit: 300,
    bioType: "bio",
    contextGuidelines:
      "Twitch bios can be up to 300 characters. Describe your streaming content, schedule, and community vibe. Be welcoming and let your personality shine through.",
    educationalContent: `Twitch bios have a 300-character limit and appear on your channel page. They help viewers understand what to expect from your streams and whether they'll fit into your community.

Effective Twitch bios describe what games or content you stream, your streaming schedule, and the vibe of your community. They're often friendly and welcoming, showcasing personality while setting expectations. The best bios make viewers feel invited to join your community and give them a reason to follow.`,
    tones: [
      "Friendly & Welcoming",
      "Energetic & Hype",
      "Chill & Relaxed",
      "Funny & Entertaining",
      "Community-Focused",
      "Passionate Gamer",
    ],
  },
  medium: {
    id: "medium",
    name: "Medium",
    displayName: "Medium Bio Generator",
    description:
      "Generate compelling Medium bios with AI. Create short bios within the 160-character limit that establish your writing credibility.",
    simpleIconSlug: "medium",
    colorHex: "#000000",
    characterLimit: 160,
    bioType: "short bio",
    contextGuidelines:
      "Medium short bios are limited to 160 characters. Focus on your writing niche, expertise, or perspective. Establish credibility and give readers a reason to follow you.",
    educationalContent: `Medium short bios have a 160-character limit and appear below your name on your profile and articles. They establish your credibility and help readers decide whether to follow you.

Great Medium bios communicate your writing focus, expertise, or unique perspective. They often include professional credentials, topics you write about, or what drives your writing. The best bios make readers trust your insights and want to read more of your work.`,
    tones: [
      "Professional & Authoritative",
      "Thoughtful Writer",
      "Conversational",
      "Expert & Credible",
      "Minimalist",
      "Passionate",
    ],
  },
  substack: {
    id: "substack",
    name: "Substack",
    displayName: "Substack Bio Generator",
    description:
      "Generate compelling Substack bios with AI. Create author bios that build trust and convince readers to subscribe to your newsletter.",
    simpleIconSlug: "substack",
    colorHex: "#FF6719",
    characterLimit: 200,
    bioType: "author bio",
    contextGuidelines:
      "Substack author bios should be concise (aim for ~200 characters for short bio). Establish credibility, explain your newsletter's value, and give readers a reason to subscribe.",
    educationalContent: `Substack bios establish your authority and help convince readers to subscribe to your newsletter. They appear on your publication page and in email previews.

Effective Substack bios balance credentials with personality. They communicate what you write about, why you're qualified to write it, and what value subscribers will get. The best bios build trust quickly, showcase expertise, and make the subscription decision easy by clearly communicating the newsletter's value.`,
    tones: [
      "Professional & Credible",
      "Authoritative",
      "Conversational & Personal",
      "Expert Storyteller",
      "Insightful",
      "Passionate",
    ],
  },
  mastodon: {
    id: "mastodon",
    name: "Mastodon",
    displayName: "Mastodon Bio Generator",
    description:
      "Generate thoughtful Mastodon bios with AI. Create bios within the 500-character limit that reflect your interests and values.",
    simpleIconSlug: "mastodon",
    colorHex: "#6364FF",
    characterLimit: 500,
    bioType: "bio",
    contextGuidelines:
      "Mastodon bios can be up to 500 characters (varies by instance). Focus on interests, values, and what you toot about. Mastodon culture values authenticity and thoughtful discourse.",
    educationalContent: `Mastodon bios can be up to 500 characters on most instances, giving you more room than Twitter-like platforms. Mastodon's decentralized, community-focused culture values thoughtfulness over promotion.

Great Mastodon bios share interests, values, and perspectives rather than selling or promoting. They often include pronouns, accessibility info, and topics of discussion. The best bios are authentic, thoughtful, and invite meaningful connection with like-minded people in the fediverse.`,
    tones: [
      "Thoughtful & Authentic",
      "Friendly & Welcoming",
      "Activist & Value-Driven",
      "Curious & Open",
      "Minimalist",
      "Conversational",
    ],
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    displayName: "Bluesky Bio Generator",
    description:
      "Generate engaging Bluesky bios with AI. Create bios within the 256-character limit that invite connection in the decentralized social space.",
    simpleIconSlug: "bluesky",
    colorHex: "#1185FE",
    characterLimit: 256,
    bioType: "bio",
    contextGuidelines:
      "Bluesky bios are limited to 256 characters. Focus on your interests, what you post about, and your perspective. Bluesky users value authentic conversation and community.",
    educationalContent: `Bluesky bios have a 256-character limit, offering more space than Twitter/X but less than Threads. As a decentralized protocol, Bluesky attracts users who value user control and authentic conversation.

Effective Bluesky bios communicate interests, perspectives, and what you like to discuss. They balance personality with clarity, helping people decide if they want to follow you. The best bios invite connection and make it clear what kind of content and conversations you bring to the platform.`,
    tones: [
      "Casual & Authentic",
      "Thoughtful",
      "Witty & Clever",
      "Friendly",
      "Minimalist",
      "Conversational",
    ],
  },
  discord: {
    id: "discord",
    name: "Discord",
    displayName: "Discord Bio Generator",
    description:
      "Generate Discord About Me bios with AI. Create bios within the 190-character limit that help you connect with communities.",
    simpleIconSlug: "discord",
    colorHex: "#5865F2",
    characterLimit: 190,
    bioType: "About Me",
    contextGuidelines:
      "Discord About Me sections are limited to 190 characters. Share your interests, gaming preferences, or what communities you're part of. Keep it friendly and approachable.",
    educationalContent: `Discord About Me sections have a 190-character limit and appear on your profile when people click your username. They help community members get to know you better.

Great Discord bios share interests, hobbies, gaming preferences, or fun facts about yourself. They're often casual and friendly, matching Discord's community-focused culture. The best bios help you connect with like-minded people in servers and make it easy to start conversations.`,
    tones: [
      "Friendly & Casual",
      "Fun & Playful",
      "Gaming-Focused",
      "Community-Oriented",
      "Minimalist",
      "Witty",
    ],
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    displayName: "Reddit Bio Generator",
    description:
      "Generate Reddit profile bios with AI. Create bios within the 200-character limit that showcase your interests and Reddit personality.",
    simpleIconSlug: "reddit",
    colorHex: "#FF4500",
    characterLimit: 200,
    bioType: "bio",
    contextGuidelines:
      "Reddit bios are limited to 200 characters. Share interests, favorite subreddits, or what you contribute to discussions. Reddit values authenticity and helpful contributions.",
    educationalContent: `Reddit bios have a 200-character limit and appear on your profile page. While Reddit is more about content than profiles, your bio helps people understand your interests and perspective.

Effective Reddit bios share interests, expertise areas, or what communities you participate in. They're often low-key and authentic, matching Reddit's culture of valuing substance over self-promotion. The best bios help establish credibility in your communities and give context to your contributions.`,
    tones: [
      "Casual & Authentic",
      "Helpful & Knowledgeable",
      "Witty & Humorous",
      "Passionate About Topics",
      "Minimalist",
      "Friendly",
    ],
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    displayName: "Spotify Bio Generator",
    description:
      "Generate Spotify artist bios with AI. Create compelling bios within the 1,500-character limit that connect with listeners.",
    simpleIconSlug: "spotify",
    colorHex: "#1DB954",
    characterLimit: 1500,
    bioType: "artist bio",
    contextGuidelines:
      "Spotify artist bios can be up to 1,500 characters. Tell your musical story, describe your sound, share achievements, and connect with listeners emotionally.",
    educationalContent: `Spotify artist bios have a 1,500-character limit and appear on your artist profile. They help listeners understand your music, story, and what makes you unique.

Great Spotify bios tell your musical journey, describe your sound and influences, highlight achievements, and connect emotionally with listeners. They balance professionalism with personality, giving fans insight into who you are as an artist. The best bios make listeners excited to explore your music and follow your journey.`,
    tones: [
      "Artistic & Creative",
      "Passionate Musician",
      "Professional Artist",
      "Authentic & Raw",
      "Inspirational",
      "Genre-Focused",
    ],
  },
};

export const bioGeneratorPlatformList = Object.values(
  bioGeneratorPlatformConfigs
);
