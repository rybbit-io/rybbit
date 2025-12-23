import { callOpenRouterImage } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  brandName: z.string().min(1).max(100),
  industry: z.string().max(100).optional(),
  style: z.string(),
  colors: z.string().max(100).optional(),
  platform: z.string(),
});

const DESIGN_STYLES: Record<string, string> = {
  minimalist: "minimalist with clean lines, simple shapes, and limited colors",
  modern: "modern, contemporary, sleek, and tech-forward",
  playful: "playful, fun, colorful, and friendly",
  professional: "professional, corporate, trustworthy, and established",
  vintage: "vintage, retro, classic, and nostalgic",
  abstract: "abstract, artistic, with unique shapes and forms",
  geometric: "geometric with structured shapes and patterns",
  "hand-drawn": "hand-drawn, organic, personal, and artisanal",
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 3 requests per minute (image generation is expensive)
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`logo-generator:${ip}`, 3, 60 * 1000);

    const headers = new Headers({
      "X-RateLimit-Limit": rateLimitResult.limit.toString(),
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    const styleDescription =
      DESIGN_STYLES[validatedData.style.toLowerCase()] ||
      validatedData.style;

    const colorInstruction = validatedData.colors
      ? `Use these colors: ${validatedData.colors}`
      : "Use appropriate colors that fit the brand and industry";

    const industryContext = validatedData.industry
      ? `in the ${validatedData.industry} industry`
      : "";

    // Build prompt for logo generation
    const prompt = `Create a professional brand logo for "${validatedData.brandName}" ${industryContext}.

Design Style: ${styleDescription}

${colorInstruction}

Requirements:
- Create a clean, professional logo design
- The logo should be suitable for use as a ${validatedData.platform} profile picture or brand icon
- Make it memorable and recognizable
- Keep the design simple enough to work at small sizes
- Do not include any text or letters in the logo - focus on an iconic symbol/mark only
- The logo should work well on both light and dark backgrounds
- Output a square image with the logo centered

Generate only the logo image, no explanations or text.`;

    // Call OpenRouter with Gemini image model
    const imageUrl = await callOpenRouterImage(prompt);

    return NextResponse.json({ imageUrl }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    console.error("Logo generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate logo. Please try again." },
      { status: 500 }
    );
  }
}
