import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { getLayoutTabs } from "fumadocs-ui/layouts/shared";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/[locale]/layout.config";
import { source } from "@/lib/source";
import { GithubInfo } from "fumadocs-ui/components/github-info";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tree = source.pageTree[locale];
  const { nav, ...base } = baseOptions(locale);

  // Mintlify-style section tabs in the navbar (one per `root: true` folder:
  // Documentation + API Reference). Built server-side so no function crosses
  // the RSC boundary. The navbar renderer only shows `title`, while the mobile
  // dropdown renders `icon` in its own slot — so we fold the folder icon into
  // `title` (for the navbar) and drop `icon`, which avoids rendering it twice
  // on mobile. We use the raw `node.icon` (an inline <svg>) rather than the
  // default-transformed `option.icon`, which fumadocs wraps in a <div>: a
  // <div> inside the dropdown's <p> is invalid HTML and breaks hydration.
  // Styling into prominent pills lives in `global.css` (`#nd-subnav`).
  const tabs = getLayoutTabs(tree, {
    transform: (option, node) => ({
      ...option,
      icon: undefined,
      title: (
        <>
          {node.icon ? <span className="fd-tab-icon">{node.icon}</span> : null}
          {option.title}
        </>
      ),
    }),
  });

  return (
    <DocsLayout
      tree={tree}
      {...base}
      // `mode: 'top'` keeps the logo + search in a full-width top bar and drops
      // the tab row beneath it, so the chrome spans the page instead of the
      // notebook default that pins the sidebar to the edge and leaves a gutter.
      nav={{ ...nav, mode: "top" }}
      tabMode="navbar"
      tabs={tabs}
      githubUrl="https://github.com/rybbit-io/rybbit"
      links={[
        {
          type: "custom",
          children: <GithubInfo owner="rybbit-io" repo="rybbit" className="lg:-mx-2" />,
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
