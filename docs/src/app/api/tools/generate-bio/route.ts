import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  name: z.string().max(100).optional(),
  profession: z.string().max(100).optional(),
  interests: z.string().max(200).optional(),
  tone: z.string(),
  platform: z.string(),
  characterLimit: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 requests per minute
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(
      `bio-generator:${ip}`,
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

    if (!validatedData.name && !validatedData.profession) {
      return NextResponse.json(
        { error: "Please provide at least name or profession" },
        { status: 400, headers }
      );
    }

    const nameText = validatedData.name
      ? `Name/Brand: ${validatedData.name}`
      : "";
    const professionText = validatedData.profession
      ? `Profession/Role: ${validatedData.profession}`
      : "";
    const interestsText = validatedData.interests
      ? `Interests/Focus: ${validatedData.interests}`
      : "";

    // Call OpenRouter to generate bios
    const prompt = `You are a professional bio writer specializing in ${validatedData.platform} profiles. Generate 3 unique, compelling bios based on:

${nameText}
${professionText}
${interestsText}

Requirements:
- Maximum ${validatedData.characterLimit} characters per bio
- Tone: ${validatedData.tone}
- Optimized for ${validatedData.platform}
- Each bio should be distinct and take different creative approaches
- Make them engaging, authentic, and memorable
- Avoid clichés and generic phrases
- Focus on value proposition and personality
- Use appropriate style for ${validatedData.platform}'s culture

Return ONLY a JSON array of 3 bio strings in this exact format:
["bio1", "bio2", "bio3"]

Do not include any markdown formatting, explanation, or additional text - just the raw JSON array of strings.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse JSON response
    let bios;
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      bios = JSON.parse(jsonMatch[0]);

      // Validate it's an array of strings
      if (
        !Array.isArray(bios) ||
        !bios.every((b) => typeof b === "string")
      ) {
        throw new Error("Invalid bio format");
      }

      // Filter out bios that exceed the character limit
      bios = bios.filter(
        (bio) => bio.length <= validatedData.characterLimit
      );

      // If we filtered out too many, we might have fewer than 3 bios
      if (bios.length === 0) {
        throw new Error(
          "Generated bios exceeded character limit. Please try again."
        );
      }
    } catch (error) {
      console.error("Parse error:", error);
      return NextResponse.json(
        { error: "Failed to parse generated bios. Please try again." },
        { status: 500, headers }
      );
    }

    return NextResponse.json({ bios }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    console.error("Bio generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate bios. Please try again." },
      { status: 500 }
    );
  }
}
