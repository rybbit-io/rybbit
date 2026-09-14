import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { fetchPublicText, PublicUrlError } from "../_lib/public-url";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

const trackerSignatures = [
  {
    name: "Google Tag Manager",
    category: "Tag manager",
    pattern: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i,
    signal: "googletagmanager.com or a GTM container ID",
  },
  {
    name: "Google Analytics",
    category: "Analytics",
    pattern: /google-analytics\.com|googletagmanager\.com\/gtag\/js|gtag\s*\(|\b(?:G|UA)-[A-Z0-9-]+/i,
    signal: "Google Analytics script or measurement ID",
  },
  {
    name: "Meta Pixel",
    category: "Advertising",
    pattern: /connect\.facebook\.net|facebook\.com\/tr|fbq\s*\(/i,
    signal: "Meta Pixel script or fbq call",
  },
  {
    name: "TikTok Pixel",
    category: "Advertising",
    pattern: /analytics\.tiktok\.com|ttq\.(?:load|page|track)/i,
    signal: "TikTok analytics script or ttq call",
  },
  {
    name: "LinkedIn Insight Tag",
    category: "Advertising",
    pattern: /snap\.licdn\.com|_linkedin_partner_id/i,
    signal: "LinkedIn Insight script or partner ID",
  },
  {
    name: "X Pixel",
    category: "Advertising",
    pattern: /static\.ads-twitter\.com|analytics\.twitter\.com|twq\s*\(/i,
    signal: "X Ads script or twq call",
  },
  {
    name: "Microsoft Clarity",
    category: "Session analytics",
    pattern: /clarity\.ms|clarity\s*\(/i,
    signal: "Microsoft Clarity script or initialization",
  },
  {
    name: "Hotjar",
    category: "Session analytics",
    pattern: /static\.hotjar\.com|script\.hotjar\.com|hj\s*\(/i,
    signal: "Hotjar script or hj call",
  },
  {
    name: "FullStory",
    category: "Session replay",
    pattern: /fullstory\.com|fullstory\.com\/s\/fs\.js|FS\.identify/i,
    signal: "FullStory script or API call",
  },
  {
    name: "Segment",
    category: "Customer data",
    pattern: /cdn\.segment\.com|analytics\.load\s*\(/i,
    signal: "Segment CDN script or analytics.load call",
  },
  {
    name: "Mixpanel",
    category: "Product analytics",
    pattern: /cdn\.mxpnl\.com|mixpanel\.init\s*\(/i,
    signal: "Mixpanel CDN script or initialization",
  },
  {
    name: "Amplitude",
    category: "Product analytics",
    pattern: /cdn\.amplitude\.com|amplitude\.init\s*\(/i,
    signal: "Amplitude CDN script or initialization",
  },
  {
    name: "Heap",
    category: "Product analytics",
    pattern: /cdn\.heapanalytics\.com|heap\.load\s*\(/i,
    signal: "Heap script or initialization",
  },
  {
    name: "HubSpot",
    category: "Marketing",
    pattern: /js\.hs-scripts\.com|js\.hs-analytics\.net|_hsq/i,
    signal: "HubSpot tracking script or queue",
  },
  {
    name: "Adobe Analytics",
    category: "Analytics",
    pattern: /adobedtm\.com|omtrdc\.net|AppMeasurement\.js/i,
    signal: "Adobe tag or analytics script",
  },
  {
    name: "Matomo",
    category: "Analytics",
    pattern: /matomo\.js|piwik\.js|_paq\s*\./i,
    signal: "Matomo script or tracking queue",
  },
  {
    name: "Plausible",
    category: "Privacy analytics",
    pattern: /plausible\.io\/js\/|plausible\s*\(/i,
    signal: "Plausible script or event call",
  },
  {
    name: "Fathom",
    category: "Privacy analytics",
    pattern: /cdn\.usefathom\.com|fathom\.track/i,
    signal: "Fathom script or event call",
  },
  {
    name: "Rybbit",
    category: "Privacy analytics",
    pattern: /app\.rybbit\.io\/api\/script\.js|rybbit\.com\/api\/script\.js/i,
    signal: "Rybbit analytics script",
  },
] as const;

function parseSetCookie(value: string) {
  const parts = value.split(";").map(part => part.trim());
  const [nameValue, ...attributes] = parts;
  const separator = nameValue.indexOf("=");
  const name = separator > 0 ? nameValue.slice(0, separator) : nameValue;
  const attributeMap = new Map(
    attributes.map(attribute => {
      const index = attribute.indexOf("=");
      return [
        (index >= 0 ? attribute.slice(0, index) : attribute).toLowerCase(),
        index >= 0 ? attribute.slice(index + 1) : true,
      ] as const;
    })
  );

  return {
    name: name.slice(0, 128),
    domain: typeof attributeMap.get("domain") === "string" ? attributeMap.get("domain") : undefined,
    path: typeof attributeMap.get("path") === "string" ? attributeMap.get("path") : undefined,
    sameSite: typeof attributeMap.get("samesite") === "string" ? attributeMap.get("samesite") : undefined,
    secure: attributeMap.has("secure"),
    httpOnly: attributeMap.has("httponly"),
    session: !attributeMap.has("expires") && !attributeMap.has("max-age"),
  };
}

export async function POST(request: NextRequest) {
  const rate = rateLimit(`cookie-tracker-scanner:${getClientIP(request)}`, 8, 60_000);
  const headers = new Headers({
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": new Date(rate.reset).toISOString(),
  });

  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many scans. Please wait a minute and try again." },
      { status: 429, headers }
    );
  }

  try {
    const body = requestSchema.parse(await request.json());
    const response = await fetchPublicText(body.url, { maxBytes: 1_000_000, timeoutMs: 10_000 });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return NextResponse.json(
        { error: `The website returned HTTP ${response.statusCode}, so its page source could not be scanned.` },
        { status: 400, headers }
      );
    }

    const contentType = String(response.headers["content-type"] || "").toLowerCase();
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return NextResponse.json(
        { error: "That URL did not return an HTML page. Try the public page URL instead of a file or API endpoint." },
        { status: 400, headers }
      );
    }

    const trackers = trackerSignatures
      .filter(({ pattern }) => pattern.test(response.body))
      .map(({ name, category, signal }) => ({ name, category, evidence: `Matched ${signal}.` }));
    const setCookie = response.headers["set-cookie"] || [];
    const cookies = (Array.isArray(setCookie) ? setCookie : [setCookie]).slice(0, 50).map(parseSetCookie);
    const scriptCount = (response.body.match(/<script\b/gi) || []).length;

    return NextResponse.json(
      {
        requestedUrl: body.url,
        finalUrl: response.finalUrl,
        redirectCount: response.redirectCount,
        scannedAt: new Date().toISOString(),
        scriptsExamined: scriptCount,
        responseCookies: cookies,
        trackers,
        limitations: [
          "This scan examines the first HTML response and Set-Cookie headers only.",
          "It does not run JavaScript, accept consent prompts, or crawl additional pages.",
          "A missing match does not prove that a site is tracker-free.",
        ],
      },
      { headers }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid website URL." }, { status: 400, headers });
    }
    if (error instanceof PublicUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers });
    }

    console.error("Cookie and tracker scan failed:", error);
    return NextResponse.json({ error: "The scan could not be completed. Please try again." }, { status: 500, headers });
  }
}
