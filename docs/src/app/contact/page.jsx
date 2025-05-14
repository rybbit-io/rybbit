import Link from "next/link";

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
          Have questions about Rybbit? We're here to help! Reach out to us
          through any of these channels:
        </p>

        <div className="space-y-6">
          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="bg-neutral-800 p-3 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-300"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-medium mb-1">Email</h2>
              <a
                href="https://www.rybbit.io/contact"
                className="text-neutral-300 hover:text-white transition-colors"
              >
                hello@rybbit.io
              </a>
            </div>
          </div>

          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="bg-neutral-800 p-3 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-300"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-300"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-300"
              >
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
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

      <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-xl p-6">
        <h2 className="text-xl font-medium mb-3">Open Source Contributions</h2>
        <p className="mb-4">
          Rybbit is an open-source project. If you'd like to contribute, report
          issues, or suggest features, please visit our GitHub repository.
        </p>
        <Link
          href="https://github.com/rybbit-io/rybbit"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-5 py-2 rounded-lg border border-neutral-700 transform hover:-translate-y-0.5 transition-all duration-200 hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:ring-opacity-50 cursor-pointer">
            Visit GitHub Repository
          </button>
        </Link>
      </div>
    </div>
  );
}
