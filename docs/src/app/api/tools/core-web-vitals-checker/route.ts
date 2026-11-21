import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { PublicUrlError, validatePublicHttpUrl } from "../_lib/public-url";

export const runtime = "nodejs";

type Rating = "good" | "needs-improvement" | "poor";

interface CruxMetric {
  percentile?: number;
  category?: "FAST" | "AVERAGE" | "SLOW" | "NONE";
}

interface AuditResult {
  title?: string;
  displayValue?: string;
  numericValue?: number;
  score?: number | null;
  details?: { overallSavingsMs?: number };
}

interface PageSpeedResponse {
  analysisUTCTimestamp?: string;
  loadingExperience?: { id?: string; metrics?: Record<string, CruxMetric> };
  originLoadingExperience?: { id?: string; metrics?: Record<string, CruxMetric> };
  lighthouseResult?: {
    finalUrl?: string;
    fetchTime?: string;
    lighthouseVersion?: string;
    runWarnings?: unknown[];
    runtimeError?: { message?: string };
    categories?: { performance?: { score?: number | null } };
    audits?: Record<string, AuditResult>;
  };
  error?: { message?: string; code?: number };
}

const requestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
});

const thresholds = {
  lcp: { good: 2500, poor: 4000 },
  inp: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
} as const;

function rateMetric(value: number, metric: keyof typeof thresholds): Rating {
  if (value <= thresholds[metric].good) return "good";
  if (value <= thresholds[metric].poor) return "needs-improvement";
  return "poor";
}

function fieldMetric(
  metrics: Record<string, CruxMetric>,
  apiKey: string,
  key: keyof typeof thresholds,
  label: string,
  unit: "ms" | "score",
  divisor = 1
) {
  const metric = metrics[apiKey];
  if (typeof metric?.percentile !== "number") return null;
  const value = metric.percentile / divisor;
  return { key, label, value, unit, rating: rateMetric(value, key) };
}

function labMetric(
  audits: Record<string, AuditResult>,
  auditKey: string,
  key: string,
  label: string,
  unit: "ms" | "score",
  thresholdKey?: keyof typeof thresholds
) {
  const audit = audits[auditKey];
  if (typeof audit?.numericValue !== "number") return null;
  const rating: Rating = thresholdKey
    ? rateMetric(audit.numericValue, thresholdKey)
    : typeof audit.score === "number" && audit.score >= 0.9
      ? "good"
      : typeof audit.score === "number" && audit.score >= 0.5
        ? "needs-improvement"
        : "poor";

  return { key, label, value: audit.numericValue, unit, rating, displayValue: audit.displayValue };
}

export async function POST(request: NextRequest) {
  const rate = rateLimit(`core-web-vitals:${getClientIP(request)}`, 6, 5 * 60_000);
  const headers = new Headers({
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": new Date(rate.reset).toISOString(),
  });

  if (!rate.success) {
    return NextResponse.json(
      { error: "PageSpeed's public service is rate limited. Please wait a few minutes and try again." },
      { status: 429, headers }
    );
  }

  try {
    const input = requestSchema.parse(await request.json());
    const { url } = await validatePublicHttpUrl(input.url);
    const query = new URLSearchParams({
      url: url.toString(),
      strategy: input.strategy,
      category: "performance",
      locale: "en",
    });
    if (process.env.PAGESPEED_API_KEY) query.set("key", process.env.PAGESPEED_API_KEY);

    const pageSpeedResponse = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${query}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(60_000),
    });
    const pageSpeed = (await pageSpeedResponse.json()) as PageSpeedResponse;

    if (!pageSpeedResponse.ok) {
      const isRateLimited = pageSpeedResponse.status === 429 || pageSpeed.error?.code === 429;
      return NextResponse.json(
        {
          error: isRateLimited
            ? "PageSpeed Insights is temporarily rate limited. Wait a moment, then run the check again."
            : "PageSpeed Insights could not analyze that public URL. Confirm the page is reachable and try again.",
        },
        { status: isRateLimited ? 429 : 400, headers }
      );
    }

    const lighthouse = pageSpeed.lighthouseResult;
    if (!lighthouse || lighthouse.runtimeError?.message) {
      return NextResponse.json(
        { error: "Lighthouse could not complete this run. The page may block automated performance tests." },
        { status: 400, headers }
      );
    }

    const pageField = pageSpeed.loadingExperience?.metrics || {};
    const originField = pageSpeed.originLoadingExperience?.metrics || {};
    const selectedField = Object.keys(pageField).length > 0 ? pageField : originField;
    const fieldScope =
      Object.keys(pageField).length > 0 ? "url" : Object.keys(originField).length > 0 ? "origin" : null;
    const fieldMetrics = [
      fieldMetric(selectedField, "LARGEST_CONTENTFUL_PAINT_MS", "lcp", "Largest Contentful Paint", "ms"),
      fieldMetric(selectedField, "INTERACTION_TO_NEXT_PAINT", "inp", "Interaction to Next Paint", "ms"),
      fieldMetric(selectedField, "CUMULATIVE_LAYOUT_SHIFT_SCORE", "cls", "Cumulative Layout Shift", "score", 100),
      fieldMetric(selectedField, "FIRST_CONTENTFUL_PAINT_MS", "fcp", "First Contentful Paint", "ms"),
      fieldMetric(selectedField, "EXPERIMENTAL_TIME_TO_FIRST_BYTE", "ttfb", "Time to First Byte", "ms"),
    ].filter(metric => metric !== null);

    const audits = lighthouse.audits || {};
    const labMetrics = [
      labMetric(audits, "largest-contentful-paint", "lcp", "Largest Contentful Paint", "ms", "lcp"),
      labMetric(audits, "cumulative-layout-shift", "cls", "Cumulative Layout Shift", "score", "cls"),
      labMetric(audits, "first-contentful-paint", "fcp", "First Contentful Paint", "ms", "fcp"),
      labMetric(audits, "total-blocking-time", "tbt", "Total Blocking Time", "ms"),
      labMetric(audits, "server-response-time", "ttfb", "Initial Server Response", "ms", "ttfb"),
    ].filter(metric => metric !== null);

    const coreFieldMetrics = fieldMetrics.filter(metric => ["lcp", "inp", "cls"].includes(metric.key));
    const fieldAssessment =
      coreFieldMetrics.length === 3
        ? coreFieldMetrics.every(metric => metric.rating === "good")
          ? "passed"
          : "failed"
        : "unavailable";

    const opportunities = Object.entries(audits)
      .map(([id, audit]) => ({
        id,
        title: audit.title || id,
        displayValue: audit.displayValue,
        savingsMs: audit.details?.overallSavingsMs || 0,
      }))
      .filter(audit => audit.savingsMs > 0)
      .sort((a, b) => b.savingsMs - a.savingsMs)
      .slice(0, 5);

    return NextResponse.json(
      {
        finalUrl: lighthouse.finalUrl || url.toString(),
        strategy: input.strategy,
        analyzedAt: pageSpeed.analysisUTCTimestamp || lighthouse.fetchTime || new Date().toISOString(),
        lighthouseVersion: lighthouse.lighthouseVersion,
        performanceScore:
          typeof lighthouse.categories?.performance?.score === "number"
            ? Math.round(lighthouse.categories.performance.score * 100)
            : null,
        field: {
          scope: fieldScope,
          id: fieldScope === "url" ? pageSpeed.loadingExperience?.id : pageSpeed.originLoadingExperience?.id,
          assessment: fieldAssessment,
          metrics: fieldMetrics,
        },
        lab: { metrics: labMetrics, opportunities },
        warnings: (lighthouse.runWarnings || [])
          .filter((warning): warning is string => typeof warning === "string")
          .slice(0, 5),
      },
      { headers }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid public URL and test strategy." }, { status: 400, headers });
    }
    if (error instanceof PublicUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers });
    }
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return NextResponse.json(
        { error: "PageSpeed Insights took too long to respond. Please try again." },
        { status: 504, headers }
      );
    }

    console.error("Core Web Vitals check failed:", error);
    return NextResponse.json({ error: "The performance check could not be completed." }, { status: 500, headers });
  }
}
