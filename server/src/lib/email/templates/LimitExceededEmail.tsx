import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
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
      <Preview>Your organization has exceeded its monthly event limit</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: "#10b981",
                lightBg: "#ffffff",
                cardBg: "#f9fafb",
                darkText: "#111827",
                mutedText: "#6b7280",
                borderColor: "#e5e7eb",
                warningBg: "#dc2626",
              },
            },
          },
        }}
      >
        <Body className="bg-lightBg font-sans">
          <Container className="mx-auto py-10 px-6 max-w-[600px]">
            <Section className="text-center">
              <div className="inline-block bg-warningBg/20 text-warningBg px-3 py-1.5 rounded-full text-sm font-medium mb-4">
                Event Limit Exceeded
              </div>
              <Heading className="text-darkText text-3xl font-semibold mb-6">Monthly Event Limit Reached</Heading>
            </Section>

            <Section className="mb-8">
              <Text className="text-darkText text-base leading-relaxed mb-4">
                Your organization <span className="font-bold text-brand">{organizationName}</span> has exceeded its
                monthly event limit.
              </Text>
              <Text className="text-darkText text-base leading-relaxed mb-4">
                <strong>Current usage:</strong> {eventCount.toLocaleString()} events
                <br />
                <strong>Monthly limit:</strong> {eventLimit.toLocaleString()} events
              </Text>
              <Text className="text-darkText text-base leading-relaxed">
                Your analytics tracking has been paused. To continue tracking events and accessing your analytics data,
                please upgrade your plan.
              </Text>
            </Section>

            <Section className="text-center mb-10">
              <Button
                href={upgradeLink}
                className="bg-brand text-white px-8 py-3 rounded-md font-bold text-base no-underline inline-block"
              >
                Upgrade Your Plan
              </Button>
            </Section>

            <Section className="text-center border-t border-borderColor pt-5">
              <Text className="text-mutedText text-xs mb-2">
                Need help? Contact our support team at support@rybbit.com
              </Text>
              <Text className="text-mutedText text-xs">© {currentYear} Rybbit Analytics</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
