import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { source } from "@/lib/source";
import { GithubInfo } from "fumadocs-ui/components/github-info";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions}
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
