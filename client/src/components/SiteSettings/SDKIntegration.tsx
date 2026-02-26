"use client";
import { useExtracted } from "next-intl";

export function SDKIntegration({
  siteId,
  siteType,
  domain,
}: {
  siteId: string;
  siteType: "app";
  domain: string;
}) {
  const t = useExtracted();
  const host = typeof window !== "undefined" ? window.location.origin : "https://your-rybbit-instance.com";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{t("Flutter SDK")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("Install the Rybbit Flutter SDK to track events from your app.")}
        </p>
      </div>
      <div className="rounded-md bg-neutral-900 p-4 text-sm font-mono text-neutral-100 overflow-x-auto">
        <pre>{`await Rybbit.init(\n  host: '${host}',\n  siteId: '${siteId}',\n);`}</pre>
      </div>
      <div className="text-sm text-muted-foreground">
        <a
          href="https://github.com/nks-hub/rybbit-flutter-sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          {t("View SDK documentation")}
        </a>
      </div>
    </div>
  );
}
