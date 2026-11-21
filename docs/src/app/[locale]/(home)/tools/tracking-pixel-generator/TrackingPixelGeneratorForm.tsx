"use client";

import { AlertCircle, Check, Clipboard, Code2, EyeOff, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

interface Parameter {
  id: number;
  name: string;
  value: string;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function buildPixelUrl(endpoint: string, parameters: Parameter[], includeCacheBuster: boolean) {
  try {
    const url = new URL(endpoint.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;

    for (const parameter of parameters) {
      if (parameter.name.trim()) url.searchParams.set(parameter.name.trim(), parameter.value);
    }
    if (includeCacheBuster) url.searchParams.set("cb", "RYBBIT_CACHE_BUSTER");
    return url.toString().replace(/([?&]cb=)RYBBIT_CACHE_BUSTER(?=&|$)/, "$1{{timestamp}}");
  } catch {
    return null;
  }
}

export function TrackingPixelGeneratorForm() {
  const [endpoint, setEndpoint] = useState("");
  const [parameters, setParameters] = useState<Parameter[]>([{ id: 1, name: "event", value: "pageview" }]);
  const [includeCacheBuster, setIncludeCacheBuster] = useState(true);
  const [referrerPolicy, setReferrerPolicy] = useState("strict-origin-when-cross-origin");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const pixelUrl = useMemo(
    () => buildPixelUrl(endpoint, parameters, includeCacheBuster),
    [endpoint, includeCacheBuster, parameters]
  );
  const invalidParameter = parameters.some(
    parameter => parameter.name.trim() && !/^[A-Za-z0-9_.-]+$/.test(parameter.name.trim())
  );
  const snippet =
    pixelUrl && !invalidParameter
      ? `<!-- Render only after any applicable analytics consent. -->\n<img\n  src="${escapeHtml(pixelUrl)}"\n  width="1"\n  height="1"\n  alt=""\n  referrerpolicy="${referrerPolicy}"\n/>`
      : "";

  function updateParameter(id: number, field: "name" | "value", value: string) {
    setParameters(current =>
      current.map(parameter => (parameter.id === id ? { ...parameter, [field]: value } : parameter))
    );
    setCopied(false);
    setCopyError("");
  }

  function addParameter() {
    setParameters(current => [
      ...current,
      { id: Math.max(0, ...current.map(parameter => parameter.id)) + 1, name: "", value: "" },
    ]);
    setCopied(false);
    setCopyError("");
  }

  function removeParameter(id: number) {
    setParameters(current => current.filter(parameter => parameter.id !== id));
    setCopied(false);
    setCopyError("");
  }

  async function copySnippet() {
    if (!snippet) return;
    setCopyError("");
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyError("Could not copy automatically. Select the snippet and copy it manually.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="pixel-endpoint" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
          Pixel endpoint URL
        </label>
        <input
          id="pixel-endpoint"
          type="url"
          inputMode="url"
          value={endpoint}
          onChange={event => {
            setEndpoint(event.target.value);
            setCopied(false);
            setCopyError("");
          }}
          placeholder="https://analytics.example.com/pixel.gif"
          maxLength={2048}
          aria-describedby="pixel-endpoint-help"
          className="w-full border border-neutral-300 bg-white font-mono text-sm text-neutral-900 placeholder:font-sans placeholder:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-400"
        />
        <p id="pixel-endpoint-help" className="mt-2 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
          Use an endpoint you control or are authorized to call. Existing query parameters are preserved.
        </p>
      </div>

      <fieldset>
        <div className="mb-2 flex items-center justify-between gap-3">
          <legend className="text-sm font-medium text-neutral-900 dark:text-white">URL parameters</legend>
          <button
            type="button"
            onClick={addParameter}
            className="inline-flex min-h-8 items-center gap-1.5 border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add parameter
          </button>
        </div>
        <div className="space-y-2">
          {parameters.map((parameter, index) => (
            <div key={parameter.id} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] gap-2">
              <label className="sr-only" htmlFor={`parameter-name-${parameter.id}`}>
                Parameter {index + 1} name
              </label>
              <input
                id={`parameter-name-${parameter.id}`}
                value={parameter.name}
                onChange={event => updateParameter(parameter.id, "name", event.target.value)}
                placeholder="Parameter name"
                maxLength={64}
                className="min-w-0 border border-neutral-300 bg-white font-mono text-sm text-neutral-900 placeholder:font-sans placeholder:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-400"
              />
              <label className="sr-only" htmlFor={`parameter-value-${parameter.id}`}>
                Parameter {index + 1} value
              </label>
              <input
                id={`parameter-value-${parameter.id}`}
                value={parameter.value}
                onChange={event => updateParameter(parameter.id, "value", event.target.value)}
                placeholder="Value"
                maxLength={256}
                className="min-w-0 border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => removeParameter(parameter.id)}
                disabled={parameters.length === 1}
                aria-label={`Remove parameter ${index + 1}`}
                className="inline-flex aspect-square items-center justify-center border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {invalidParameter && (
          <p role="alert" className="mt-2 flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            Parameter names may contain letters, numbers, dots, underscores, and hyphens.
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-3 border border-neutral-200 p-3 dark:border-neutral-800">
          <input
            type="checkbox"
            checked={includeCacheBuster}
            onChange={event => {
              setIncludeCacheBuster(event.target.checked);
              setCopied(false);
              setCopyError("");
            }}
            className="mt-0.5 size-4 accent-emerald-600"
          />
          <span>
            <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Cache-buster placeholder
            </span>
            <span className="mt-1 block text-xs leading-5 text-neutral-600 dark:text-neutral-400">
              Adds <code>{"cb={{timestamp}}"}</code>. Replace it at render time with a unique value.
            </span>
          </span>
        </label>
        <div>
          <label htmlFor="referrer-policy" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Referrer policy
          </label>
          <select
            id="referrer-policy"
            value={referrerPolicy}
            onChange={event => {
              setReferrerPolicy(event.target.value);
              setCopied(false);
              setCopyError("");
            }}
            className="w-full border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            <option value="strict-origin-when-cross-origin">Origin on cross-site requests</option>
            <option value="no-referrer">Send no referrer</option>
            <option value="same-origin">Referrer for same origin only</option>
            <option value="origin">Send origin only</option>
          </select>
        </div>
      </div>

      {!endpoint.trim() ? (
        <div className="flex items-start gap-3 border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <Code2 className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden="true" />
          <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            Enter an endpoint to generate the HTML snippet and request preview.
          </p>
        </div>
      ) : !pixelUrl ? (
        <div
          role="alert"
          className="flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Enter a valid HTTP or HTTPS endpoint without embedded credentials.
        </div>
      ) : invalidParameter ? null : (
        <div className="space-y-5">
          <section aria-labelledby="request-preview-heading">
            <div className="flex items-center justify-between gap-3">
              <h3 id="request-preview-heading" className="font-semibold text-neutral-950 dark:text-neutral-50">
                Request preview
              </h3>
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <EyeOff className="size-3.5" aria-hidden="true" />
                No request sent
              </span>
            </div>
            <div className="mt-3 overflow-x-auto border-y border-neutral-200 py-3 dark:border-neutral-800">
              <code className="whitespace-nowrap text-xs text-neutral-700 dark:text-neutral-300">GET {pixelUrl}</code>
            </div>
          </section>

          <section aria-labelledby="pixel-code-heading">
            <div className="flex items-center justify-between gap-3">
              <h3 id="pixel-code-heading" className="font-semibold text-neutral-950 dark:text-neutral-50">
                HTML snippet
              </h3>
              <button
                type="button"
                onClick={copySnippet}
                disabled={!snippet}
                className="inline-flex min-h-8 items-center gap-1.5 border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Clipboard className="size-3.5" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto border border-neutral-200 bg-neutral-950 p-4 text-xs leading-5 text-neutral-100 dark:border-neutral-800">
              <code>{snippet}</code>
            </pre>
            <p className="sr-only" role="status" aria-live="polite">
              {copied ? "HTML snippet copied." : ""}
            </p>
            {copyError && (
              <p className="mt-2 text-xs text-red-700 dark:text-red-400" role="alert">
                {copyError}
              </p>
            )}
          </section>

          <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <p className="text-xs leading-5 text-amber-950 dark:text-amber-100">
              A pixel request can disclose the visitor&apos;s IP address, user agent, referrer, and URL parameters to
              its endpoint. Document the purpose, minimize parameters, and render it only after any consent your use
              case requires.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
