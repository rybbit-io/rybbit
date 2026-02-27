import {
  Body,
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

export type OtpEmailType = "sign-in" | "email-verification" | "forget-password";

interface OtpEmailProps {
  otp: string;
  type: OtpEmailType;
}

const getContent = (type: OtpEmailType) => {
  switch (type) {
    case "sign-in":
      return {
        preview: "Your Rybbit Sign-In Code",
        heading: "Your Sign-In Code",
        description: "Here is your one-time password to sign in to Rybbit:",
      };
    case "email-verification":
      return {
        preview: "Verify Your Email Address",
        heading: "Verify Your Email",
        description: "Here is your verification code for Rybbit:",
      };
    case "forget-password":
      return {
        preview: "Reset Your Password",
        heading: "Reset Your Password",
        description: "You requested to reset your password for Rybbit. Here is your one-time password:",
      };
  }
};

export const OtpEmail = ({ otp, type }: OtpEmailProps) => {
  const currentYear = new Date().getFullYear();
  const content = getContent(type);

  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
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
              },
            },
          },
        }}
      >
        <Body className="bg-lightBg font-sans">
          <Container className="mx-auto py-10 px-6 max-w-[600px]">
            <Section className="text-center">
              <Heading className="text-darkText text-3xl font-semibold mb-6">{content.heading}</Heading>
            </Section>

            <Section className="mb-6">
              <Text className="text-darkText text-base leading-relaxed mb-4">{content.description}</Text>
            </Section>

            <Section className="text-center mb-6">
              <div className="bg-cardBg py-5 px-6 rounded-md inline-block">
                <Text className="text-brand text-3xl font-bold tracking-widest m-0">{otp}</Text>
              </div>
            </Section>

            <Section className="mb-8">
              <Text className="text-mutedText text-sm leading-relaxed">This code will expire in 5 minutes.</Text>
              <Text className="text-mutedText text-sm leading-relaxed">
                If you didn't request this code, you can safely ignore this email.
              </Text>
            </Section>

            <Section className="text-center border-t border-borderColor pt-5">
              <Text className="text-mutedText text-xs">© {currentYear} Rybbit Analytics</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
