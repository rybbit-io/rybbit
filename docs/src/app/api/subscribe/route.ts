import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

// Email validation schema
const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Rate limiting map (simple in-memory, for production use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Cleanup expired rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, limit] of rateLimitMap.entries()) {
    // Remove entries 10 minutes after their reset time expires
    if (now > limit.resetTime + 600000) {
      rateLimitMap.delete(email);
    }
  }
}, 600000); // Run every 10 minutes

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(email);

  if (!limit) {
    rateLimitMap.set(email, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }

  if (now > limit.resetTime) {
    rateLimitMap.set(email, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Generate unique request ID for debugging
  const requestId = crypto.getRandomValues(new Uint8Array(8)).reduce(
    (acc, val) => acc + val.toString(16).padStart(2, "0"),
    ""
  );

  try {
    // Validate Content-Type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body with zod
    const validatedData = subscribeSchema.parse(body);
    const { email } = validatedData;

    // Check rate limiting
    if (!checkRateLimit(email)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const segmentId = process.env.RESEND_SEGMENT_ID;

    if (!segmentId) {
      console.warn("RESEND_SEGMENT_ID not configured");
      return NextResponse.json(
        { error: "Subscription service not configured" },
        { status: 500 }
      );
    }

    // First, create the contact
    let contactId: string | undefined;
    try {
      // Extract and sanitize firstName from email
      const firstName = email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9._-]/g, "") // Remove special characters
        .substring(0, 50); // Limit length

      const contactResponse = await resend.contacts.create({
        email,
        firstName: firstName || "Subscriber", // Fallback if all chars removed
        unsubscribed: false,
      });

      console.log(`[${requestId}] Contact creation response:`, {
        success: !contactResponse.error,
        hasId: !!contactResponse.data?.id,
      });

      if (contactResponse.error) {
        console.error(`[${requestId}] Could not create contact`);
        return NextResponse.json(
          { error: "Failed to create subscriber" },
          { status: 500 }
        );
      }

      if (contactResponse.data?.id) {
        contactId = contactResponse.data.id;
      }
    } catch (contactError) {
      console.error(`[${requestId}] Error creating contact:`, contactError instanceof Error ? contactError.message : "Unknown error");
      return NextResponse.json(
        { error: "Failed to create subscriber" },
        { status: 500 }
      );
    }

    // Try to add contact to segment
    try {
      const segmentResponse = contactId
        ? await resend.contacts.segments.add({
            contactId,
            segmentId,
          })
        : await resend.contacts.segments.add({
            email,
            segmentId,
          });

      console.log(`[${requestId}] Segment add response:`, {
        success: !segmentResponse.error,
      });

      if (segmentResponse.error) {
        console.error(`[${requestId}] Could not add contact to segment`);
        return NextResponse.json(
          { error: "Failed to add to newsletter" },
          { status: 500 }
        );
      }
    } catch (segmentError) {
      console.error(`[${requestId}] Error adding contact to segment:`, segmentError instanceof Error ? segmentError.message : "Unknown error");
      return NextResponse.json(
        { error: "Failed to add to newsletter" },
        { status: 500 }
      );
    }

    // Log subscription without exposing full email for privacy
    // Mask middle part of email, keeping first char and domain
    const [localPart, domain] = email.split("@");
    const maskedLocal = localPart.length <= 2 
      ? "***" 
      : localPart.charAt(0) + "***" + localPart.charAt(localPart.length - 1);
    const maskedEmail = `${maskedLocal}@${domain}`;
    console.log(`New subscriber added via Resend: ${maskedEmail}`, {
      subscribedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Successfully subscribed to the newsletter",
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid request" },
        { status: 400 }
      );
    }

    console.error(`[${requestId}] Error processing subscription:`, error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
