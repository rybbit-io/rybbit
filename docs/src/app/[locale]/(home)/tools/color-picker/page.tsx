import type { Metadata } from "next";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { ColorPickerForm } from "./ColorPickerForm";

export const metadata: Metadata = {
  title: "Free Color Picker and Contrast Checker | Rybbit",
  description:
    "Pick a color and convert HEX to RGB and HSL instantly. Copy values, compare foreground and background contrast, and check WCAG 2.2 text readability free.",
  openGraph: {
    title: "Free Color Picker and Contrast Checker",
    description: "Convert HEX, RGB, and HSL colors and check WCAG text contrast.",
    type: "website",
    url: "https://rybbit.com/tools/color-picker",
    siteName: "Rybbit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Color Picker and Contrast Checker",
    description: "Convert HEX, RGB, and HSL colors and check WCAG text contrast.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/color-picker",
  },
};

const faqData = [
  {
    question: "How do I convert a HEX color to RGB or HSL?",
    answer:
      "Enter a 3- or 6-digit HEX value or use the native color control. The picker converts the selected foreground color to RGB and HSL immediately, and each format can be copied separately.",
  },
  {
    question: "What is a contrast ratio?",
    answer:
      "A contrast ratio compares the relative luminance of a foreground and background color. Ratios range from 1:1 for identical luminance to 21:1 for black and white.",
  },
  {
    question: "What contrast ratio does WCAG require for text?",
    answer:
      "WCAG 2.2 Level AA requires at least 4.5:1 for normal text and 3:1 for large text. Level AAA requires 7:1 for normal text and 4.5:1 for large text.",
  },
  {
    question: "Does a passing contrast ratio guarantee accessible color use?",
    answer:
      "No. Contrast is one requirement. Interfaces should also avoid using color as the only way to communicate meaning and should preserve visible focus, readable sizing, and clear interaction states.",
  },
  {
    question: "Why can the same color look different on two screens?",
    answer:
      "Displays, color profiles, brightness, ambient light, and browser rendering can all affect perception. Use numeric values for consistency, then test important color pairs on representative devices and in both light and dark themes.",
  },
  {
    question: "Are colors entered here saved or uploaded?",
    answer:
      "No. Conversion and contrast calculations happen locally in your browser. The tool does not need to upload or store the colors you enter.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Color Picker and Contrast Checker",
      description: "Pick colors, convert HEX to RGB and HSL, and check WCAG text contrast.",
      url: "https://rybbit.com/tools/color-picker",
      applicationCategory: "DesignApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqData.map(item => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

const educationalContent = (
  <>
    <h2>Move between HEX, RGB, and HSL</h2>
    <p>
      HEX and RGB describe the red, green, and blue channels used by screens. HSL expresses the same color as hue,
      saturation, and lightness, which can be easier to adjust systematically. The formats describe color differently
      but can resolve to the same visible output.
    </p>

    <h2>Check text contrast before shipping</h2>
    <p>
      Contrast compares the relative luminance of the text and its background. Under WCAG 2.2, Level AA calls for a
      ratio of at least 4.5:1 for normal text and 3:1 for large text. Level AAA calls for 7:1 and 4.5:1 respectively.
      Treat thresholds as a starting check, then review the real interface at its final size and weight.
    </p>

    <h2>Color should not carry meaning alone</h2>
    <p>
      Pair status colors with labels, icons, patterns, or position so the message remains clear for people with color
      vision differences. Test hover, focus, active, disabled, error, and success states in both light and dark themes;
      the resting component alone is not enough.
    </p>
  </>
);

export default function ColorPickerPage() {
  return (
    <ToolPageLayout
      toolSlug="color-picker"
      title="Color Picker and Contrast Checker"
      description="Pick a color, copy its HEX, RGB, or HSL value, and verify foreground and background text contrast against WCAG 2.2 thresholds."
      badge="Free Tool"
      toolComponent={<ColorPickerForm />}
      educationalContent={educationalContent}
      faqs={faqData}
      relatedToolsCategory="seo"
      ctaTitle="Build analytics your team can read"
      ctaDescription="Rybbit keeps website data clear, focused, and accessible across light and dark themes."
      ctaEventLocation="color_picker_cta"
      structuredData={structuredData}
    />
  );
}
