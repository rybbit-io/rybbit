export interface PostGeneratorPlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  simpleIconSlug: string;
  colorHex: string;
  characterLimit?: number;
  educationalContent: string;
  contextGuidelines: string;
  recommendedStyles: string[];
}

export const postGeneratorPlatformConfigs: Record<
  string,
  PostGeneratorPlatformConfig
> = {
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    displayName: "LinkedIn Post Generator",
    description:
      "Generate professional LinkedIn posts with AI. Create engaging content that builds your professional brand and drives engagement.",
    simpleIconSlug: "linkedin",
    colorHex: "#0A66C2",
    characterLimit: 3000,
    contextGuidelines:
      "LinkedIn posts should be professional, insightful, and value-driven. Focus on career insights, industry trends, and thought leadership.",
    educationalContent: `LinkedIn is a professional networking platform where quality content builds your personal brand and attracts opportunities. Posts that share insights, lessons learned, and valuable perspectives perform best.

Effective LinkedIn posts are authentic, provide value, and encourage professional discussion. They often include personal stories, data-driven insights, or actionable advice. The best posts strike a balance between professional and personable.`,
    recommendedStyles: [
      "Professional Insight",
      "Thought Leadership",
      "Personal Story",
      "Industry Analysis",
      "Career Advice",
      "How-To Guide",
      "Question/Discussion",
    ],
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    displayName: "X (Twitter) Post Generator",
    description:
      "Generate engaging X (Twitter) posts with AI. Create concise, impactful tweets that capture attention and drive engagement.",
    simpleIconSlug: "x",
    colorHex: "#000000",
    characterLimit: 280,
    contextGuidelines:
      "X/Twitter posts must be concise and impactful. Every word counts. Focus on hooks, clarity, and engagement.",
    educationalContent: `X (Twitter) is a fast-paced platform where brevity and impact are essential. The 280-character limit means every word must earn its place. Great posts capture attention immediately and encourage interaction.

Effective X posts are concise, clear, and compelling. They often use strong hooks, pose questions, or share surprising insights. The best posts are easily quotable and retweetable.`,
    recommendedStyles: [
      "Hot Take",
      "Question",
      "Thread Starter",
      "Quick Tip",
      "Observation",
      "Announcement",
      "Humorous",
    ],
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    displayName: "Facebook Post Generator",
    description:
      "Generate engaging Facebook posts with AI. Create content that resonates with your community and drives meaningful engagement.",
    simpleIconSlug: "facebook",
    colorHex: "#1877F2",
    characterLimit: 63206,
    contextGuidelines:
      "Facebook posts should be conversational and community-focused. They work well for storytelling, updates, and building relationships.",
    educationalContent: `Facebook is ideal for building community through longer-form, conversational content. Posts can tell stories, share updates, or spark discussions. Visual content and authentic voice perform well.

Effective Facebook posts are warm, genuine, and encourage interaction. They often ask questions, share personal experiences, or provide value to the community. The best posts feel like a conversation with friends.`,
    recommendedStyles: [
      "Conversational",
      "Storytelling",
      "Question",
      "Update/Announcement",
      "Educational",
      "Inspirational",
      "Behind-the-Scenes",
    ],
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    displayName: "Instagram Caption Generator",
    description:
      "Generate creative Instagram captions with AI. Create engaging captions that complement your visuals and boost engagement.",
    simpleIconSlug: "instagram",
    colorHex: "#E4405F",
    characterLimit: 2200,
    contextGuidelines:
      "Instagram captions should complement visuals and encourage engagement. They can be short and punchy or longer and storytelling-focused.",
    educationalContent: `Instagram is a visual platform where captions enhance your images and videos. Captions can range from brief and witty to longer storytelling. The first line is crucial for grabbing attention.

Effective Instagram captions are authentic, engaging, and often include a call-to-action. They might tell a story, share insights, or ask questions. The best captions encourage saves, shares, and comments.`,
    recommendedStyles: [
      "Storytelling",
      "Motivational",
      "Witty/Humorous",
      "Educational",
      "Behind-the-Scenes",
      "Question/Engagement",
      "Minimalist",
    ],
  },
  threads: {
    id: "threads",
    name: "Threads",
    displayName: "Threads Post Generator",
    description:
      "Generate engaging Threads posts with AI. Create conversational content that sparks discussion on Meta's text platform.",
    simpleIconSlug: "threads",
    colorHex: "#000000",
    characterLimit: 500,
    contextGuidelines:
      "Threads posts should be conversational and encourage dialogue. They work well for thoughts, questions, and timely commentary.",
    educationalContent: `Threads by Meta is designed for text-based conversations and real-time engagement. Posts are more casual than LinkedIn but more substantial than Twitter. The platform encourages back-and-forth dialogue.

Effective Threads posts are conversational, timely, and invite responses. They often share perspectives, ask questions, or comment on trending topics. The best posts feel like the start of a conversation.`,
    recommendedStyles: [
      "Conversational",
      "Hot Take",
      "Question",
      "Commentary",
      "Personal Reflection",
      "Observation",
      "Debate Starter",
    ],
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    displayName: "Reddit Post Generator",
    description:
      "Generate authentic Reddit posts with AI. Create valuable content that contributes to subreddit discussions and communities.",
    simpleIconSlug: "reddit",
    colorHex: "#FF4500",
    characterLimit: 40000,
    contextGuidelines:
      "Reddit posts should provide genuine value and respect community rules. Avoid self-promotion and focus on authentic contribution.",
    educationalContent: `Reddit values authentic, valuable content that contributes to community discussions. Each subreddit has its own culture and rules. Posts should respect these norms and provide real value to the community.

Effective Reddit posts are detailed, helpful, and genuine. They might ask thoughtful questions, share unique experiences, or provide in-depth information. The best posts spark meaningful discussion and earn upvotes through quality.`,
    recommendedStyles: [
      "Question/Discussion",
      "Story/Experience",
      "Educational/Guide",
      "Analysis",
      "Recommendation Request",
      "Community Discussion",
      "Informative",
    ],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    displayName: "TikTok Caption Generator",
    description:
      "Generate trendy TikTok captions with AI. Create catchy captions that boost your video's reach and engagement.",
    simpleIconSlug: "tiktok",
    colorHex: "#000000",
    characterLimit: 2200,
    contextGuidelines:
      "TikTok captions should be short, catchy, and trend-aware. They often include hooks, hashtags, and calls-to-action.",
    educationalContent: `TikTok captions complement your video content and help with discoverability. Short, catchy captions with relevant hashtags perform well. The first line should hook viewers scrolling through their feed.

Effective TikTok captions are brief, engaging, and use trending sounds or hashtags strategically. They might pose questions, create curiosity, or add context to the video. The best captions encourage engagement without overshadowing the video.`,
    recommendedStyles: [
      "Hook/Teaser",
      "Trendy",
      "Humorous",
      "Relatable",
      "Story Setup",
      "Challenge/CTA",
      "Educational Hook",
    ],
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    displayName: "YouTube Description Generator",
    description:
      "Generate optimized YouTube descriptions with AI. Create descriptions that improve SEO and encourage viewers to engage.",
    simpleIconSlug: "youtube",
    colorHex: "#FF0000",
    characterLimit: 5000,
    contextGuidelines:
      "YouTube descriptions should be SEO-optimized with keywords, timestamps, and clear CTAs. The first 2-3 lines are most important.",
    educationalContent: `YouTube descriptions help viewers understand your video and improve search rankings. The first 2-3 lines appear before "Show more" and should capture the video's value. Include keywords, timestamps, and links strategically.

Effective YouTube descriptions are informative, keyword-rich, and include clear calls-to-action. They provide context, list key points, and guide viewers to subscribe or visit links. The best descriptions balance SEO with readability.`,
    recommendedStyles: [
      "SEO-Optimized",
      "Educational/Tutorial",
      "Entertainment",
      "Review/Analysis",
      "Vlog-Style",
      "How-To",
      "Storytelling",
    ],
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    displayName: "Pinterest Pin Description Generator",
    description:
      "Generate compelling Pinterest pin descriptions with AI. Create SEO-friendly descriptions that drive saves and clicks.",
    simpleIconSlug: "pinterest",
    colorHex: "#E60023",
    characterLimit: 500,
    contextGuidelines:
      "Pinterest descriptions should be keyword-rich, descriptive, and include clear value. Focus on search optimization and inspiration.",
    educationalContent: `Pinterest is a visual search engine where descriptions help users find your pins. SEO-friendly descriptions with relevant keywords improve discoverability. Focus on what users will learn, make, or achieve.

Effective Pinterest descriptions are detailed, keyword-rich, and benefit-focused. They clearly explain what the pin offers and why users should save it. The best descriptions balance search optimization with natural, compelling language.`,
    recommendedStyles: [
      "SEO-Optimized",
      "How-To/Tutorial",
      "Inspirational",
      "Recipe/DIY",
      "Gift Guide",
      "Listicle",
      "Product Description",
    ],
  },
  medium: {
    id: "medium",
    name: "Medium",
    displayName: "Medium Article Intro Generator",
    description:
      "Generate compelling Medium article introductions with AI. Create hooks that capture readers and encourage them to keep reading.",
    simpleIconSlug: "medium",
    colorHex: "#000000",
    characterLimit: undefined,
    contextGuidelines:
      "Medium posts should be thoughtful, well-written, and provide unique insights. Focus on strong hooks and valuable content.",
    educationalContent: `Medium is a platform for long-form, thoughtful writing. Article introductions should hook readers immediately and promise value. The first few paragraphs determine whether readers continue or bounce.

Effective Medium introductions grab attention with a compelling hook, establish credibility, and clearly communicate what readers will gain. They might start with a story, surprising stat, or bold statement. The best intros make readers eager to continue.`,
    recommendedStyles: [
      "Thought Leadership",
      "Personal Essay",
      "How-To Guide",
      "Analysis",
      "Storytelling",
      "Listicle",
      "Opinion/Commentary",
    ],
  },
  substack: {
    id: "substack",
    name: "Substack",
    displayName: "Substack Newsletter Post Generator",
    description:
      "Generate engaging Substack newsletter posts with AI. Create content that keeps subscribers engaged and attracts new readers.",
    simpleIconSlug: "substack",
    colorHex: "#FF6719",
    characterLimit: undefined,
    contextGuidelines:
      "Substack posts should provide unique value to subscribers. Write in your authentic voice and deliver on your newsletter's promise.",
    educationalContent: `Substack is a newsletter platform where consistent, valuable content builds loyal subscribers. Posts should align with your newsletter's theme and provide insights readers can't find elsewhere.

Effective Substack posts are well-researched, thoughtfully written, and respect subscribers' time and attention. They deliver on your newsletter's value proposition while maintaining your unique voice. The best posts make subscribers glad they're subscribed.`,
    recommendedStyles: [
      "Newsletter Essay",
      "Analysis/Commentary",
      "Curation/Roundup",
      "Personal Insight",
      "Deep Dive",
      "Interview/Q&A",
      "Storytelling",
    ],
  },
};

export const postGeneratorPlatformList = Object.values(
  postGeneratorPlatformConfigs
);
