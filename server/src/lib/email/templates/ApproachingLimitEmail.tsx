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

interface ApproachingLimitEmailProps {
  organizationName: string;
  eventCount: number;
  eventLimit: number;
  upgradeLink: string;
}

export const ApproachingLimitEmail = ({
  organizationName,
  eventCount,
  eventLimit,
  upgradeLink,
}: ApproachingLimitEmailProps) => {
  const currentYear = new Date().getFullYear();
  const usagePercent = Math.min(100, Math.round((eventCount / eventLimit) * 100));

  return (
    <Html>
      <Head />
      <Preview>{organizationName} is approaching its monthly event limit</Preview>
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
              Your organization <span className="font-semibold">{organizationName}</span> is on track to exceed its
              monthly event limit before the end of the month.
            </Text>

            <Text className="text-darkText text-base leading-relaxed mb-4">
              Current usage: <span className="font-semibold">{eventCount.toLocaleString()}</span> events ({usagePercent}
              %)
              <br />
              Monthly limit: <span className="font-semibold">{eventLimit.toLocaleString()}</span> events
            </Text>

            <Text className="text-darkText text-base leading-relaxed mb-4">
              Once you reach your limit, analytics tracking will be paused until your plan resets or you upgrade.
              Upgrading now keeps your data flowing without interruption.
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
