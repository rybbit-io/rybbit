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

interface LimitExceededEmailProps {
  organizationName: string;
  eventCount: number;
  eventLimit: number;
  upgradeLink: string;
}

export const LimitExceededEmail = ({
  organizationName,
  eventCount,
  eventLimit,
  upgradeLink,
}: LimitExceededEmailProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head />
      <Preview>{organizationName} has exceeded its monthly event limit</Preview>
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

            <Text className="text-darkText text-base leading-relaxed mb-4">Hi there,</Text>

            <Text className="text-darkText text-base leading-relaxed mb-4">
              Your organization <span className="font-semibold">{organizationName}</span> has exceeded its monthly event
              limit.
            </Text>

            <Text className="text-darkText text-base leading-relaxed mb-4">
              Current usage: <span className="font-semibold">{eventCount.toLocaleString()}</span> events
              <br />
              Monthly limit: <span className="font-semibold">{eventLimit.toLocaleString()}</span> events
            </Text>

            <Text className="text-darkText text-base leading-relaxed mb-4">
              Analytics tracking has been paused. To resume tracking and access your data, upgrade your plan:
            </Text>

            <Text className="text-darkText text-base leading-relaxed mb-4">
              <Link href={upgradeLink} className="text-brand underline">
                Upgrade your plan
              </Link>
            </Text>

            <Text className="text-mutedText text-sm leading-relaxed">
              Need help? Reply to this email or contact support@rybbit.com.
            </Text>

            <Hr className="border-borderColor my-8" />

            <Text className="text-mutedText text-xs">© {currentYear} Rybbit Analytics</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
