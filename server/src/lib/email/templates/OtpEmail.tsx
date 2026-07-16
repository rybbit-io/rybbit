import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
  pixelBasedPreset,
} from "@react-email/components";
import * as React from "react";

export type OtpEmailType = "sign-in" | "email-verification" | "forget-password" | "change-email";

interface OtpEmailProps {
  otp: string;
  type: OtpEmailType;
}

const getContent = (type: OtpEmailType) => {
  switch (type) {
    case "sign-in":
      return {
        preview: "Your Rybbit sign-in code",
        description: "Here is your one-time password to sign in to Rybbit:",
      };
    case "email-verification":
      return {
        preview: "Verify your email address",
        description: "Here is your verification code for Rybbit:",
      };
    case "forget-password":
      return {
        preview: "Reset your password",
        description: "You requested to reset your password for Rybbit. Here is your one-time password:",
      };
    case "change-email":
      return {
        preview: "Change your email address",
        description: "Here is your verification code for Rybbit:",
      };
  }
};

export const OtpEmail = ({ otp, type }: OtpEmailProps) => {
  const currentYear = new Date().getFullYear();
  const content = getContent(type);

  return (
    <Html>
      <Head />
      <Preview>{content?.preview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: "#10b981",
                cardBg: "#f9fafb",
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

            <Text className="text-darkText text-base leading-relaxed mb-4">{content?.description}</Text>

            <Section className="text-center mb-6">
              <div className="bg-cardBg py-5 px-6 rounded-md inline-block">
                <Text className="text-brand text-3xl font-bold tracking-widest m-0">{otp}</Text>
              </div>
            </Section>

            <Text className="text-mutedText text-sm leading-relaxed mb-2">This code will expire in 5 minutes.</Text>
            <Text className="text-mutedText text-sm leading-relaxed">
              If you didn't request this code, you can safely ignore this email.
            </Text>

            <Hr className="border-borderColor my-8" />

            <Text className="text-mutedText text-xs">© {currentYear} Rybbit Analytics</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
