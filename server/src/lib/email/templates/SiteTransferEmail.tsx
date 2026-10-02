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

interface SiteTransferEmailProps {
  email: string;
  sentBy: string;
  siteDomain: string;
  organizationName: string;
  transferLink: string;
}

export const SiteTransferEmail = ({
  email,
  sentBy,
  siteDomain,
  organizationName,
  transferLink,
}: SiteTransferEmailProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head />
      <Preview>
        {sentBy} wants to hand {siteDomain} over to you on Rybbit
      </Preview>
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
              {sentBy} wants to transfer the analytics for <span className="font-semibold">{siteDomain}</span>
              {organizationName ? ` from ${organizationName}` : ""} to you on Rybbit Analytics.
            </Text>

            <Text className="text-darkText text-base leading-relaxed mb-4">
              Accepting moves the site, with all of its data and settings, into an organization you manage. You'll need
              a Rybbit account with this email address; you can create one from the link.
            </Text>

            <Text className="text-darkText text-base leading-relaxed mb-4">
              <Link href={transferLink} className="text-brand underline">
                Review the transfer
              </Link>
            </Text>

            <Text className="text-mutedText text-sm leading-relaxed">
              This transfer was sent to {email} and expires in 7 days. If you weren't expecting it, you can ignore this
              email.
            </Text>

            <Hr className="border-borderColor my-8" />

            <Text className="text-mutedText text-xs">© {currentYear} Rybbit Analytics</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
