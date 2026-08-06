import { Mail } from "lucide-react";
import { SiDiscord, SiX } from "@icons-pack/react-simple-icons";
import { useExtracted } from "next-intl";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
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

  const channels = [
    {
      icon: <Mail className="size-5" aria-hidden="true" />,
      label: t("Email"),
      value: "hello@rybbit.com",
      href: "mailto:hello@rybbit.com",
    },
    {
      icon: <SiDiscord className="size-5" aria-hidden="true" />,
      label: t("Discord"),
      value: t("Join our Discord Server"),
      href: "https://discord.gg/DEhGb4hYBj",
      external: true,
    },
    {
      icon: <SiX className="size-5" aria-hidden="true" />,
      label: t("X (Twitter)"),
      value: "@yang_frog",
      href: "https://x.com/yang_frog",
      external: true,
    },
  ];

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        title={t("Contact Us")}
        description={t("Have questions about Rybbit? Reach out through any of these channels:")}
        eventLocation="contact_hero"
        primaryAction={null}
        secondaryAction={null}
        note={null}
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label={t("Contact Us")}>
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 sm:grid-cols-3">
            {channels.map(channel => (
              <a
                key={channel.label}
                href={channel.href}
                {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex flex-col gap-4 bg-white px-5 py-8 transition-colors duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:bg-neutral-950 dark:hover:bg-neutral-900/60 sm:px-8"
              >
                <span className="text-neutral-500 transition-colors duration-200 group-hover:text-emerald-600 dark:text-neutral-400 dark:group-hover:text-emerald-400">
                  {channel.icon}
                </span>
                <span>
                  <span className="block font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                    {channel.label}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">{channel.value}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 md:grid-cols-2">
            <div className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:px-10">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                {t("Customer Support")}
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-neutral-600 dark:text-neutral-400">
                {t("If you are a customer and need help with your account, please contact us at")}{" "}
                <a
                  href="mailto:support@rybbit.com"
                  className="font-medium text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 transition-colors hover:decoration-current dark:text-emerald-400 dark:decoration-emerald-400/30"
                >
                  support@rybbit.com
                </a>
                {". "}
                {t("We try to respond to all support requests within 12 hours.")}
              </p>
            </div>

            <div className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:px-10">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                {t("White-Labeling & Custom Solutions")}
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-neutral-600 dark:text-neutral-400">
                {t(
                  "Looking to white-label Rybbit for your organization or need a custom analytics solution? We offer tailored implementations to meet your specific requirements."
                )}
              </p>
              <p className="mt-4 max-w-md text-base leading-7 text-neutral-600 dark:text-neutral-400">
                {t("Contact us at")}{" "}
                <a
                  href="mailto:partnerships@rybbit.com"
                  className="font-medium text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 transition-colors hover:decoration-current dark:text-emerald-400 dark:decoration-emerald-400/30"
                >
                  partnerships@rybbit.com
                </a>{" "}
                {t("to discuss your needs.")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
