import Link from "next/link";
import { Mail, Github, Bell, Twitter } from "lucide-react";
import { useExtracted } from "next-intl";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Contact",
  description: "Get in touch with the Rybbit team",
  openGraph: {
    images: [createOGImageUrl("Contact", "Get in touch with the Rybbit team")],
  },
  twitter: {
    images: [createOGImageUrl("Contact", "Get in touch with the Rybbit team")],
  },
});

export default function Contact() {
  const t = useExtracted();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">{t("Contact Us")}</h1>

      <div className="bg-neutral-100/50 dark:bg-neutral-800/20 border border-neutral-300/50 dark:border-neutral-700/50 rounded-xl p-6 md:p-8 mb-8">
        <p className="text-lg mb-6 text-neutral-700 dark:text-neutral-300">
          {t("Have questions about Rybbit? We're here to help! Reach out to us through any of these channels:")}
        </p>

        <div className="space-y-6">
          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="bg-neutral-200 dark:bg-neutral-800 p-3 rounded-lg">
              <Mail className="w-6 h-6 text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-1">{t("Email")}</h2>
              <a href="mailto:hello@rybbit.com" className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors">
                hello@rybbit.com
              </a>
            </div>
          </div>

          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="bg-neutral-200 dark:bg-neutral-800 p-3 rounded-lg">
              <Bell className="w-6 h-6 text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-1">{t("Discord")}</h2>
              <a
                href="https://discord.gg/DEhGb4hYBj"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {t("Join our Discord Server")}
              </a>
            </div>
          </div>

          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="bg-neutral-200 dark:bg-neutral-800 p-3 rounded-lg">
              <Twitter className="w-6 h-6 text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-1">{t("X (Twitter)")}</h2>
              <a
                href="https://x.com/yang_frog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                @yang_frog
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-100/30 dark:bg-neutral-800/30 border border-neutral-300/50 dark:border-neutral-700/50 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-medium mb-3">{t("Customer Support")}</h2>
        <p className="mb-4 text-neutral-700 dark:text-neutral-300">
          {t("If you are a customer and need help with your account, please contact us at")}{" "}
          <a href="mailto:support@rybbit.com" className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors underline">
            support@rybbit.com
          </a>
          {". "}
          {t("We try to respond to all support requests within 12 hours.")}
        </p>
      </div>
      <div className="bg-neutral-100/30 dark:bg-neutral-800/30 border border-neutral-300/50 dark:border-neutral-700/50 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-medium mb-3">{t("White-Labeling & Custom Solutions")}</h2>
        <p className="mb-4 text-neutral-700 dark:text-neutral-300">
          {t("Looking to white-label Rybbit for your organization or need a custom analytics solution? We offer tailored implementations to meet your specific requirements.")}
        </p>
        <p className="mb-4 text-neutral-700 dark:text-neutral-300">
          {t("Contact us at")}{" "}
          <a
            href="mailto:partnerships@rybbit.com"
            className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors underline"
          >
            partnerships@rybbit.com
          </a>{" "}
          {t("to discuss your needs.")}
        </p>
      </div>
    </div>
  );
}
