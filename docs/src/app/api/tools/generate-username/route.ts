import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  name: z.string().max(100).optional(),
  interests: z.string().max(100).optional(),
  includeNumbers: z.boolean(),
  platform: z.string(),
  characterLimit: z.number().optional(),
  minLength: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 requests per minute
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(
      `username-generator:${ip}`,
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

    if (!validatedData.name && !validatedData.interests) {
      return NextResponse.json(
        { error: "Please provide at least name or interests" },
        { status: 400, headers }
      );
    }

    const nameText = validatedData.name
      ? `Name/Brand: ${validatedData.name}`
      : "";
    const interestsText = validatedData.interests
      ? `Interests/Keywords: ${validatedData.interests}`
      : "";

    const characterLimitText = validatedData.characterLimit
      ? `\n- Maximum ${validatedData.characterLimit} characters`
      : "";
    const minLengthText = validatedData.minLength
      ? `\n- Minimum ${validatedData.minLength} characters`
      : "";
    const numbersText = validatedData.includeNumbers
      ? "\n- Can include numbers strategically"
      : "\n- Avoid excessive numbers";

    // Call OpenRouter to generate usernames
    const prompt = `You are a creative branding expert specializing in ${validatedData.platform} usernames. Generate 5 unique, memorable usernames based on:

${nameText}
${interestsText}

Requirements:${characterLimitText}${minLengthText}${numbersText}
- Must be unique and brandable
- Easy to spell, pronounce, and remember
- Appropriate for ${validatedData.platform}
- Avoid excessive special characters, numbers, or underscores
- Make them creative but not too random or cryptic
- Each username should be distinct and take different creative approaches
- Only use characters allowed on ${validatedData.platform}

Return ONLY a JSON array of username strings (without any @ symbol or prefix) in this exact format:
["username1", "username2", "username3", "username4", "username5"]

Do not include any markdown formatting, explanation, or additional text - just the raw JSON array of strings.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse JSON response
    let usernames;
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      usernames = JSON.parse(jsonMatch[0]);

      // Validate it's an array of strings
      if (
        !Array.isArray(usernames) ||
        !usernames.every((u) => typeof u === "string")
      ) {
        throw new Error("Invalid username format");
      }

      // Filter out usernames that exceed limits if specified
      if (validatedData.characterLimit) {
        usernames = usernames.filter(
          (username) => username.length <= validatedData.characterLimit!
        );
      }

      if (validatedData.minLength) {
        usernames = usernames.filter(
          (username) => username.length >= validatedData.minLength!
        );
      }

      // If we filtered out too many, we might have fewer than 5 usernames
      if (usernames.length === 0) {
        throw new Error(
          "Generated usernames didn't meet requirements. Please try again."
        );
      }
    } catch (error) {
      console.error("Parse error:", error);
      return NextResponse.json(
        { error: "Failed to parse generated usernames. Please try again." },
        { status: 500, headers }
      );
    }

    return NextResponse.json({ usernames }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    console.error("Username generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate usernames. Please try again." },
      { status: 500 }
    );
  }
}
