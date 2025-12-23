import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  topic: z.string().min(3).max(500),
  keywords: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`meta-desc:${ip}`, 10, 60 * 1000);

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

    const keywordsText = validatedData.keywords ? `\nTarget keywords: ${validatedData.keywords}` : "";

    // Call OpenRouter to generate meta descriptions
    const prompt = `You are an SEO expert. Generate 5 optimized meta descriptions for a webpage about the following topic:

Topic: ${validatedData.topic}${keywordsText}

Requirements:
- Each description should be 150-160 characters long (optimal for search engines)
- Include the primary keyword naturally
- Make them compelling with a clear call-to-action
- Vary the approach (e.g., benefit-focused, problem-solution, feature highlight, social proof, urgency)
- Accurately summarize the page content

Return ONLY a JSON array of description objects in this exact format:
[
  {
    "description": "The meta description text here",
    "length": 156,
    "approach": "Benefit-focused"
  }
]

Do not include any markdown formatting or explanation, just the raw JSON array.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse JSON response
    let descriptions;
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      descriptions = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse generated descriptions. Please try again." },
        { status: 500, headers }
      );
    }

    return NextResponse.json({ descriptions }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: z.treeifyError(error) }, { status: 400 });
    }

    console.error("Meta description generation error:", error);
    return NextResponse.json({ error: "Failed to generate meta descriptions. Please try again." }, { status: 500 });
  }
}
