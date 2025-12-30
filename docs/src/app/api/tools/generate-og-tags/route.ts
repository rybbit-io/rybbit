import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  pageTitle: z.string().min(3).max(200),
  pageDescription: z.string().min(10).max(500),
  pageType: z.enum(["website", "article", "product", "blog"]),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`og-tags:${ip}`, 10, 60 * 1000);

    const headers = new Headers({
      "X-RateLimit-Limit": rateLimitResult.limit.toString(),
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
    });

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429, headers });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // Call OpenRouter to generate OG tags
    const prompt = `You are a social media and SEO expert. Generate optimized Open Graph tags for a webpage with the following details:

Page Title: ${validatedData.pageTitle}
Page Description: ${validatedData.pageDescription}
Page Type: ${validatedData.pageType}

Generate 3 variations of Open Graph tags optimized for social media sharing (Facebook, Twitter, LinkedIn). For each variation:
- og:title: Compelling title for social shares (may differ from page title, 60-90 chars)
- og:description: Engaging description (150-200 chars)
- og:type: ${validatedData.pageType}
- og:image suggestion: Describe what kind of image would work best
- twitter:card: Appropriate card type (summary, summary_large_image, etc.)

Return ONLY a JSON array in this exact format:
[
  {
    "variation": "Professional",
    "ogTitle": "Title here",
    "ogDescription": "Description here",
    "ogType": "${validatedData.pageType}",
    "ogImageSuggestion": "Description of ideal image",
    "twitterCard": "summary_large_image",
    "htmlCode": "<meta property=\\"og:title\\" content=\\"...\\">\\n<meta property=\\"og:description\\" content=\\"...\\">\\n..."
  }
]

Include complete HTML meta tags in the htmlCode field. Do not include any markdown formatting or explanation.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse JSON response
    let variations;
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      variations = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse generated OG tags. Please try again." },
        { status: 500, headers }
      );
    }

    return NextResponse.json({ variations }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: z.treeifyError(error) }, { status: 400 });
    }

    console.error("OG tags generation error:", error);
    return NextResponse.json({ error: "Failed to generate OG tags. Please try again." }, { status: 500 });
  }
}
