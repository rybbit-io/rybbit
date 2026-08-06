"use client";

import { AlertCircle, Cookie, ExternalLink, Radar, ScanSearch, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

interface ScanResult {
  requestedUrl: string;
  finalUrl: string;
  redirectCount: number;
  scannedAt: string;
  scriptsExamined: number;
  responseCookies: Array<{
    name: string;
    domain?: string;
    path?: string;
    sameSite?: string;
    secure: boolean;
    httpOnly: boolean;
    session: boolean;
  }>;
  trackers: Array<{ name: string; category: string; evidence: string }>;
  limitations: string[];
}

export function CookieTrackerScannerForm() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function scan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      setError("Enter a complete public URL beginning with http:// or https://.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/tools/cookie-tracker-scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await response.json()) as ScanResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "The scan could not be completed.");
      setResult(data);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "The scan could not be completed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={scan} className="space-y-4">
        <div>
          <label htmlFor="scanner-url" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Public page URL
          </label>
          <div className="flex gap-2">
            <input
              id="scanner-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              value={url}
              onChange={event => setUrl(event.target.value)}
              placeholder="https://example.com"
              disabled={isLoading}
              aria-describedby="scanner-url-help"
              className="min-w-0 flex-1 border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-400 dark:disabled:bg-neutral-700"
            >
              <ScanSearch className="size-4" aria-hidden="true" />
              {isLoading ? "Scanning…" : "Scan page"}
            </button>
          </div>
          <p id="scanner-url-help" className="mt-2 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
            We fetch up to 1 MB of the public HTML response. Private networks and non-standard ports are blocked.
          </p>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="border-y border-neutral-200 py-5 dark:border-neutral-800">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">Checking the first page response…</p>
          <div className="mt-4 space-y-3" aria-hidden="true">
            <div className="h-3 w-2/3 animate-pulse bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-1/2 animate-pulse bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6" aria-live="polite">
          <div className="border-y border-neutral-200 py-5 dark:border-neutral-800">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Scan complete</p>
                <a
                  href={result.finalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex max-w-xl items-center gap-1.5 truncate text-sm text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <span className="truncate">{result.finalUrl}</span>
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {result.scriptsExamined} script tags · {result.redirectCount} redirects
              </p>
            </div>
          </div>

          <section aria-labelledby="tracker-results">
            <div className="flex items-center justify-between gap-4">
              <h3
                id="tracker-results"
                className="flex items-center gap-2 font-semibold text-neutral-950 dark:text-neutral-50"
              >
                <Radar className="size-4 text-neutral-500" aria-hidden="true" />
                Recognizable tracker signals
              </h3>
              <span className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
                {result.trackers.length}
              </span>
            </div>
            {result.trackers.length > 0 ? (
              <div className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {result.trackers.map(tracker => (
                  <div
                    key={tracker.name}
                    className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{tracker.name}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                        {tracker.evidence}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{tracker.category}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-start gap-3 border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                  No known tracker signature appeared in the first HTML response. Trackers loaded later by JavaScript
                  may still be present.
                </p>
              </div>
            )}
          </section>

          <section aria-labelledby="cookie-results">
            <div className="flex items-center justify-between gap-4">
              <h3
                id="cookie-results"
                className="flex items-center gap-2 font-semibold text-neutral-950 dark:text-neutral-50"
              >
                <Cookie className="size-4 text-neutral-500" aria-hidden="true" />
                Response cookies
              </h3>
              <span className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
                {result.responseCookies.length}
              </span>
            </div>
            {result.responseCookies.length > 0 ? (
              <div className="mt-3 overflow-x-auto border-y border-neutral-200 dark:border-neutral-800">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Domain / path</th>
                      <th className="px-4 py-2 font-medium">SameSite</th>
                      <th className="py-2 pl-4 text-right font-medium">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {result.responseCookies.map((cookie, index) => (
                      <tr key={`${cookie.name}-${index}`}>
                        <td className="py-3 pr-4 font-mono text-xs text-neutral-900 dark:text-neutral-100">
                          {cookie.name}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                          {cookie.domain || "Current host"}
                          {cookie.path ? ` · ${cookie.path}` : ""}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                          {cookie.sameSite || "Not set"}
                        </td>
                        <td className="py-3 pl-4 text-right text-xs text-neutral-500 dark:text-neutral-400">
                          {[cookie.secure && "Secure", cookie.httpOnly && "HttpOnly", cookie.session && "Session"]
                            .filter(Boolean)
                            .join(" · ") || "None declared"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 border-y border-neutral-200 py-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
                No Set-Cookie header was returned with this HTML response.
              </p>
            )}
          </section>

          <div className="flex items-start gap-3 border border-neutral-200 p-4 dark:border-neutral-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Scope of this scan</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                {result.limitations.map(limitation => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
