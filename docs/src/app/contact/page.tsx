import Link from "next/link";
import { Mail, Github, Bell, Twitter } from "lucide-react";

export const metadata = {
  title: "Contact",
  description: "Get in touch with the Rybbit team",
};

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Contact Us</h1>

      <div className="bg-neutral-800/20 border border-neutral-700/50 rounded-xl p-6 md:p-8 mb-8">
        <p className="text-lg mb-6">
          Have questions about Rybbit? We&apos;re here to help! Reach out to us through any of these channels:
        </p>

        <div className="space-y-6">
          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="bg-neutral-800 p-3 rounded-lg">
              <Mail className="w-6 h-6 text-neutral-300" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-1">Email</h2>
              <a href="https://www.rybbit.io/contact" className="text-neutral-300 hover:text-white transition-colors">
                hello@rybbit.io
              </a>
            </div>
          </div>

          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="bg-neutral-800 p-3 rounded-lg">
              <Github className="w-6 h-6 text-neutral-300" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-1">GitHub</h2>
              <a
                href="https://github.com/rybbit-io/rybbit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-white transition-colors"
              >
                github.com/rybbit-io/rybbit
              </a>
            </div>
          </div>

          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="bg-neutral-800 p-3 rounded-lg">
              <Bell className="w-6 h-6 text-neutral-300" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-1">Discord</h2>
              <a
                href="https://discord.gg/DEhGb4hYBj"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-white transition-colors"
              >
                Join our Discord Server
              </a>
            </div>
          </div>

          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="bg-neutral-800 p-3 rounded-lg">
              <Twitter className="w-6 h-6 text-neutral-300" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-1">X (Twitter)</h2>
              <a
                href="https://x.com/yang_frog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-white transition-colors"
              >
                @yang_frog
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-medium mb-3">White-Labeling & Custom Solutions</h2>
        <p className="mb-4">
          Looking to white-label Rybbit for your organization or need a custom analytics solution? We offer tailored
          implementations to meet your specific requirements.
        </p>
        <p className="mb-4">
          Contact us at{" "}
          <a href="mailto:hello@rybbit.io" className="text-neutral-300 hover:text-white transition-colors underline">
            hello@rybbit.io
          </a>{" "}
          to discuss your needs.
        </p>
      </div>

      <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-xl p-6">
        <h2 className="text-xl font-medium mb-3">Open Source Contributions</h2>
        <p className="mb-4">
          Rybbit is an open-source project. If you&apos;d like to contribute, report issues, or suggest features, please
          visit our GitHub repository.
        </p>
        <Link href="https://github.com/rybbit-io/rybbit" target="_blank" rel="noopener noreferrer">
          <button className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-5 py-2 rounded-lg border border-neutral-700 transform hover:-translate-y-0.5 transition-all duration-200 hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:ring-opacity-50 cursor-pointer">
            Visit GitHub Repository
          </button>
        </Link>
      </div>
    </div>
  );
}
