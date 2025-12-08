import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  originalContent: z.string().min(1).max(5000),
  tone: z.enum([
    "friendly",
    "professional",
    "humorous",
    "supportive",
    "inquisitive",
    "critical",
  ]),
  length: z.enum(["short", "medium", "long"]),
  platform: z.string(),
});

const lengthTargets = {
  short: 100,
  medium: 250,
  long: 500,
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 requests per minute
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(
      `comment-generator:${ip}`,
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

    const targetLength = lengthTargets[validatedData.length];

    // Call OpenRouter to generate comments
    const prompt = `You are a social media expert helping create authentic, engaging comments for ${validatedData.platform}.

Original content to comment on:
${validatedData.originalContent}

Generate 3 diverse comments with the following requirements:
- Tone: ${validatedData.tone}
- Target length: ~${targetLength} characters (be flexible, but stay reasonably close)
- Make each comment unique and approach the content from different angles
- Sound natural and authentic, not robotic or generic
- Be contextually relevant to the original content
- Match the culture and style of ${validatedData.platform}
- Don't use hashtags unless they're genuinely relevant and natural
- Avoid emojis unless the ${validatedData.tone} tone naturally calls for them

Return ONLY a JSON array of comment strings in this exact format:
["comment 1 text here", "comment 2 text here", "comment 3 text here"]

Do not include any markdown formatting, explanation, or additional text - just the raw JSON array of strings.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse JSON response
    let comments;
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      comments = JSON.parse(jsonMatch[0]);

      // Validate it's an array of strings
      if (
        !Array.isArray(comments) ||
        !comments.every((c) => typeof c === "string")
      ) {
        throw new Error("Invalid comment format");
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to parse generated comments. Please try again." },
        { status: 500, headers }
      );
    }

    return NextResponse.json({ comments }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    console.error("Comment generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate comments. Please try again." },
      { status: 500 }
    );
  }
}
