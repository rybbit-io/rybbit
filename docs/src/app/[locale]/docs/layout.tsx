import { DocsLayout } from "fumadocs-ui/layouts/docs";
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
  return (
    <DocsLayout
      tree={source.pageTree[locale]}
      {...baseOptions(locale)}
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
