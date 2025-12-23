import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <Image
          src="/rybbit-text.svg"
          alt="Rybbit"
          width={90}
          height={0}
          style={{ height: "auto" }}
          className="mr-2 invert dark:invert-0"
        />
      </>
    ),
  },
  // see https://fumadocs.dev/docs/ui/navigation/links
  links: [
    //   {
    //     text: "Pricing",
    //     url: "/pricing",
    //   },
    //   {
    //     text: "Docs",
    //     url: "/docs",
    //   },
    {
      text: "Demo",
      url: "https://demo.rybbit.com/1",
      external: true,
    },
    //   {
    //     text: "GitHub",
    //     url: "https://github.com/rybbit-io/rybbit",
    //     external: true,
    //   },
  ],
};
