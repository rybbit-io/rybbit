import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  topic: z.string().max(500),
  strategy: z.string(),
  keywords: z.string().max(200).optional(),
  platform: z.string(),
  maxHashtags: z.number().optional(),
  characterLimit: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 requests per minute
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(
      `hashtag-generator:${ip}`,
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
      ? `\nNiche/Keywords: ${validatedData.keywords}`
      : "";

    const maxHashtagsText = validatedData.maxHashtags
      ? `\n- Platform limit: Maximum ${validatedData.maxHashtags} hashtags`
      : "";
    const characterLimitText = validatedData.characterLimit
      ? `\n- Total character limit for all hashtags: ${validatedData.characterLimit} characters`
      : "";

    // Call OpenRouter to generate hashtags
    const prompt = `You are a social media hashtag expert specializing in ${validatedData.platform}. Generate 3 unique sets of hashtags based on:

Topic/Content: ${validatedData.topic}${keywordsText}
Strategy: ${validatedData.strategy}

Requirements:${maxHashtagsText}${characterLimitText}
- All hashtags must start with # symbol
- Hashtags should be relevant, trending-aware, and strategic
- Mix popular and niche hashtags for maximum reach and engagement
- Use proper capitalization for readability (e.g., #SocialMedia not #socialmedia)
- Avoid banned or spam-associated hashtags
- Each set should take a slightly different strategic approach to the topic
- Optimize for ${validatedData.platform} best practices
- Ensure hashtags are appropriate for the platform's audience and culture

Return ONLY a JSON array of 3 hashtag set strings in this exact format:
["#Hashtag1 #Hashtag2 #Hashtag3", "#Hashtag4 #Hashtag5 #Hashtag6", "#Hashtag7 #Hashtag8 #Hashtag9"]

Each string should be a complete set of hashtags separated by spaces. Do not include any markdown formatting, explanation, or additional text - just the raw JSON array of 3 strings.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse JSON response
    let hashtags: string[];
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      hashtags = JSON.parse(jsonMatch[0]);

      // Validate it's an array of strings
      if (
        !Array.isArray(hashtags) ||
        !hashtags.every((h) => typeof h === "string")
      ) {
        throw new Error("Invalid hashtag format");
      }

      // Filter out hashtag sets that exceed limits if specified
      if (validatedData.maxHashtags) {
        hashtags = hashtags.filter((hashtagSet) => {
          const count = hashtagSet.split(/\s+/).filter(Boolean).length;
          return count <= validatedData.maxHashtags!;
        });
      }

      if (validatedData.characterLimit) {
        hashtags = hashtags.filter(
          (hashtagSet) => hashtagSet.length <= validatedData.characterLimit!
        );
      }

      // If we filtered out too many, we might have fewer than 3 sets
      if (hashtags.length === 0) {
        throw new Error(
          "Generated hashtags didn't meet platform requirements. Please try again."
        );
      }
    } catch (error) {
      console.error("Parse error:", error);
      return NextResponse.json(
        { error: "Failed to parse generated hashtags. Please try again." },
        { status: 500, headers }
      );
    }

    return NextResponse.json({ hashtags }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    console.error("Hashtag generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate hashtags. Please try again." },
      { status: 500 }
    );
  }
}
