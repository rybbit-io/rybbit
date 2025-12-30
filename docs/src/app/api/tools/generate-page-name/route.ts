import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  topic: z.string().min(3).max(500),
  keywords: z.string().max(100).optional(),
  length: z.enum(["short", "medium", "long"]),
  platform: z.string(),
  pageType: z.string(),
  characterLimit: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 requests per minute
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(
      `page-name-generator:${ip}`,
      5,
      60 * 1000
    );

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

    const keywordsText = validatedData.keywords
      ? `\nPreferred keywords: ${validatedData.keywords}`
      : "";

    const lengthGuidance = {
      short: "1-2 words, concise and punchy",
      medium: "2-4 words, balanced and memorable",
      long: "4-6 words, descriptive and detailed",
    };

    const characterLimitText = validatedData.characterLimit
      ? `\nIMPORTANT: Names MUST be under ${validatedData.characterLimit} characters.`
      : "";

    // Call OpenRouter to generate names
    const prompt = `You are a creative branding expert specializing in ${validatedData.platform}. Generate 5 unique, memorable ${validatedData.pageType} names for the following topic:

Topic: ${validatedData.topic}${keywordsText}

Requirements:
- Length: ${lengthGuidance[validatedData.length]}${characterLimitText}
- Make them creative, memorable, and appropriate for ${validatedData.platform}
- Ensure they're unique and not generic
- Make them easy to spell and pronounce
- Each name should be distinct and approach the topic from different angles
- Avoid special characters unless common for ${validatedData.platform}
- Make them searchable and brandable

Return ONLY a JSON array of name strings in this exact format:
["Name 1", "Name 2", "Name 3", "Name 4", "Name 5"]

Do not include any markdown formatting, explanation, or additional text - just the raw JSON array of strings.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse JSON response
    let names;
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      names = JSON.parse(jsonMatch[0]);

      // Validate it's an array of strings
      if (!Array.isArray(names) || !names.every((n) => typeof n === "string")) {
        throw new Error("Invalid name format");
      }

      // Filter out names that exceed character limit if specified
      if (validatedData.characterLimit) {
        names = names.filter((name) => name.length <= validatedData.characterLimit!);

        // If we filtered out too many, we might have fewer than 5 names
        if (names.length === 0) {
          throw new Error("Generated names exceeded character limit. Please try again.");
        }
      }
    } catch (error) {
      console.error("Parse error:", error);
      return NextResponse.json(
        { error: "Failed to parse generated names. Please try again." },
        { status: 500, headers }
      );
    }

    return NextResponse.json({ names }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    console.error("Page name generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate names. Please try again." },
      { status: 500 }
    );
  }
}
