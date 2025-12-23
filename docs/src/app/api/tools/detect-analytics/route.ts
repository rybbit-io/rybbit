import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`analytics-detect:${ip}`, 5, 60 * 1000);

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

    // Fetch the website HTML
    let html: string;
    try {
      const response = await fetch(validatedData.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RybbitBot/1.0; +https://rybbit.com)",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status}`);
      }

      html = await response.text();
    } catch (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch website. Please check the URL and try again." },
        { status: 400, headers }
      );
    }

    // Extract script tags and common analytics patterns
    const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    const scripts = scriptMatches.slice(0, 20).join("\n"); // Limit to first 20 scripts

    // Call OpenRouter to analyze
    const prompt = `You are an expert in web analytics and tracking technologies. Analyze the following HTML snippets from a website and identify all analytics and tracking platforms being used.

Website URL: ${validatedData.url}

HTML Scripts (first 20):
${scripts}

Identify:
1. All analytics platforms (Google Analytics, Mixpanel, Amplitude, Plausible, Rybbit, etc.)
2. Tag managers (Google Tag Manager, Segment, etc.)
3. Heatmap tools (Hotjar, Crazy Egg, etc.)
4. Session replay tools
5. Any other tracking technologies

For each platform found, provide:
- Platform name
- What it's used for (analytics, marketing, etc.)
- Privacy implications (cookies used, data collected)
- Detected version/identifier if available

Return your analysis in JSON format:
{
  "platforms": [
    {
      "name": "Platform Name",
      "category": "Analytics/Tag Manager/Heatmap/etc",
      "privacy": "Brief privacy assessment",
      "identifier": "ID or version if found"
    }
  ],
  "summary": "Brief overall summary of tracking on this site",
  "privacyScore": "Low/Medium/High (based on tracking intensity)"
}

If no analytics platforms are detected, say so clearly.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Try to parse JSON response
    let result;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
      result = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return the raw response
      result = {
        platforms: [],
        summary: response,
        privacyScore: "Unknown",
      };
    }

    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: z.treeifyError(error) }, { status: 400 });
    }

    console.error("Analytics detection error:", error);
    return NextResponse.json({ error: "Failed to detect analytics platforms. Please try again." }, { status: 500 });
  }
}
