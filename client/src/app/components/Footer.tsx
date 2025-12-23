import Image from "next/image";
import Link from "next/link";
import { IS_CLOUD } from "../../lib/const";
import { useWhiteLabel } from "../../hooks/useIsWhiteLabel";
import { HeartIcon } from "lucide-react";

export function Footer() {
  const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;
  const { isWhiteLabel } = useWhiteLabel();
  if (isWhiteLabel) {
    return null;
  }

  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-850 bg-neutral-50 dark:bg-neutral-900 mt-8">
      <div className="max-w-[1100px] mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Image src="/rybbit-text.svg" alt="Rybbit" width={120} height={27} className="dark:invert-0 invert" />
            {!IS_CLOUD && (
              <div className="space-y-3">
                <div className="text-sm text-neutral-600 dark:text-neutral-200">
                  Liking Rybbit? Consider sponsoring the project!
                </div>
                <a
                  href="https://github.com/sponsors/goldflag"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 rounded-lg transition-colors text-sm"
                >
                  <HeartIcon className="w-5 h-5 text-red-500" strokeWidth={3} />
                  Sponsor us
                </a>
              </div>
            )}
            {/* Social Media Links */}
            <div className="flex gap-4">
              <a
                href="https://github.com/rybbit-io/rybbit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://discord.gg/DEhGb4hYBj"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                aria-label="Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a
                href="https://x.com/yang_frog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://rybbit.com/docs"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://rybbit.com/features"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/rybbit-io/rybbit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/DEhGb4hYBj"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Community
                </a>
              </li>
              <li>
                <a
                  href="https://rybbit.com/docs/api/getting-started"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  API Reference
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://rybbit.com/privacy"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://rybbit.com/terms-and-conditions"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Terms and Conditions
                </a>
              </li>
              <li>
                <a
                  href="https://rybbit.com/security"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Security
                </a>
              </li>
              <li>
                <a
                  href="https://rybbit.com/dpa"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  DPA
                </a>
              </li>
              {IS_CLOUD && (
                <li>
                  <a
                    href="mailto:hello@rybbit.com"
                    className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                  >
                    Support
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
              <span>© {new Date().getFullYear()} Rybbit. All rights reserved.</span>
              <Link
                href={`https://github.com/rybbit-io/rybbit/releases/tag/v${APP_VERSION}`}
                className="hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                v{APP_VERSION}
              </Link>
            </div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Made with ❤️ by frogs{" "}
              <a href="https://tomato.gg" target="_blank" title="Tomato.gg">
                🐸🍅
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
