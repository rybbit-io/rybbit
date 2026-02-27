import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Text,
  Tailwind,
  pixelBasedPreset,
} from "@react-email/components";
import * as React from "react";

interface ReengagementEmailProps {
  userName: string;
  day: number;
  title: string;
  message: string;
  ctaText: string;
  siteId: number;
  domain: string;
  unsubscribeUrl: string;
}

const DOCS_URL = "https://www.rybbit.io/docs";

export const ReengagementEmail = ({
  userName,
  day,
  title,
  message,
  ctaText,
  siteId,
  domain,
  unsubscribeUrl,
}: ReengagementEmailProps) => {
  const greeting = userName ? `Hi ${userName}` : "Hi there";
  const dashboardUrl = `https://app.rybbit.io/${siteId}`;
  const messageWithDomain = message.replace("{domain}", domain);

  // Split message into paragraphs
  const paragraphs = messageWithDomain.split("\n\n").filter(p => p.trim());

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: "#10b981",
                darkText: "#111827",
                mutedText: "#6b7280",
                borderColor: "#e5e7eb",
              },
            },
          },
        }}
      >
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-8 px-6 max-w-[600px]">
            <Img
              src="https://app.rybbit.io/rybbit/horizontal_black.svg"
              alt="Rybbit"
              width="120"
              height="28"
              className="mb-8"
            />

            <Text className="text-darkText text-base leading-relaxed mb-4">{greeting},</Text>

            {paragraphs.map((paragraph, index) => (
              <Text key={index} className="text-darkText text-base leading-relaxed mb-4">
                {paragraph}
              </Text>
            ))}

            <Text className="text-darkText text-base leading-relaxed mb-4">
              <Link href={dashboardUrl} className="text-brand underline">
                {ctaText}
              </Link>
            </Text>

            <Text className="text-mutedText text-sm leading-relaxed mb-4">
              Need help?{" "}
              <Link href={DOCS_URL} className="text-mutedText underline">
                View our setup guide
              </Link>
            </Text>

            <Text className="text-darkText text-base leading-relaxed mt-8">
              You can reply to this email,
              <br />
              Bill – Founder of Rybbit
            </Text>

            <Hr className="border-borderColor my-8" />

            <Text className="text-mutedText text-xs">
              <Link href={unsubscribeUrl} className="text-mutedText underline">
                Unsubscribe
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
