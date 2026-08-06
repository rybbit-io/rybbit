"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type EngagementMethod = "followers" | "reach" | "impressions";

const platforms = ["Instagram", "TikTok", "YouTube", "LinkedIn", "X", "Facebook", "Other"] as const;

const methodLabels: Record<EngagementMethod, { label: string; denominator: string; help: string }> = {
  followers: {
    label: "By followers",
    denominator: "Followers",
    help: "Useful for comparing account-level engagement over time.",
  },
  reach: {
    label: "By reach",
    denominator: "People reached",
    help: "Measures interactions among unique people who saw the content.",
  },
  impressions: {
    label: "By impressions",
    denominator: "Impressions",
    help: "Measures interactions across every recorded content view.",
  },
};

const interactionFields = [
  { key: "likes", label: "Likes or reactions" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares or reposts" },
  { key: "saves", label: "Saves" },
  { key: "clicks", label: "Clicks" },
] as const;

type InteractionKey = (typeof interactionFields)[number]["key"];
type InteractionValues = Record<InteractionKey, string>;

const emptyInteractions: InteractionValues = {
  likes: "",
  comments: "",
  shares: "",
  saves: "",
  clicks: "",
};

const inputClass =
  "w-full border border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-400";

export function EngagementRateForm() {
  const [platform, setPlatform] = useState<(typeof platforms)[number]>("Instagram");
  const [method, setMethod] = useState<EngagementMethod>("followers");
  const [denominator, setDenominator] = useState("");
  const [interactions, setInteractions] = useState<InteractionValues>(emptyInteractions);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculation = useMemo(() => {
    const audience = Number(denominator);
    const values = Object.values(interactions).map(value => (value === "" ? 0 : Number(value)));

    if (!Number.isFinite(audience) || audience <= 0 || values.some(value => !Number.isFinite(value) || value < 0)) {
      return null;
    }

    const totalInteractions = values.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(totalInteractions)) return null;
    const rate = (totalInteractions / audience) * 100;
    const perThousand = (totalInteractions / audience) * 1000;
    if (!Number.isFinite(rate) || !Number.isFinite(perThousand)) return null;

    return {
      totalInteractions,
      rate,
      perThousand,
    };
  }, [denominator, interactions]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!denominator || Number(denominator) <= 0) {
      setError(`Enter a ${methodLabels[method].denominator.toLowerCase()} value greater than zero.`);
      setHasCalculated(false);
      return;
    }

    if (Object.values(interactions).some(value => value !== "" && Number(value) < 0)) {
      setError("Interaction counts cannot be negative.");
      setHasCalculated(false);
      return;
    }

    if (!calculation) {
      setError("Check the values and try again.");
      setHasCalculated(false);
      return;
    }

    setError(null);
    setHasCalculated(true);
  };

  const updateInteraction = (key: InteractionKey, value: string) => {
    setInteractions(current => ({ ...current, [key]: value }));
    setError(null);
  };

  const clearForm = () => {
    setPlatform("Instagram");
    setMethod("followers");
    setDenominator("");
    setInteractions(emptyInteractions);
    setHasCalculated(false);
    setError(null);
  };

  const result = hasCalculated ? calculation : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="engagement-platform"
            className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white"
          >
            Platform
          </label>
          <select
            id="engagement-platform"
            value={platform}
            onChange={event => setPlatform(event.target.value as (typeof platforms)[number])}
            className={inputClass}
          >
            {platforms.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="engagement-method"
            className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white"
          >
            Calculation method
          </label>
          <select
            id="engagement-method"
            value={method}
            onChange={event => {
              setMethod(event.target.value as EngagementMethod);
              setDenominator("");
              setHasCalculated(false);
              setError(null);
            }}
            className={inputClass}
          >
            {(Object.keys(methodLabels) as EngagementMethod[]).map(key => (
              <option key={key} value={key}>
                {methodLabels[key].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="engagement-denominator"
          className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white"
        >
          {methodLabels[method].denominator}
        </label>
        <input
          id="engagement-denominator"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={denominator}
          onChange={event => {
            setDenominator(event.target.value);
            setError(null);
          }}
          placeholder="10000"
          className={inputClass}
          aria-describedby="engagement-denominator-help"
          aria-invalid={Boolean(error && (!denominator || Number(denominator) <= 0))}
        />
        <p id="engagement-denominator-help" className="mt-1.5 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
          {methodLabels[method].help}
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-neutral-900 dark:text-white">Interactions</legend>
        <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
          Add the actions your {platform} report includes. Leave any unavailable fields blank.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {interactionFields.map(field => (
            <div key={field.key}>
              <label
                htmlFor={`engagement-${field.key}`}
                className="mb-2 block text-sm text-neutral-700 dark:text-neutral-300"
              >
                {field.label}
              </label>
              <input
                id={`engagement-${field.key}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={interactions[field.key]}
                onChange={event => updateInteraction(field.key, event.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </fieldset>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {result && (
        <section
          aria-live="polite"
          aria-label="Engagement rate result"
          className="border-y border-neutral-200 py-5 dark:border-neutral-800"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{platform} engagement rate</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-neutral-950 dark:text-white">
                {result.rate.toFixed(2)}%
              </p>
            </div>
            <p className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {result.perThousand.toFixed(1)} interactions per 1,000
            </p>
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-2">
            <div className="bg-white p-3 dark:bg-neutral-900">
              <dt className="text-xs text-neutral-600 dark:text-neutral-400">Total interactions</dt>
              <dd className="mt-1 font-semibold tabular-nums text-neutral-950 dark:text-white">
                {result.totalInteractions.toLocaleString()}
              </dd>
            </div>
            <div className="bg-white p-3 dark:bg-neutral-900">
              <dt className="text-xs text-neutral-600 dark:text-neutral-400">Compared with</dt>
              <dd className="mt-1 font-semibold tabular-nums text-neutral-950 dark:text-white">
                {Number(denominator).toLocaleString()} {methodLabels[method].denominator.toLowerCase()}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <div className="flex gap-4 pt-1">
        <button type="submit" className="flex-1 bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-500">
          Calculate engagement
        </button>
        <button
          type="button"
          onClick={clearForm}
          className="border border-neutral-300 bg-white px-5 py-2.5 font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
