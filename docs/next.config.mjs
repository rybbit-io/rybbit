import createNextIntlPlugin from 'next-intl/plugin';
import { createMDX } from 'fumadocs-mdx/next';

const withNextIntl = createNextIntlPlugin({
  experimental: {
    srcPath: './src',
    // Enables `useExtracted` (compile-time message extraction). Required for the
    // production build — without it, `useExtracted` throws at runtime. The
    // source locale now lives in `messages.sourceLocale` below.
    extract: true,
    messages: {
      sourceLocale: 'en',
      path: './messages',
      format: 'json',
      locales: ['en', 'de', 'fr', 'zh', 'es', 'pl', 'it', 'ko', 'pt', 'ja'],
    },
  },
});

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'abs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
    ],
  },
  async redirects() {
    // Tools retired 2026-07-18 (off-brand / no organic traffic). Redirect the old URLs to the
    // tools index so residual links and SERP clicks land somewhere useful instead of a 404.
    const logoPlatforms = [
      'instagram', 'x', 'tiktok', 'linkedin', 'youtube', 'facebook', 'pinterest', 'discord', 'twitch',
      'snapchat', 'reddit', 'threads', 'bluesky', 'mastodon', 'github', 'medium', 'substack', 'spotify',
      'telegram', 'whatsapp',
    ];
    const hashtagPlatforms = ['instagram', 'tiktok', 'x', 'linkedin', 'facebook', 'youtube', 'pinterest', 'threads', 'tumblr'];
    const retiredSlugs = [
      ...logoPlatforms.map(p => `${p}-logo-generator`),
      ...hashtagPlatforms.map(p => `${p}-hashtag-generator`),
      ...['nostr', 'lemmy', 'warpcast', 'dribbble', 'mastodon'].map(p => `${p}-font-generator`),
      ...['nostr', 'lemmy', 'warpcast', 'dribbble', 'mastodon', 'vk'].map(p => `${p}-comment-generator`),
      'medium-page-name-generator',
      'medium-post-generator',
      'medium-username-generator',
      'mastodon-character-counter',
      ...['mastodon', 'medium'].map(p => `${p}-bio-generator`),
      ...['nostr', 'lemmy', 'warpcast', 'dribbble', 'mastodon', 'medium', 'vk', 'tumblr'].map(p => `${p}-photo-resizer`),
    ];
    return retiredSlugs.map(slug => ({
      source: `/tools/${slug}`,
      destination: '/tools',
      permanent: true,
    }));
  },
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/:path*',
      },
    ];
  },
};

export default withNextIntl(withMDX(config));
