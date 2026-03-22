import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/[locale]/(home)/layout.tsx
 * Docs Layout: app/[locale]/docs/layout.tsx
 */
export function baseOptions(lang: string): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image
            src="/rybbit/horizontal_white.svg"
            alt="Rybbit"
            width={120}
            height={0}
            style={{ height: "auto" }}
            className="mr-2 invert dark:invert-0"
          />
        </>
      ),
    },
    // see https://fumadocs.dev/docs/ui/navigation/links
    links: [
      {
        text: "Demo",
        url: "https://demo.rybbit.com/1",
        external: true,
      },
    ],
  };
}
