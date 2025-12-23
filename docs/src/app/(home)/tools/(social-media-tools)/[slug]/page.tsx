import { ToolPageLayout } from "../../components/ToolPageLayout";
import { FontGeneratorTool } from "../components/FontGeneratorTool";
import AICommentForm from "../components/AICommentForm";
import PageNameGenerator from "../components/PageNameGenerator";
import PostGenerator from "../components/PostGenerator";
import UsernameGenerator from "../components/UsernameGenerator";
import ImageResizer from "../components/ImageResizer";
import { HashtagGenerator } from "../components/HashtagGenerator";
import { CharacterCounter } from "../components/CharacterCounter";
import { BioGenerator } from "../components/BioGenerator";
import { LogoGenerator } from "../components/LogoGenerator";
import { platformConfigs, platformList } from "../components/platform-configs";
import { commentPlatformConfigs, commentPlatformList } from "../components/comment-platform-configs";
import { pageNamePlatformConfigs, pageNamePlatformList } from "../components/page-name-platform-configs";
import {
  postGeneratorPlatformConfigs,
  postGeneratorPlatformList,
} from "../components/post-generator-platform-configs";
import {
  usernameGeneratorPlatformConfigs,
  usernameGeneratorPlatformList,
} from "../components/username-generator-platform-configs";
import {
  hashtagGeneratorPlatformConfigs,
  hashtagGeneratorPlatformList,
} from "../components/hashtag-generator-platform-configs";
import {
  characterCounterPlatformConfigs,
  characterCounterPlatformList,
} from "../components/character-counter-platform-configs";
import { bioGeneratorPlatformConfigs, bioGeneratorPlatformList } from "../components/bio-generator-platform-configs";
import { imageResizerPlatformConfigs, imageResizerPlatformList } from "../components/image-resizer-platform-configs";
import {
  logoGeneratorPlatformConfigs,
  logoGeneratorPlatformList,
} from "../components/logo-generator-platform-configs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hash, Palette, Type, User } from "lucide-react";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate static params for all platforms at build time
export async function generateStaticParams() {
  const fontGenerators = platformList.map(platform => ({
    slug: `${platform.id}-font-generator`,
  }));

  const commentGenerators = commentPlatformList.map(platform => ({
    slug: `${platform.id}-comment-generator`,
  }));

  const pageNameGenerators = pageNamePlatformList.map(platform => ({
    slug: `${platform.id}-page-name-generator`,
  }));

  const postGenerators = postGeneratorPlatformList.map(platform => ({
    slug: `${platform.id}-post-generator`,
  }));

  const usernameGenerators = usernameGeneratorPlatformList.map(platform => ({
    slug: `${platform.id}-username-generator`,
  }));

  const hashtagGenerators = hashtagGeneratorPlatformList.map(platform => ({
    slug: `${platform.id}-hashtag-generator`,
  }));

  const characterCounters = characterCounterPlatformList.map(platform => ({
    slug: `${platform.id}-character-counter`,
  }));

  const bioGenerators = bioGeneratorPlatformList.map(platform => ({
    slug: `${platform.id}-bio-generator`,
  }));

  const imageResizers = imageResizerPlatformList.map(platform => ({
    slug: `${platform.id}-photo-resizer`,
  }));

  const logoGenerators = logoGeneratorPlatformList.map(platform => ({
    slug: `${platform.id}-logo-generator`,
  }));

  return [
    ...fontGenerators,
    ...commentGenerators,
    ...pageNameGenerators,
    ...postGenerators,
    ...usernameGenerators,
    ...hashtagGenerators,
    ...characterCounters,
    ...bioGenerators,
    ...imageResizers,
    ...logoGenerators,
  ];
}

// Generate metadata dynamically based on slug
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Check if it's an image resizer
  if (slug.endsWith("-photo-resizer")) {
    const platformId = slug.replace("-photo-resizer", "");
    const platform = imageResizerPlatformConfigs[platformId];

    if (!platform) {
      return { title: "Photo Resizer Not Found" };
    }

    return {
      title: `${platform.displayName} | Free Online Image Cropper`,
      description: platform.description,
      openGraph: {
        title: platform.displayName,
        description: platform.description,
        type: "website",
        url: `https://rybbit.com/tools/${platform.id}-photo-resizer`,
        siteName: "Rybbit Documentation",
      },
      twitter: {
        card: "summary_large_image",
        title: platform.displayName,
        description: platform.description,
      },
      alternates: {
        canonical: `https://rybbit.com/tools/${platform.id}-photo-resizer`,
      },
    };
  }

  // Check if it's a bio generator
  if (slug.endsWith("-bio-generator")) {
    const platformId = slug.replace("-bio-generator", "");
    const platform = bioGeneratorPlatformConfigs[platformId];

    if (!platform) {
      return { title: "Bio Generator Not Found" };
    }

    return {
      title: `${platform.displayName} | AI-Powered ${platform.name} ${platform.bioType}`,
      description: platform.description,
      openGraph: {
        title: platform.displayName,
        description: platform.description,
        type: "website",
        url: `https://rybbit.com/tools/${platform.id}-bio-generator`,
        siteName: "Rybbit Documentation",
      },
      twitter: {
        card: "summary_large_image",
        title: platform.displayName,
        description: platform.description,
      },
      alternates: {
        canonical: `https://rybbit.com/tools/${platform.id}-bio-generator`,
      },
    };
  }

  // Check if it's a character counter
  if (slug.endsWith("-character-counter")) {
    const platformId = slug.replace("-character-counter", "");
    const platform = characterCounterPlatformConfigs[platformId];

    if (!platform) {
      return { title: "Character Counter Not Found" };
    }

    return {
      title: `${platform.displayName} | ${platform.name} Character Limit Tool`,
      description: platform.description,
      openGraph: {
        title: platform.displayName,
        description: platform.description,
        type: "website",
        url: `https://rybbit.com/tools/${platform.id}-character-counter`,
        siteName: "Rybbit Documentation",
      },
      twitter: {
        card: "summary_large_image",
        title: platform.displayName,
        description: platform.description,
      },
      alternates: {
        canonical: `https://rybbit.com/tools/${platform.id}-character-counter`,
      },
    };
  }

  // Check if it's a hashtag generator
  if (slug.endsWith("-hashtag-generator")) {
    const platformId = slug.replace("-hashtag-generator", "");
    const platform = hashtagGeneratorPlatformConfigs[platformId];

    if (!platform) {
      return { title: "Hashtag Generator Not Found" };
    }

    return {
      title: `${platform.displayName} | AI-Powered ${platform.name} Hashtags`,
      description: platform.description,
      openGraph: {
        title: platform.displayName,
        description: platform.description,
        type: "website",
        url: `https://rybbit.com/tools/${platform.id}-hashtag-generator`,
        siteName: "Rybbit Documentation",
      },
      twitter: {
        card: "summary_large_image",
        title: platform.displayName,
        description: platform.description,
      },
      alternates: {
        canonical: `https://rybbit.com/tools/${platform.id}-hashtag-generator`,
      },
    };
  }

  // Check if it's a username generator
  if (slug.endsWith("-username-generator")) {
    const platformId = slug.replace("-username-generator", "");
    const platform = usernameGeneratorPlatformConfigs[platformId];

    if (!platform) {
      return { title: "Username Generator Not Found" };
    }

    return {
      title: `${platform.displayName} | AI-Powered ${platform.name} Usernames`,
      description: platform.description,
      openGraph: {
        title: platform.displayName,
        description: platform.description,
        type: "website",
        url: `https://rybbit.com/tools/${platform.id}-username-generator`,
        siteName: "Rybbit Documentation",
      },
      twitter: {
        card: "summary_large_image",
        title: platform.displayName,
        description: platform.description,
      },
      alternates: {
        canonical: `https://rybbit.com/tools/${platform.id}-username-generator`,
      },
    };
  }

  // Check if it's a post generator
  if (slug.endsWith("-post-generator")) {
    const platformId = slug.replace("-post-generator", "");
    const platform = postGeneratorPlatformConfigs[platformId];

    if (!platform) {
      return { title: "Post Generator Not Found" };
    }

    return {
      title: `${platform.displayName} | AI-Powered ${platform.name} Posts`,
      description: platform.description,
      openGraph: {
        title: platform.displayName,
        description: platform.description,
        type: "website",
        url: `https://rybbit.com/tools/${platform.id}-post-generator`,
        siteName: "Rybbit Documentation",
      },
      twitter: {
        card: "summary_large_image",
        title: platform.displayName,
        description: platform.description,
      },
      alternates: {
        canonical: `https://rybbit.com/tools/${platform.id}-post-generator`,
      },
    };
  }

  // Check if it's a page name generator
  if (slug.endsWith("-page-name-generator")) {
    const platformId = slug.replace("-page-name-generator", "");
    const platform = pageNamePlatformConfigs[platformId];

    if (!platform) {
      return { title: "Page Name Generator Not Found" };
    }

    return {
      title: `${platform.displayName} | AI-Powered ${platform.pageType} Names`,
      description: platform.description,
      openGraph: {
        title: platform.displayName,
        description: platform.description,
        type: "website",
        url: `https://rybbit.com/tools/${platform.id}-page-name-generator`,
        siteName: "Rybbit Documentation",
      },
      twitter: {
        card: "summary_large_image",
        title: platform.displayName,
        description: platform.description,
      },
      alternates: {
        canonical: `https://rybbit.com/tools/${platform.id}-page-name-generator`,
      },
    };
  }

  // Check if it's a comment generator
  if (slug.endsWith("-comment-generator")) {
    const platformId = slug.replace("-comment-generator", "");
    const platform = commentPlatformConfigs[platformId];

    if (!platform) {
      return { title: "Comment Generator Not Found" };
    }

    return {
      title: `${platform.displayName} | AI-Powered ${platform.name} Comments`,
      description: platform.description,
      openGraph: {
        title: platform.displayName,
        description: platform.description,
        type: "website",
        url: `https://rybbit.com/tools/${platform.id}-comment-generator`,
        siteName: "Rybbit Documentation",
      },
      twitter: {
        card: "summary_large_image",
        title: platform.displayName,
        description: platform.description,
      },
      alternates: {
        canonical: `https://rybbit.com/tools/${platform.id}-comment-generator`,
      },
    };
  }

  // Check if it's a logo generator
  if (slug.endsWith("-logo-generator")) {
    const platformId = slug.replace("-logo-generator", "");
    const platform = logoGeneratorPlatformConfigs[platformId];

    if (!platform) {
      return { title: "Logo Generator Not Found" };
    }

    return {
      title: `${platform.displayName} | AI-Powered Brand Logo Creator`,
      description: platform.description,
      openGraph: {
        title: platform.displayName,
        description: platform.description,
        type: "website",
        url: `https://rybbit.com/tools/${platform.id}-logo-generator`,
        siteName: "Rybbit Documentation",
      },
      twitter: {
        card: "summary_large_image",
        title: platform.displayName,
        description: platform.description,
      },
      alternates: {
        canonical: `https://rybbit.com/tools/${platform.id}-logo-generator`,
      },
    };
  }

  // It's a font generator
  const platformId = slug.replace("-font-generator", "");
  const platform = platformConfigs[platformId];

  if (!platform) {
    return {
      title: "Font Generator Not Found",
    };
  }

  return {
    title: `Free ${platform.displayName} | Unicode Font Styles for ${platform.name}`,
    description: platform.description,
    openGraph: {
      title: `Free ${platform.displayName}`,
      description: platform.description,
      type: "website",
      url: `https://rybbit.com/tools/${platform.id}-font-generator`,
      siteName: "Rybbit Documentation",
    },
    twitter: {
      card: "summary_large_image",
      title: `Free ${platform.displayName}`,
      description: platform.description,
    },
    alternates: {
      canonical: `https://rybbit.com/tools/${platform.id}-font-generator`,
    },
  };
}

export default async function PlatformToolPage({ params }: PageProps) {
  const { slug } = await params;

  // Check if it's an image resizer
  if (slug.endsWith("-photo-resizer")) {
    const platformId = slug.replace("-photo-resizer", "");
    const platform = imageResizerPlatformConfigs[platformId];

    if (!platform) {
      notFound();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: platform.displayName,
      description: platform.description,
      url: `https://rybbit.com/tools/${platform.id}-photo-resizer`,
      applicationCategory: "MultimediaApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    };

    const educationalContent = (
      <>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">About {platform.name} Image Sizes</h2>
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use This Tool</h3>
        <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Upload your image</strong> - Drag and drop or click to select
          </li>
          <li>
            <strong>Select the format</strong> - Choose from {platform.dimensions.length} presets (Profile, Cover, Post,
            etc.)
          </li>
          <li>
            <strong>Adjust the crop</strong> - Zoom, rotate, and position your image
          </li>
          <li>
            <strong>Download</strong> - Get your perfectly sized image instantly
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          Standard {platform.name} Dimensions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {platform.dimensions.map(dim => (
            <div
              key={dim.label}
              className="p-4 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg border border-neutral-200 dark:border-neutral-800"
            >
              <div className="font-semibold text-neutral-900 dark:text-white">{dim.label}</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                {dim.width} x {dim.height} px
              </div>
              {dim.description && <div className="text-xs text-neutral-500 mt-1">{dim.description}</div>}
            </div>
          ))}
        </div>
      </>
    );

    const faqs = [
      {
        question: `What are the best image sizes for ${platform.name}?`,
        answer: `${platform.name} recommends different sizes for different placements. For example, profile pictures should be ${platform.dimensions[0].width}x${platform.dimensions[0].height}px. This tool includes all the standard dimensions to ensure your images look crisp.`,
      },
      {
        question: "Does this tool compress my images?",
        answer:
          "This tool resizes and crops your images to the exact dimensions required by the platform. It maintains high quality while ensuring the file size is optimized for web upload.",
      },
      {
        question: "Is my image uploaded to a server?",
        answer:
          "No! All processing happens locally in your browser. Your images never leave your device, ensuring complete privacy and security.",
      },
    ];

    return (
      <ToolPageLayout
        toolSlug={`${platform.id}-photo-resizer`}
        title={platform.displayName}
        description={platform.description}
        badge="Free Tool"
        toolComponent={<ImageResizer platform={platform} />}
        educationalContent={educationalContent}
        faqs={faqs}
        relatedToolsCategory="social-media"
        ctaTitle={`Enhance your ${platform.name} visuals with Rybbit`}
        ctaDescription="Track engagement on your perfectly sized images."
        ctaEventLocation={`${platform.id}_photo_resizer_cta`}
        structuredData={structuredData}
      />
    );
  }

  // Check if it's a bio generator
  if (slug.endsWith("-bio-generator")) {
    const platformId = slug.replace("-bio-generator", "");
    const platform = bioGeneratorPlatformConfigs[platformId];

    // Handle invalid platform
    if (!platform) {
      notFound();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: platform.displayName,
      description: platform.description,
      url: `https://rybbit.com/tools/${platform.id}-bio-generator`,
      applicationCategory: "Utility",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    };

    const educationalContent = (
      <>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          About {platform.name} {platform.bioType}s
        </h2>
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use This Tool</h3>
        <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Enter your name or brand</strong> - What should the bio be about?
          </li>
          <li>
            <strong>Add your profession or role</strong> - What do you do?
          </li>
          <li>
            <strong>Include interests (optional)</strong> - What are you passionate about?
          </li>
          <li>
            <strong>Select your tone</strong> - Choose from {platform.tones.length} tone options
          </li>
          <li>
            <strong>Click "Generate {platform.bioType}"</strong> to get 3 unique variations
          </li>
          <li>
            <strong>Copy and customize</strong> your favorite bio for {platform.name}
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Available Tones</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {platform.tones.map(tone => (
            <div
              key={tone}
              className="p-4 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center gap-2"
            >
              <div className="font-medium text-neutral-900 dark:text-white">{tone}</div>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          Bio Best Practices for {platform.name}
        </h3>
        <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Be authentic:</strong> Let your personality shine through
          </li>
          <li>
            <strong>Front-load important info:</strong> Put key information at the beginning
          </li>
          <li>
            <strong>Include a call-to-action:</strong> Tell people what to do next
          </li>
          <li>
            <strong>Use keywords:</strong> Include relevant terms for discoverability
          </li>
          <li>
            <strong>Stay within the limit:</strong> Keep it under {platform.characterLimit} characters
          </li>
          <li>
            <strong>Update regularly:</strong> Keep your bio current with your focus
          </li>
        </ul>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg h-fit">
              <Type className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-white mb-1">Character Limit</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                {platform.name} {platform.bioType}s have a maximum of {platform.characterLimit} characters. Make every
                character count!
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-6">
          <strong>Note:</strong> While this tool generates high-quality bios, always personalize them to match your
          authentic voice and current focus. The best bios are genuine and reflect who you really are.
        </p>
      </>
    );

    const faqs = [
      {
        question: `How does the ${platform.name} bio generator work?`,
        answer: `This tool uses AI to create compelling ${platform.bioType}s based on your name, profession, interests, and chosen tone. It considers ${platform.name}'s ${platform.characterLimit}-character limit and platform culture to generate bios that resonate with your target audience.`,
      },
      {
        question: "What tones are available?",
        answer: `You can choose from ${platform.tones.length} tones: ${platform.tones.join(
          ", "
        )}. Each tone is optimized for ${
          platform.name
        } and creates a different impression to match your personal brand.`,
      },
      {
        question: "Should I edit the generated bios?",
        answer:
          "Yes! Generated bios are starting points. Customize them with specific details, achievements, or personality quirks that make you unique. The best bios combine AI efficiency with your authentic voice.",
      },
      {
        question: "How many bios can I generate?",
        answer:
          "The tool generates 3 unique bio variations per request. You're limited to 5 requests per minute. If you need more options, try adjusting your inputs or tone selection.",
      },
      {
        question: `What makes a good ${platform.name} bio?`,
        answer: `A great ${platform.name} ${platform.bioType} is authentic, clear, and engaging. It quickly communicates who you are, what you do, and why people should follow or connect with you. ${platform.contextGuidelines}`,
      },
      {
        question: "How can Rybbit help me grow on social media?",
        answer: (
          <>
            Once you have a great bio, Rybbit helps you track engagement, clicks, and growth on {platform.name}.
            Understand what content resonates with your audience and optimize your strategy.{" "}
            <a href="https://rybbit.com" className="text-emerald-600 hover:text-emerald-500 underline">
              Start tracking for free
            </a>
            .
          </>
        ),
      },
    ];

    return (
      <ToolPageLayout
        toolSlug={`${platform.id}-bio-generator`}
        title={platform.displayName}
        description={platform.description}
        badge="AI-Powered Tool"
        toolComponent={<BioGenerator platform={platform} />}
        educationalContent={educationalContent}
        faqs={faqs}
        relatedToolsCategory="social-media"
        ctaTitle={`Build your ${platform.name} presence with Rybbit`}
        ctaDescription={`Track your growth and engagement on ${platform.name} to optimize your content strategy.`}
        ctaEventLocation={`${platform.id}_bio_generator_cta`}
        structuredData={structuredData}
      />
    );
  }

  // Check if it's a character counter
  if (slug.endsWith("-character-counter")) {
    const platformId = slug.replace("-character-counter", "");
    const platform = characterCounterPlatformConfigs[platformId];

    // Handle invalid platform
    if (!platform) {
      notFound();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: platform.displayName,
      description: platform.description,
      url: `https://rybbit.com/tools/${platform.id}-character-counter`,
      applicationCategory: "Utility",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    };

    const educationalContent = (
      <>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          About {platform.name} Character Limits
        </h2>
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use This Tool</h3>
        <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Type or paste your text</strong> into the text area above
          </li>
          <li>
            <strong>Watch the character count</strong> update in real-time
          </li>
          <li>
            <strong>Monitor the progress bar</strong> to see how close you are to the limit
          </li>
          <li>
            <strong>Adjust your text</strong> to stay within {platform.name}'s{" "}
            {platform.characterLimit.toLocaleString()}-character limit
          </li>
          <li>
            <strong>Copy your optimized text</strong> and paste it into {platform.name}
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Understanding the Counter</h3>
        <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Character Count:</strong> Total number of characters including spaces and punctuation
          </li>
          <li>
            <strong>Without Spaces:</strong> Character count excluding all whitespace
          </li>
          <li>
            <strong>Remaining:</strong> How many more characters you can add before hitting the limit
          </li>
          <li>
            <strong>Progress Bar:</strong> Visual indicator of how much of the limit you've used
          </li>
          {platform.recommendedLimit && (
            <li>
              <strong>Recommended Limit:</strong> {platform.name} allows {platform.characterLimit.toLocaleString()}{" "}
              characters, but posts under {platform.recommendedLimit} characters often perform better
            </li>
          )}
        </ul>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-6">
          <strong>Note:</strong> This tool counts characters locally in your browser. Your text is never sent to any
          server, ensuring complete privacy.
        </p>
      </>
    );

    const faqs = [
      {
        question: `What is ${platform.name}'s character limit?`,
        answer: `${platform.name} allows up to ${platform.characterLimit.toLocaleString()} characters per ${
          platform.contentType
        }. ${
          platform.recommendedLimit
            ? `However, posts under ${platform.recommendedLimit} characters typically get better engagement.`
            : ""
        }`,
      },
      {
        question: "How does this character counter work?",
        answer:
          "This tool counts characters in real-time as you type or paste text. It shows your total character count, remaining characters, and a visual progress bar. All counting happens locally in your browser for complete privacy.",
      },
      {
        question: "What counts as a character?",
        answer: `${platform.countingRules} The tool also shows a count without spaces for reference.`,
      },
      {
        question: "What happens if I exceed the character limit?",
        answer: `If your text exceeds ${platform.characterLimit.toLocaleString()} characters, ${
          platform.name
        } will either truncate it or prevent you from posting. The tool alerts you when you're over the limit so you can edit before posting.`,
      },
      {
        question: "Is my text stored or sent anywhere?",
        answer:
          "No! This tool works entirely in your browser. Your text is never sent to any server or stored anywhere. It's completely private and secure.",
      },
      {
        question: "How can Rybbit help me track my social media performance?",
        answer: (
          <>
            Rybbit helps you track engagement, clicks, and performance of your {platform.name} posts. See which content
            resonates with your audience and optimize your strategy.{" "}
            <a href="https://rybbit.com" className="text-emerald-600 hover:text-emerald-500 underline">
              Start tracking for free
            </a>
            .
          </>
        ),
      },
    ];

    return (
      <ToolPageLayout
        toolSlug={`${platform.id}-character-counter`}
        title={platform.displayName}
        description={platform.description}
        badge="Free Tool"
        toolComponent={<CharacterCounter platform={platform} />}
        educationalContent={educationalContent}
        faqs={faqs}
        relatedToolsCategory="social-media"
        ctaTitle={`Track your ${platform.name} performance with Rybbit`}
        ctaDescription={`Monitor engagement and clicks from your ${platform.name} posts to optimize your content strategy.`}
        ctaEventLocation={`${platform.id}_character_counter_cta`}
        structuredData={structuredData}
      />
    );
  }

  // Check if it's a hashtag generator
  if (slug.endsWith("-hashtag-generator")) {
    const platformId = slug.replace("-hashtag-generator", "");
    const platform = hashtagGeneratorPlatformConfigs[platformId];

    // Handle invalid platform
    if (!platform) {
      notFound();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: platform.displayName,
      description: platform.description,
      url: `https://rybbit.com/tools/${platform.id}-hashtag-generator`,
      applicationCategory: "Utility",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    };

    const educationalContent = (
      <>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">About {platform.name} Hashtags</h2>
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use This Tool</h3>
        <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Describe your content</strong> - What is your post about?
          </li>
          <li>
            <strong>Select a strategy</strong> - Choose from {platform.hashtagStrategies.length} platform-optimized
            strategies
          </li>
          <li>
            <strong>Add niche keywords (optional)</strong> - Include specific topics or interests
          </li>
          <li>
            <strong>Click "Generate Hashtags"</strong> to get 3 unique sets
          </li>
          <li>
            <strong>Copy and use</strong> your favorite hashtag set on {platform.name}
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Available Hashtag Strategies</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {platform.hashtagStrategies.map(strategy => (
            <div
              key={strategy}
              className="p-4 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center gap-2"
            >
              <div className="font-medium text-neutral-900 dark:text-white">{strategy}</div>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          Hashtag Best Practices for {platform.name}
        </h3>
        <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Use relevant hashtags:</strong> Choose hashtags that accurately describe your content
          </li>
          <li>
            <strong>Mix popular and niche:</strong> Combine high-volume hashtags with specific niche tags
          </li>
          <li>
            <strong>Research trending tags:</strong> Stay current with trending topics in your niche
          </li>
          <li>
            <strong>Don't overuse:</strong> Follow platform-specific best practices for hashtag counts
          </li>
          <li>
            <strong>Track performance:</strong> Monitor which hashtags drive the most engagement
          </li>
        </ul>

        {platform.maxHashtags && (
          <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg h-fit">
                <Hash className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-neutral-900 dark:text-white mb-1">Platform Guidelines</div>
                <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                  <li>
                    <strong>Maximum hashtags:</strong> {platform.maxHashtags}
                  </li>
                  {platform.characterLimit && (
                    <li>
                      <strong>Character limit:</strong> {platform.characterLimit} total characters
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-6">
          <strong>Note:</strong> While this tool generates strategic hashtags, always review and customize them based on
          your specific content and audience. The most effective hashtags are relevant, timely, and authentic to your
          brand.
        </p>
      </>
    );

    const faqs = [
      {
        question: `How does the ${platform.name} hashtag generator work?`,
        answer: `This tool uses AI to analyze your content topic and generate strategic hashtags based on your chosen strategy. It considers ${platform.name}'s best practices, character limits, and hashtag culture to create effective hashtag sets that maximize reach and engagement.`,
      },
      {
        question: "What hashtag strategies are available?",
        answer: `You can choose from ${platform.hashtagStrategies.length} strategies: ${platform.hashtagStrategies.join(
          ", "
        )}. Each strategy is optimized for ${
          platform.name
        } and designed to help you achieve different goals like viral reach, niche engagement, or community building.`,
      },
      {
        question: "Should I use all the generated hashtags?",
        answer: `Not necessarily. Each set is designed to work together, but you should review and adjust based on your specific content and goals. Some hashtags may be more relevant than others for your particular post. Quality and relevance matter more than quantity.`,
      },
      {
        question: "How many hashtags should I use?",
        answer: `${platform.contextGuidelines} The optimal number varies by platform and content type. Generally, focus on using highly relevant hashtags rather than maxing out the limit.`,
      },
      {
        question: "Can I edit the generated hashtags?",
        answer:
          "Absolutely! Use the generated hashtags as a starting point and customize them to better fit your content. Combining AI-generated hashtags with your own research often yields the best results.",
      },
      {
        question: "How can Rybbit help me track hashtag performance?",
        answer: (
          <>
            Rybbit helps you measure which content and hashtags drive the most engagement on {platform.name}. Track
            clicks, traffic sources, and content performance to optimize your hashtag strategy.{" "}
            <a href="https://rybbit.com" className="text-emerald-600 hover:text-emerald-500 underline">
              Start tracking for free
            </a>
            .
          </>
        ),
      },
    ];

    return (
      <ToolPageLayout
        toolSlug={`${platform.id}-hashtag-generator`}
        title={platform.displayName}
        description={platform.description}
        badge="AI-Powered Tool"
        toolComponent={<HashtagGenerator platform={platform} />}
        educationalContent={educationalContent}
        faqs={faqs}
        relatedToolsCategory="social-media"
        ctaTitle={`Optimize your ${platform.name} hashtag strategy with Rybbit`}
        ctaDescription={`Track which hashtags drive the most engagement and refine your content strategy with data-driven insights.`}
        ctaEventLocation={`${platform.id}_hashtag_generator_cta`}
        structuredData={structuredData}
      />
    );
  }

  // Check if it's a username generator
  if (slug.endsWith("-username-generator")) {
    const platformId = slug.replace("-username-generator", "");
    const platform = usernameGeneratorPlatformConfigs[platformId];

    // Handle invalid platform
    if (!platform) {
      notFound();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: platform.displayName,
      description: platform.description,
      url: `https://rybbit.com/tools/${platform.id}-username-generator`,
      applicationCategory: "Utility",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    };

    const educationalContent = (
      <>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">About {platform.name} Usernames</h2>
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use This Tool</h3>
        <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Enter your name or brand</strong> - What should the username be based on?
          </li>
          <li>
            <strong>Add interests (optional)</strong> - Include keywords or interests to incorporate
          </li>
          <li>
            <strong>Choose number preference</strong> - Decide if you want numbers included
          </li>
          <li>
            <strong>Click "Generate Usernames"</strong> to get 5 unique suggestions
          </li>
          <li>
            <strong>Check availability</strong> on {platform.name} and claim your favorite
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          Username Best Practices for {platform.name}
        </h3>
        <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Keep it memorable:</strong> Choose something easy to spell and remember
          </li>
          <li>
            <strong>Make it brandable:</strong> Think long-term - will this still work in 5 years?
          </li>
          <li>
            <strong>Avoid excessive numbers:</strong> Numbers make usernames harder to remember and share
          </li>
          <li>
            <strong>Check availability:</strong> Always verify the username is available before committing
          </li>
          <li>
            <strong>Be consistent:</strong> Use the same or similar username across platforms when possible
          </li>
        </ul>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg h-fit">
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-white mb-1">Platform Requirements</div>
              <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                <li>
                  <strong>Allowed characters:</strong> {platform.allowedCharacters}
                </li>
                {platform.characterLimit && (
                  <li>
                    <strong>Maximum length:</strong> {platform.characterLimit} characters
                  </li>
                )}
                {platform.minLength && (
                  <li>
                    <strong>Minimum length:</strong> {platform.minLength} characters
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-6">
          <strong>Note:</strong> Always check availability on {platform.name} before settling on a username. Generated
          suggestions are not guaranteed to be available.
        </p>
      </>
    );

    const faqs = [
      {
        question: `How does the ${platform.name} username generator work?`,
        answer: `This tool uses AI to create creative, memorable usernames based on your name, brand, or interests. It considers ${platform.name}'s character limits and naming rules to generate platform-appropriate suggestions.`,
      },
      {
        question: "Are the generated usernames available?",
        answer: `No, this tool generates creative suggestions but doesn't check availability on ${platform.name}. Always verify that your chosen username is available on the platform before committing to it.`,
      },
      {
        question: "Can I modify the generated usernames?",
        answer:
          "Absolutely! Use the generated usernames as inspiration and modify them to better fit your preferences. Combining elements from different suggestions often works well.",
      },
      {
        question: "Should I include numbers in my username?",
        answer:
          "Generally, avoid excessive numbers as they make usernames harder to remember and share verbally. However, a single strategic number can work if it's meaningful or makes the username unique.",
      },
      {
        question: "What makes a good username?",
        answer: `A good ${platform.name} username is memorable, easy to spell, appropriate for the platform, and reflects your brand or personality. It should be something you're comfortable using long-term and sharing professionally if needed.`,
      },
      {
        question: "How can Rybbit help me grow my presence?",
        answer: (
          <>
            Once you've claimed your username, Rybbit helps you track engagement, clicks, and growth on {platform.name}.
            Understand your audience and optimize your content strategy.{" "}
            <a href="https://rybbit.com" className="text-emerald-600 hover:text-emerald-500 underline">
              Start tracking for free
            </a>
            .
          </>
        ),
      },
    ];

    return (
      <ToolPageLayout
        toolSlug={`${platform.id}-username-generator`}
        title={platform.displayName}
        description={platform.description}
        badge="AI-Powered Tool"
        toolComponent={<UsernameGenerator platform={platform} />}
        educationalContent={educationalContent}
        faqs={faqs}
        relatedToolsCategory="social-media"
        ctaTitle={`Build your ${platform.name} presence with Rybbit`}
        ctaDescription={`Track your growth and engagement on ${platform.name} to optimize your content strategy.`}
        ctaEventLocation={`${platform.id}_username_generator_cta`}
        structuredData={structuredData}
      />
    );
  }

  // Check if it's a post generator
  if (slug.endsWith("-post-generator")) {
    const platformId = slug.replace("-post-generator", "");
    const platform = postGeneratorPlatformConfigs[platformId];

    // Handle invalid platform
    if (!platform) {
      notFound();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: platform.displayName,
      description: platform.description,
      url: `https://rybbit.com/tools/${platform.id}-post-generator`,
      applicationCategory: "Utility",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    };

    const educationalContent = (
      <>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">About {platform.name} Posts</h2>
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use This Tool</h3>
        <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Describe your topic</strong> - What do you want to post about?
          </li>
          <li>
            <strong>Select a style</strong> - Choose from {platform.recommendedStyles.length} platform-optimized styles
          </li>
          <li>
            <strong>Add context (optional)</strong> - Include specific details, CTAs, or hashtags
          </li>
          <li>
            <strong>Click "Generate Posts"</strong> to get 3 unique variations
          </li>
          <li>
            <strong>Copy and customize</strong> your favorite post before publishing
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Available Post Styles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {platform.recommendedStyles.map(style => (
            <div
              key={style}
              className="p-4 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center gap-2"
            >
              <div className="font-medium text-neutral-900 dark:text-white">{style}</div>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          Best Practices for {platform.name}
        </h3>
        <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Be authentic:</strong> Personalize AI-generated content to match your voice
          </li>
          <li>
            <strong>Add value:</strong> Ensure your post provides insights, entertainment, or useful information
          </li>
          <li>
            <strong>Engage your audience:</strong> Include questions or CTAs to encourage interaction
          </li>
          <li>
            <strong>Optimize timing:</strong> Post when your audience is most active
          </li>
          <li>
            <strong>Review before posting:</strong> Always edit and customize generated content
          </li>
        </ul>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-6">
          <strong>Note:</strong> While this tool generates high-quality posts, always review and personalize content
          before publishing. Authentic engagement comes from adding your unique perspective and voice.
        </p>
      </>
    );

    const faqs = [
      {
        question: `How does the ${platform.name} post generator work?`,
        answer: `This tool uses AI to create platform-optimized posts based on your topic and chosen style. It considers ${platform.name}'s best practices, character limits, and engagement patterns to generate content that resonates with your audience.`,
      },
      {
        question: "What post styles are available?",
        answer: `You can choose from ${platform.recommendedStyles.length} styles: ${platform.recommendedStyles.join(
          ", "
        )}. Each style is optimized for ${
          platform.name
        } and designed to maximize engagement for different types of content.`,
      },
      {
        question: "Should I edit the generated posts?",
        answer:
          "Yes! Generated posts are starting points. Always personalize them with your unique voice, specific details, and brand personality. The best posts combine AI efficiency with human authenticity.",
      },
      {
        question: "How many posts can I generate?",
        answer:
          "The tool generates 3 unique post variations per request. You're limited to 5 requests per minute. If you need more variations, try adjusting your topic or style.",
      },
      {
        question: "Will the posts sound natural?",
        answer: `Yes! The AI is trained to create authentic, engaging content that matches ${platform.name}'s tone and style. However, adding your personal touch makes posts even more effective and genuine.`,
      },
      {
        question: "How can Rybbit help me measure post performance?",
        answer: (
          <>
            Rybbit tracks clicks, engagement, and traffic from your {platform.name} posts. See which content drives the
            most interaction and optimize your social media strategy.{" "}
            <a href="https://rybbit.com" className="text-emerald-600 hover:text-emerald-500 underline">
              Start tracking for free
            </a>
            .
          </>
        ),
      },
    ];

    return (
      <ToolPageLayout
        toolSlug={`${platform.id}-post-generator`}
        title={platform.displayName}
        description={platform.description}
        badge="AI-Powered Tool"
        toolComponent={<PostGenerator platform={platform} />}
        educationalContent={educationalContent}
        faqs={faqs}
        relatedToolsCategory="social-media"
        ctaTitle={`Optimize your ${platform.name} strategy with Rybbit`}
        ctaDescription="Track which posts drive the most engagement and refine your content strategy with data-driven insights."
        ctaEventLocation={`${platform.id}_post_generator_cta`}
        structuredData={structuredData}
      />
    );
  }

  // Check if it's a page name generator
  if (slug.endsWith("-page-name-generator")) {
    const platformId = slug.replace("-page-name-generator", "");
    const platform = pageNamePlatformConfigs[platformId];

    // Handle invalid platform
    if (!platform) {
      notFound();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: platform.displayName,
      description: platform.description,
      url: `https://rybbit.com/tools/${platform.id}-page-name-generator`,
      applicationCategory: "Utility",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    };

    const educationalContent = (
      <>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          About {platform.name} {platform.pageType} Names
        </h2>
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use This Tool</h3>
        <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Describe your {platform.pageType.toLowerCase()}</strong> - What's it about? What topics will you
            cover?
          </li>
          <li>
            <strong>Add keywords (optional)</strong> - Include specific terms you want in the name
          </li>
          <li>
            <strong>Choose name length</strong> - Short, medium, or long
          </li>
          <li>
            <strong>Click "Generate Names"</strong> to get 5 unique suggestions
          </li>
          <li>
            <strong>Copy your favorite</strong> and use it for your {platform.name} {platform.pageType.toLowerCase()}
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          Best Practices for {platform.name} {platform.pageType} Names
        </h3>
        <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Keep it memorable:</strong> Choose a name that's easy to remember and spell
          </li>
          <li>
            <strong>Make it relevant:</strong> The name should clearly reflect your content or purpose
          </li>
          <li>
            <strong>Consider SEO:</strong> Include keywords that people might search for
          </li>
          <li>
            <strong>Check availability:</strong> Make sure the name isn't already taken on {platform.name}
          </li>
          <li>
            <strong>Think long-term:</strong> Choose a name that will still work as your{" "}
            {platform.pageType.toLowerCase()} grows
          </li>
        </ul>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-6">
          <strong>Note:</strong> Always check if your chosen name is available on {platform.name} before committing to
          it. The best names are unique, memorable, and accurately represent your content.
        </p>
      </>
    );

    const faqs = [
      {
        question: `How does the ${platform.name} ${platform.pageType} name generator work?`,
        answer: `This tool uses AI to analyze your topic and keywords, then generates creative, memorable ${platform.pageType.toLowerCase()} names that are optimized for ${
          platform.name
        }. It considers platform-specific best practices and naming conventions.`,
      },
      {
        question: "Can I customize the generated names?",
        answer:
          "Absolutely! The generated names are starting points. Feel free to modify them, combine elements from different suggestions, or use them as inspiration for your own variations.",
      },
      {
        question: "What makes a good name?",
        answer: `A good ${platform.pageType.toLowerCase()} name is memorable, easy to spell, relevant to your content, and unique. It should give potential members or followers a clear idea of what to expect while being catchy enough to remember.`,
      },
      {
        question: "How many names can I generate?",
        answer:
          "The tool generates 5 unique name suggestions per request. You're limited to 5 requests per minute. If you need more options, try adjusting your topic description or keywords for different variations.",
      },
      {
        question: "Are the names guaranteed to be available?",
        answer: `No, the tool generates creative name suggestions but doesn't check availability on ${platform.name}. Always verify that your chosen name is available on the platform before using it.`,
      },
      {
        question: "How can Rybbit help me grow my presence?",
        answer: (
          <>
            Rybbit helps you track engagement, clicks, and traffic sources from your {platform.name} presence.
            Understand what content resonates with your audience and optimize your strategy.{" "}
            <a href="https://rybbit.com" className="text-emerald-600 hover:text-emerald-500 underline">
              Start tracking for free
            </a>
            .
          </>
        ),
      },
    ];

    return (
      <ToolPageLayout
        toolSlug={`${platform.id}-page-name-generator`}
        title={platform.displayName}
        description={platform.description}
        badge="AI-Powered Tool"
        toolComponent={<PageNameGenerator platform={platform} />}
        educationalContent={educationalContent}
        faqs={faqs}
        relatedToolsCategory="social-media"
        ctaTitle={`Grow your ${platform.name} presence with Rybbit`}
        ctaDescription={`Track performance and engagement from your ${
          platform.name
        } ${platform.pageType.toLowerCase()} to understand what works.`}
        ctaEventLocation={`${platform.id}_page_name_generator_cta`}
        structuredData={structuredData}
      />
    );
  }

  // Check if it's a comment generator
  if (slug.endsWith("-comment-generator")) {
    const platformId = slug.replace("-comment-generator", "");
    const platform = commentPlatformConfigs[platformId];

    // Handle invalid platform
    if (!platform) {
      notFound();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: platform.displayName,
      description: platform.description,
      url: `https://rybbit.com/tools/${platform.id}-comment-generator`,
      applicationCategory: "Utility",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    };

    const educationalContent = (
      <>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">About {platform.name} Comments</h2>
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use This Tool</h3>
        <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Paste the original content</strong> you want to comment on in the text area
          </li>
          <li>
            <strong>Select your desired tone</strong> (friendly, professional, humorous, etc.)
          </li>
          <li>
            <strong>Choose comment length</strong> based on your preference
          </li>
          <li>
            <strong>Click "Generate Comments"</strong> to create 3 unique variations
          </li>
          <li>
            <strong>Copy your favorite</strong> and paste it into {platform.name}
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          Best Practices for {platform.name} Comments
        </h3>
        <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Be authentic:</strong> Even AI-generated comments should feel genuine and personal
          </li>
          <li>
            <strong>Add context:</strong> Reference specific parts of the original content
          </li>
          <li>
            <strong>Encourage dialogue:</strong> Ask questions or invite further discussion
          </li>
          <li>
            <strong>Match the tone:</strong> Respect the original post's mood and purpose
          </li>
          <li>
            <strong>Personalize before posting:</strong> Edit generated comments to add your unique voice
          </li>
        </ul>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-6">
          <strong>Note:</strong> While this tool generates comments using AI, always review and personalize them before
          posting. Authentic engagement is key to building genuine connections on {platform.name}.
        </p>
      </>
    );

    const faqs = [
      {
        question: `How does the ${platform.name} comment generator work?`,
        answer: `This tool uses AI to analyze the content you provide and generate contextually relevant comments based on your chosen tone and length preference. It considers ${platform.name}-specific best practices to create authentic, engaging responses.`,
      },
      {
        question: "Can I edit the generated comments before posting?",
        answer:
          "Absolutely! We encourage you to personalize any generated comment to match your voice and add specific details. The generated comments are starting points—your personal touch makes them truly authentic.",
      },
      {
        question: "What tones are available?",
        answer:
          "You can choose from six tones: Friendly (warm and approachable), Professional (polished and business-appropriate), Humorous (light-hearted and funny), Supportive (encouraging and empathetic), Inquisitive (curious and question-asking), and Critical (thoughtfully analytical).",
      },
      {
        question: "How many comments can I generate?",
        answer: (
          <>
            The tool generates 3 unique comment variations per request. You're limited to 5 requests per minute to
            ensure fair usage and maintain service quality for all users.
          </>
        ),
      },
      {
        question: "Will the comments sound natural?",
        answer: `Yes! The AI is trained to create authentic, platform-appropriate comments that match ${platform.name}'s culture and style. However, adding your personal touch will make them even more genuine and effective.`,
      },
      {
        question: "How can Rybbit help me track comment engagement?",
        answer: (
          <>
            Rybbit helps you measure which content drives the most engagement and comments on your social media. Track
            clicks, traffic sources, and content performance to understand what resonates with your audience.{" "}
            <a href="https://rybbit.com" className="text-emerald-600 hover:text-emerald-500 underline">
              Start tracking for free
            </a>
            .
          </>
        ),
      },
    ];

    return (
      <ToolPageLayout
        toolSlug={`${platform.id}-comment-generator`}
        title={platform.displayName}
        description={platform.description}
        badge="AI-Powered Tool"
        toolComponent={<AICommentForm platform={platform} />}
        educationalContent={educationalContent}
        faqs={faqs}
        relatedToolsCategory="social-media"
        ctaTitle="Track engagement and comment activity with Rybbit"
        ctaDescription="Measure which content drives the most comments and engagement on your social media platforms."
        ctaEventLocation={`${platform.id}_comment_generator_cta`}
        structuredData={structuredData}
      />
    );
  }

  // Check if it's a logo generator
  if (slug.endsWith("-logo-generator")) {
    const platformId = slug.replace("-logo-generator", "");
    const platform = logoGeneratorPlatformConfigs[platformId];

    if (!platform) {
      notFound();
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: platform.displayName,
      description: platform.description,
      url: `https://rybbit.com/tools/${platform.id}-logo-generator`,
      applicationCategory: "DesignApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    };

    const educationalContent = (
      <>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          About {platform.name} Logo Generation
        </h2>
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use This Tool</h3>
        <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Enter your brand name</strong> - The name that will inspire the logo design
          </li>
          <li>
            <strong>Add your industry</strong> (optional) - Helps create relevant design elements
          </li>
          <li>
            <strong>Choose a design style</strong> - Select from {platform.recommendedStyles.length} style options
          </li>
          <li>
            <strong>Specify colors</strong> (optional) - Add preferred colors or let AI choose
          </li>
          <li>
            <strong>Click "Generate Logo"</strong> to create your unique brand logo
          </li>
          <li>
            <strong>Download</strong> your logo in PNG format for immediate use
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Recommended Design Styles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {platform.recommendedStyles.map(style => (
            <div
              key={style}
              className="p-4 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center gap-2"
            >
              <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div className="font-medium text-neutral-900 dark:text-white">{style}</div>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          Logo Design Tips for {platform.name}
        </h3>
        <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
          <li>
            <strong>Keep it simple:</strong> Simple logos are more memorable and work better at small sizes
          </li>
          <li>
            <strong>Consider the format:</strong> {platform.name} displays logos in various sizes and shapes
          </li>
          <li>
            <strong>Choose appropriate colors:</strong> Colors should reflect your brand personality
          </li>
          <li>
            <strong>Test at different sizes:</strong> Ensure your logo looks good as a tiny profile icon
          </li>
          <li>
            <strong>Iterate and refine:</strong> Generate multiple options and choose the best fit
          </li>
        </ul>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-6">
          <strong>Note:</strong> AI-generated logos are starting points. Consider working with a designer to refine your
          final brand identity. Always ensure your logo is unique and doesn&apos;t infringe on existing trademarks.
        </p>
      </>
    );

    const faqs = [
      {
        question: `How does the ${platform.name} logo generator work?`,
        answer: `This tool uses AI image generation to create unique brand logos based on your inputs. It considers your brand name, industry, preferred style, and colors to generate a professional logo optimized for ${platform.name}.`,
      },
      {
        question: "What design styles are available?",
        answer: `You can choose from 8 styles: Minimalist, Modern, Playful, Professional, Vintage, Abstract, Geometric, and Hand-drawn. For ${platform.name}, we recommend: ${platform.recommendedStyles.join(", ")}.`,
      },
      {
        question: "Can I use these logos commercially?",
        answer:
          "Yes! The logos generated are yours to use for commercial purposes. However, we recommend having a designer review and refine your logo for professional use, and always conduct a trademark search before finalizing.",
      },
      {
        question: "What file format is the logo?",
        answer:
          "Logos are generated in PNG format, which works well for most digital uses including social media profiles, websites, and presentations. For print or scalable needs, consider recreating the design in vector format.",
      },
      {
        question: "How many logos can I generate?",
        answer:
          "You can generate logos at a rate of 3 per minute. Each generation creates a unique design, so feel free to experiment with different styles and inputs to find the perfect logo.",
      },
      {
        question: "How can Rybbit help with my brand?",
        answer: (
          <>
            Rybbit helps you track your brand&apos;s performance across social media platforms. Monitor how your brand is
            discovered, track engagement, and understand your audience.{" "}
            <a
              href="https://app.rybbit.io/signup"
              className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 underline"
            >
              Start tracking for free
            </a>
            .
          </>
        ),
      },
    ];

    return (
      <ToolPageLayout
        toolSlug={`${platform.id}-logo-generator`}
        title={platform.displayName}
        description={platform.description}
        badge="AI-Powered Tool"
        toolComponent={<LogoGenerator platform={platform} />}
        educationalContent={educationalContent}
        faqs={faqs}
        relatedToolsCategory="social-media"
        ctaTitle={`Build your ${platform.name} brand presence with Rybbit`}
        ctaDescription={`Track how your brand performs on ${platform.name}. Measure visibility, engagement, and growth with powerful analytics.`}
        ctaEventLocation={`${platform.id}_logo_generator_cta`}
        structuredData={structuredData}
      />
    );
  }

  // It's a font generator
  const platformId = slug.replace("-font-generator", "");
  const platform = platformConfigs[platformId];

  // Handle invalid platform
  if (!platform) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: platform.displayName,
    description: platform.description,
    url: `https://rybbit.com/tools/${platform.id}-font-generator`,
    applicationCategory: "Utility",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "Rybbit",
      url: "https://rybbit.com",
    },
  };

  const educationalContent = (
    <>
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">About {platform.name} Font Styles</h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">{platform.educationalContent}</p>

      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Use</h3>
      <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
        <li>
          <strong>Type your text</strong> in the input box above
        </li>
        <li>
          <strong>Browse the font styles</strong> that appear automatically
        </li>
        <li>
          <strong>Click "Copy"</strong> on any style you like
        </li>
        <li>
          <strong>Paste it</strong> into your {platform.name} posts, comments, or bio
        </li>
      </ol>

      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-6">
        <strong>Note:</strong> These fonts use Unicode characters and work across most platforms and devices. However,
        some fonts may not display correctly on older systems or certain applications.
      </p>
    </>
  );

  const fontFaqs = [
    {
      question: `How do ${platform.name} font generators work?`,
      answer: `This tool uses Unicode characters to transform your text into different font styles. Unicode includes thousands of special characters that look like styled versions of regular letters. When you type text, the generator maps each character to its Unicode equivalent in various styles.`,
    },
    {
      question: "Will these fonts work everywhere?",
      answer: `These Unicode fonts work on most modern platforms and devices, including ${platform.name}, other social media sites, messaging apps, and websites. However, some older systems or applications may not support all Unicode characters and might display them as boxes or question marks.`,
    },
    {
      question: "Can I use these fonts in my bio or username?",
      answer: `Yes! These Unicode fonts work in most text fields on ${platform.name}, including bios, usernames (where special characters are allowed), posts, comments, and messages. However, some platforms may have restrictions on special characters in certain fields.`,
    },
    {
      question: "Are these fonts safe to use?",
      answer:
        "Absolutely! These fonts use standard Unicode characters that are part of the official character encoding system. They're completely safe and won't harm your device or account. However, use them appropriately and avoid excessive styling that might reduce readability.",
    },
    {
      question: "Do I need to install anything?",
      answer:
        "No installation required! This is a web-based tool that works directly in your browser. Simply type your text, copy the style you like, and paste it wherever you want to use it. The Unicode characters are supported natively by most systems.",
    },
    {
      question: "How can Rybbit help me track my social media performance?",
      answer: (
        <>
          Rybbit helps you track clicks, engagement, and traffic sources from your {platform.name} posts and bio links.
          See which content drives the most engagement and optimize your social media strategy.{" "}
          <a href="https://rybbit.com" className="text-emerald-600 hover:text-emerald-500 underline">
            Start tracking for free
          </a>
          .
        </>
      ),
    },
  ];

  return (
    <ToolPageLayout
      toolSlug={`${platform.id}-font-generator`}
      title={platform.displayName}
      description={platform.description}
      badge="Free Tool"
      toolComponent={<FontGeneratorTool platformName={platform.name} characterLimit={platform.characterLimit} />}
      educationalContent={educationalContent}
      faqs={fontFaqs}
      relatedToolsCategory="social-media"
      ctaTitle="Track your social media engagement with Rybbit"
      ctaDescription="Monitor clicks, traffic sources, and content performance across all your social platforms."
      ctaEventLocation={`${platform.id}_font_generator_cta`}
      structuredData={structuredData}
    />
  );
}
