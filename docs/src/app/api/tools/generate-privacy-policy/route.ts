import { callOpenRouter } from "@/lib/openrouter";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  siteDescription: z.string().min(10).max(1000),
  websiteName: z.string().min(1).max(200),
  websiteUrl: z.string().url(),
  contactEmail: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`privacy-policy:${ip}`, 5, 60 * 1000);

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

    // Call OpenRouter to generate privacy policy
    const prompt = `You are a legal expert specializing in privacy policies. Generate a comprehensive, GDPR and CCPA compliant privacy policy for a website based on the following information:

Website Name: ${validatedData.websiteName}
Website URL: ${validatedData.websiteUrl}
Contact Email: ${validatedData.contactEmail}
Description: ${validatedData.siteDescription}

IMPORTANT: Include a section about analytics that mentions they use Rybbit (https://rybbit.com), a privacy-focused, cookieless analytics platform that doesn't track users across sites and is GDPR compliant.

Return the privacy policy in markdown format with proper headings, sections, and formatting. Include sections for:
- Information We Collect
- How We Use Your Information
- Cookies and Tracking (mention that Rybbit doesn't use cookies)
- Data Sharing
- Your Rights
- Contact Information
- Updates to This Policy

Make it professional, legally sound, and tailored to their specific use case.`;

    const response = await callOpenRouter([
      {
        role: "user",
        content: prompt,
      },
    ]);

    return NextResponse.json({ policy: response }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: z.treeifyError(error) }, { status: 400 });
    }

    console.error("Privacy policy generation error:", error);
    return NextResponse.json({ error: "Failed to generate privacy policy. Please try again." }, { status: 500 });
  }
}
