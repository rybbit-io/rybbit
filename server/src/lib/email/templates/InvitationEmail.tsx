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

interface InvitationEmailProps {
  email: string;
  invitedBy: string;
  organizationName: string;
  inviteLink: string;
}

export const InvitationEmail = ({ email, invitedBy, organizationName, inviteLink }: InvitationEmailProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head />
      <Preview>You're Invited to Join {organizationName} on Rybbit</Preview>
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
              <div className="inline-block bg-brand/10 text-brand px-3 py-1.5 rounded-full text-sm font-medium mb-4">
                New Invitation
              </div>
              <Heading className="text-darkText text-3xl font-semibold mb-6">You've Been Invited!</Heading>
            </Section>

            <Section className="mb-8">
              <Text className="text-darkText text-base leading-relaxed mb-4">
                {invitedBy} has invited you to join <span className="font-bold text-brand">{organizationName}</span> on
                Rybbit Analytics.
              </Text>
              <Text className="text-darkText text-base leading-relaxed">
                Rybbit is an open-source analytics platform that helps you understand your website traffic while
                respecting user privacy.
              </Text>
            </Section>

            <Section className="text-center mb-10">
              <Button
                href={inviteLink}
                className="bg-brand text-white px-8 py-3 rounded-md font-bold text-base no-underline inline-block"
              >
                Accept Invitation
              </Button>
            </Section>

            <Section className="text-center border-t border-borderColor pt-5">
              <Text className="text-mutedText text-xs mb-2">
                This invitation was sent to <span className="text-brand">{email}</span>.
              </Text>
              <Text className="text-mutedText text-xs">© {currentYear} Rybbit Analytics</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
