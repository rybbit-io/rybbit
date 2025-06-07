import { useGetSite, useSiteHasData } from "../../../../api/admin/sites";
import { CodeSnippet } from "../../../../components/CodeSnippet";
import { Alert } from "../../../../components/ui/alert";
import { useStore } from "../../../../lib/store";

export function NoData() {
  const { site } = useStore();
  const { data: siteHasData, isLoading } = useSiteHasData(site);
  const { data: siteMetadata, isLoading: isLoadingSiteMetadata } =
    useGetSite(site);

  if (!siteHasData && !isLoading && !isLoadingSiteMetadata) {
    return (
      <Alert className="mt-4 p-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
            </span>
            <div className="font-medium">
              Waiting for analytics from {siteMetadata?.domains?.[0]}...
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Place this snippet in the &lt;head&gt; of your website:
          </div>
          <CodeSnippet
            language="HTML"
            code={`<script\n    src="${globalThis.location.origin}/api/script.js"\n    data-site-id="${siteMetadata?.siteId}"\n    defer\n></script>`}
            className="text-xs"
          />
          <span className="text-xs text-muted-foreground">
            See our{" "}
            <a
              href="https://rybbit.io/docs/script"
              className="text-blue-500 hover:underline"
            >
              docs
            </a>{" "}
            for more information.
          </span>
        </div>
      </Alert>
    );
  }

  return null;
}
