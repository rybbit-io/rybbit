import { CustomHeader } from "../../components/CustomHeader";
import { Footer } from "../../components/Footer";

export const metadata = {
  title: "Security",
  description: "Rybbit security practices and data protection",
};

export default function Security() {
  return (
    <>
      <CustomHeader />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Security</h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-lg mb-8">
            Security and privacy are at the core of everything we do at Rybbit. Here's how we protect your data and
            maintain a secure analytics platform.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Visitor Privacy Protection</h2>
          <p>Your website visitors' privacy is paramount. Here's how we protect it:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>No cookies or local storage used for tracking</li>
            <li>IP addresses are hashed and anonymized</li>
            <li>User-Agent strings are hashed daily with rotating salts</li>
            <li>Raw visitor data is never stored</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Infrastructure Security</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3">Hosting</h3>
          <p>
            Rybbit is hosted on Hetzner servers located in Germany, within the European Union. Hetzner is ISO 27001
            certified and provides:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Physical security at data centers</li>
            <li>DDoS protection</li>
            <li>Redundant infrastructure</li>
            <li>24/7 monitoring</li>
            <li>EU-based data processing</li>
            <li>Daily backups</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">Network Security</h3>
          <p>
            Our database servers are not accessible on the open internet. They are protected behind private networks
            with strict firewall rules, ensuring that only authorized application servers can access them. This
            significantly reduces the attack surface and protects your data from external threats.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">External Services</h3>
          <p>
            For session replay storage, we use Cloudflare R2 (object storage). Cloudflare is a trusted infrastructure
            provider with enterprise-grade security. All replay data is encrypted before storage.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">User Authentication & Account Security</h2>
          <p>We take account security seriously:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Passwords are hashed and salted</li>
            <li>Each password gets a unique salt - no rainbow table attacks possible</li>
            <li>We never store passwords in plain text</li>
            <li>Sessions expire after 14 days of inactivity</li>
            <li>Secure password reset flows</li>
            <li>Account activity monitoring</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Data Ownership & Control</h2>
          <p>You have complete control over your data:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You own 100% of your website analytics data</li>
            <li>You can delete your account and all associated data at any time</li>
            <li>You can delete individual sites and their data</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">Data Deletion</h3>
          <p>
            After cancellation or downgrade to free tier, your analytics data will be permanently deleted within 60
            days. We recommend exporting your data before cancellation if you wish to retain it. Once deleted, data
            cannot be recovered.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Payment Security</h2>
          <p>
            We never store your payment details. All payment processing is handled by PCI DSS compliant payment
            processors (Stripe). Your credit card information goes directly to the payment processor and never touches
            our servers.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Open Source & Transparency</h2>
          <p>Rybbit is fully open source, which means:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Our entire codebase is publicly available on GitHub</li>
            <li>Security researchers can audit our code</li>
            <li>We receive community security feedback</li>
            <li>Vulnerabilities are disclosed responsibly</li>
            <li>Regular software updates and security patches</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Continuous Monitoring & Updates</h2>
          <p>We maintain a secure platform through:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Continuous infrastructure monitoring</li>
            <li>Regular security updates and patches</li>
            <li>Comprehensive automated testing</li>
            <li>Public changelog of all updates</li>
            <li>Dependency vulnerability scanning</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Compliance</h2>
          <p>Rybbit is designed to help you comply with privacy regulations:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>GDPR compliant (no personal data collection)</li>
            <li>CCPA compliant</li>
            <li>PECR compliant (no cookie consent needed)</li>
            <li>Can be used without cookie banners in most jurisdictions</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Vulnerability Disclosure</h2>
          <p>If you discover a security vulnerability in Rybbit, please report it responsibly:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Email us at{" "}
              <a href="mailto:hello@rybbit.io" className="text-emerald-400 hover:text-emerald-300">
                hello@rybbit.io
              </a>
            </li>
            <li>Provide detailed information about the vulnerability</li>
            <li>Allow us reasonable time to address the issue before public disclosure</li>
            <li>We will acknowledge your contribution publicly (unless you prefer to remain anonymous)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Questions?</h2>
          <p>
            If you have any questions about our security practices, please contact us at{" "}
            <a href="mailto:hello@rybbit.io" className="text-emerald-400 hover:text-emerald-300">
              hello@rybbit.io
            </a>
            .
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
