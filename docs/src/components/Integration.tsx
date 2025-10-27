import { cn } from "@/lib/utils";
import { Marquee } from "@/components/magicui/marquee";
import Image from "next/image";
import Link from "next/link";

// Platform logos from the public directory with their documentation paths
const platforms = [
  { name: "Next.js", logo: "/platforms/nextjs.svg", path: "/docs/guides/react/next-js" },
  { name: "React", logo: "/platforms/react.svg", path: "/docs/guides/react/vite-cra" },
  { name: "Vue", logo: "/platforms/vue.svg", path: "/docs/guides/vue/vite" },
  { name: "Angular", logo: "/platforms/angular.svg", path: "/docs/guides/angular" },
  { name: "Svelte", logo: "/platforms/svelte.svg", path: "/docs/guides/svelte/vite" },
  { name: "Remix", logo: "/platforms/remix.png", path: "/docs/guides/react/remix" },
  { name: "Gatsby", logo: "/platforms/gatsby.svg", path: "/docs/guides/react/gatsby" },
  { name: "Nuxt", logo: "/platforms/nuxt.svg", path: "/docs/guides/vue/nuxt" },
  { name: "WordPress", logo: "/platforms/wordpress.svg", path: "/docs/guides/wordpress" },
  { name: "Shopify", logo: "/platforms/shopify.svg", path: "/docs/guides/shopify" },
  { name: "Webflow", logo: "/platforms/webflow.svg", path: "/docs/guides/webflow" },
  { name: "Laravel", logo: "/platforms/laravel.svg", path: "/docs/guides/laravel" },
  { name: "GTM", logo: "/platforms/gtm.svg", path: "/docs/guides/google-tag-manager" },
  { name: "Docusaurus", logo: "/platforms/docusaurus.svg", path: "/docs/guides/docusaurus" },
  { name: "WooCommerce", logo: "/platforms/woocommerce.svg", path: "/docs/guides/woocommerce" },
  { name: "Mintlify", logo: "/platforms/mintlify.svg", path: "/docs/guides/mintlify" },
];

// Shuffle function to randomize array order
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const PlatformLogo = ({ name, logo, path }: { name: string; logo: string; path: string }) => {
  return (
    <Link href={path} className="block">
      <div
        className={cn(
          "flex items-center justify-center h-20 w-20 mx-2 my-2",
          "bg-neutral-800/50 backdrop-blur-sm rounded-lg p-4",
          "border border-neutral-700/50 hover:border-neutral-500 transition-colors duration-200",
          "cursor-pointer hover:scale-105 transition-transform"
        )}
      >
        <Image src={logo} alt={name} width={60} height={60} className="object-contain max-h-10" />
      </div>
    </Link>
  );
};

export function Integrations() {
  // Create two different shuffled arrays for the marquee rows
  const topRowPlatforms = shuffleArray(platforms);
  const bottomRowPlatforms = shuffleArray(platforms);

  return (
    <div className="py-20 w-full">
      <div className="max-w-7xl mx-auto px-4 mb-10 text-center">
        <div className="inline-block bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
          Seamless Integration
        </div>
        <h2 className="text-4xl font-bold mb-3">Works with all your favorite platforms</h2>
        <p className="text-xl text-neutral-300 font-light">Integrate Rybbit with any platform in minutes</p>
      </div>

      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden gap-8">
        <Marquee pauseOnHover className="[--duration:120s]" reverse>
          {topRowPlatforms.map((platform, index) => (
            <PlatformLogo key={`top-${index}`} {...platform} />
          ))}
        </Marquee>

        <Marquee pauseOnHover className="[--duration:90s]">
          {bottomRowPlatforms.map((platform, index) => (
            <PlatformLogo key={`bottom-${index}`} {...platform} />
          ))}
        </Marquee>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background"></div>
      </div>
    </div>
  );
}
