import { platformList } from "./platform-configs";
import { commentPlatformList } from "./comment-platform-configs";
import { pageNamePlatformList } from "./page-name-platform-configs";
import { postGeneratorPlatformList } from "./post-generator-platform-configs";
import { usernameGeneratorPlatformList } from "./username-generator-platform-configs";
import { hashtagGeneratorPlatformList } from "./hashtag-generator-platform-configs";
import { characterCounterPlatformList } from "./character-counter-platform-configs";
import { bioGeneratorPlatformList } from "./bio-generator-platform-configs";
import { imageResizerPlatformList } from "./image-resizer-platform-configs";
import { logoGeneratorPlatformList } from "./logo-generator-platform-configs";

// Single source of truth for every live social-media tool URL. Used by both
// [slug]/generateStaticParams and sitemap.ts so built pages and the sitemap
// can't drift apart. Retired platforms are already filtered out of each list.
export const socialMediaToolSlugs: string[] = [
  ...platformList.map(p => `${p.id}-font-generator`),
  ...commentPlatformList.map(p => `${p.id}-comment-generator`),
  ...pageNamePlatformList.map(p => `${p.id}-page-name-generator`),
  ...postGeneratorPlatformList.map(p => `${p.id}-post-generator`),
  ...usernameGeneratorPlatformList.map(p => `${p.id}-username-generator`),
  ...hashtagGeneratorPlatformList.map(p => `${p.id}-hashtag-generator`),
  ...characterCounterPlatformList.map(p => `${p.id}-character-counter`),
  ...bioGeneratorPlatformList.map(p => `${p.id}-bio-generator`),
  ...imageResizerPlatformList.map(p => `${p.id}-photo-resizer`),
  ...logoGeneratorPlatformList.map(p => `${p.id}-logo-generator`),
];
