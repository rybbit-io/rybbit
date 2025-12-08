import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  topic: z.string().min(3).max(1000),
  style: z.string(),
  additionalContext: z.string().max(500).optional(),
  platform: z.string(),
  characterLimit: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 requests per minute
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(
      `post-generator:${ip}`,
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

    const additionalContextText = validatedData.additionalContext
      ? `\n\nAdditional context: ${validatedData.additionalContext}`
      : "";

    const characterLimitText = validatedData.characterLimit
      ? `\nIMPORTANT: Posts MUST be under ${validatedData.characterLimit} characters.`
      : "";

    // Call OpenRouter to generate posts
    const prompt = `You are a social media expert specializing in ${validatedData.platform}. Generate 3 unique, engaging posts for the following topic:

Topic: ${validatedData.topic}
Style: ${validatedData.style}${additionalContextText}

Requirements:${characterLimitText}
- Write in the ${validatedData.style} style
- Make each post unique and approach the topic from different angles
- Ensure posts are platform-appropriate for ${validatedData.platform}
- Make them engaging and likely to drive interaction
- Use natural language that doesn't sound AI-generated
- Include hooks, questions, or calls-to-action where appropriate
- Each post should be complete and ready to publish

Return ONLY a JSON array of post strings in this exact format:
["Post 1 text here", "Post 2 text here", "Post 3 text here"]

Do not include any markdown formatting, explanation, or additional text - just the raw JSON array of strings.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse JSON response
    let posts;
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      posts = JSON.parse(jsonMatch[0]);

      // Validate it's an array of strings
      if (!Array.isArray(posts) || !posts.every((p) => typeof p === "string")) {
        throw new Error("Invalid post format");
      }

      // Filter out posts that exceed character limit if specified
      if (validatedData.characterLimit) {
        posts = posts.filter(
          (post) => post.length <= validatedData.characterLimit!
        );

        // If we filtered out too many, we might have fewer than 3 posts
        if (posts.length === 0) {
          throw new Error(
            "Generated posts exceeded character limit. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Parse error:", error);
      return NextResponse.json(
        { error: "Failed to parse generated posts. Please try again." },
        { status: 500, headers }
      );
    }

    return NextResponse.json({ posts }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    console.error("Post generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate posts. Please try again." },
      { status: 500 }
    );
  }
}
