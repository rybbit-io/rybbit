export const metadata = {
  title: "Privacy Policy",
  description: "Rybbit privacy policy - how we protect your data",
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-invert max-w-none">
        <p className="text-lg">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Overview</h2>
        <p>
          Rybbit is an open-source, privacy-friendly web analytics alternative to Google Analytics. This privacy policy
          explains our approach to data collection and how we prioritize user privacy while still providing website
          owners with valuable insights.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Data We Collect</h2>
        <p>Rybbit collects the following anonymous data about website visits:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Page data:</strong> URLs visited, page titles, referrers, and query parameters
          </li>
          <li>
            <strong>Visit information:</strong> Session duration, entry and exit pages
          </li>
          <li>
            <strong>Device information:</strong> Browser type and version, operating system, screen resolution, device
            type
          </li>
          <li>
            <strong>Location data:</strong> Country and region (derived from IP address, which is not stored)
          </li>
          <li>
            <strong>Marketing data:</strong> UTM parameters (source, medium, campaign)
          </li>
          <li>
            <strong>Custom events:</strong> If configured by the website owner
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">How We Process IPs</h2>
        <p>
          When processing visitor data, IP addresses are only used temporarily to determine geographic location (country
          and region) using{" "}
          <a href="https://ipapi.is/" className="text-emerald-400 hover:text-emerald-300" target="_blank">
            ipapi.is
          </a>
          . The actual IP addresses are never stored in our database, preserving visitor anonymity while still providing
          geographic insights to website owners.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">User and Session IDs</h2>
        <p>
          Rybbit uses anonymous session and user identifiers that contain no personally identifiable information. These
          IDs help track user journeys and session information without compromising privacy or requiring cookies.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">No Cookies Policy</h2>
        <p>
          Unlike traditional analytics tools, Rybbit functions without cookies. This means websites using Rybbit
          typically don&apos;t require cookie consent banners under GDPR, ePrivacy Directive, and similar regulations.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">How Data is Used</h2>
        <p>The collected data is used exclusively to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide website owners with anonymous, aggregated statistics about their visitors</li>
          <li>Show trends in website traffic and user behavior</li>
          <li>Help identify popular content and effective referral sources</li>
          <li>Track marketing campaign performance</li>
          <li>Understand user flows through websites</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Data Ownership</h2>
        <p>
          For self-hosted Rybbit instances, all collected data remains exclusively on your servers and under your
          control. For our cloud service, you retain ownership of your analytics data, and we process it solely to
          provide the analytics service to you.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Data Retention</h2>
        <p>
          For self-hosted instances, data retention is configurable by the administrator. For our cloud service, we
          retain analytics data for 12 months by default, after which it is automatically deleted.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">GDPR and Privacy Regulations Compliance</h2>
        <p>Rybbit is designed with privacy regulations in mind, including GDPR, CCPA, and ePrivacy Directive:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>We collect minimal data needed for analytics</li>
          <li>We don&apos;t use cookies or local storage</li>
          <li>We don&apos;t track users across different websites</li>
          <li>We don&apos;t collect or store personal data that could directly identify individuals</li>
          <li>We don&apos;t share or sell your analytics data</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Security Measures</h2>
        <p>
          For our cloud service, we implement appropriate technical and organizational security measures to protect your
          data. For self-hosted instances, security is managed by your administrators.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically to reflect changes in our practices or for legal reasons. We
          will post the updated policy on this page with a revised date.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Open Source Transparency</h2>
        <p>
          As an open-source project, our code is publicly available for review. This includes our data collection
          mechanisms, which you can audit to verify our privacy claims.
          <a href="https://github.com/rybbit-io/rybbit" className="text-emerald-400 hover:text-emerald-300 ml-1">
            View our GitHub repository
          </a>
          .
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p>
          If you have questions about this privacy policy or Rybbit&apos;s data practices, please contact us at:
          <a href="https://www.rybbit.io/contact" className="text-emerald-400 hover:text-emerald-300 ml-1">
            hello@rybbit.io
          </a>
        </p>
      </div>
    </div>
  );
}
