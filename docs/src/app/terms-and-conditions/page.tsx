export const metadata = {
  title: "Terms and Conditions",
  description: "Rybbit terms and conditions of service",
};

export default function TermsAndConditions() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Terms and Conditions</h1>

      <div className="prose prose-invert max-w-none">
        <p className="text-lg">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Acceptance of Terms</h2>
        <p>
          By accessing and using Rybbit, you accept and agree to be bound by the terms and provision of this agreement.
          If you do not agree to these terms, please do not use our service.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Description of Service</h2>
        <p>
          Rybbit is an open-source, privacy-friendly web analytics platform. We provide both a cloud-hosted service and
          self-hosted software that enables website owners to collect and analyze visitor statistics while respecting
          user privacy.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Use of Service</h2>
        <h3 className="text-xl font-semibold mt-6 mb-3">Acceptable Use</h3>
        <p>You agree to use Rybbit only for lawful purposes and in accordance with these Terms. You agree not to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Use the service in any way that violates any applicable law or regulation</li>
          <li>Attempt to gain unauthorized access to any portion of the service</li>
          <li>Interfere with or disrupt the service or servers</li>
          <li>Use the service to collect personally identifiable information without proper consent</li>
          <li>Resell or redistribute the cloud service without authorization</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6 mb-3">Account Responsibilities</h3>
        <p>For cloud service users:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>You must be a human - accounts registered by bots or automated methods are not permitted</li>
          <li>You must provide accurate, complete, and current information when creating an account</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials</li>
          <li>You are responsible for all activities that occur under your account</li>
          <li>You must notify us immediately of any unauthorized use of your account</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Open Source License</h2>
        <p>
          Rybbit is open-source software released under the MIT License. The self-hosted version is free to use, modify,
          and distribute according to the terms of that license. These Terms and Conditions apply specifically to the
          use of our cloud-hosted service and website.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Subscription and Billing</h2>
        <h3 className="text-xl font-semibold mt-6 mb-3">Payment Terms</h3>
        <p>For paid cloud subscriptions:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Payment is processed via credit card or other accepted payment methods</li>
          <li>Subscriptions are billed on a monthly or annual basis as selected during signup</li>
          <li>All fees are in USD unless otherwise stated</li>
          <li>You authorize us to charge your payment method automatically on each billing cycle</li>
          <li>No surprise fees - your card will never be charged unexpectedly</li>
          <li>Unused page views do not roll over and are forfeited at the end of each billing period</li>
          <li>Failed payments may result in service suspension or termination after notice</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6 mb-3">Auto-Renewal and Price Changes</h3>
        <p>
          Your subscription will automatically renew at the end of each billing period unless you cancel before the
          renewal date. We reserve the right to modify subscription prices with at least 30 days advance notice. Price
          changes will take effect on your next billing cycle. Continued use of the service after a price change
          constitutes acceptance of the new pricing.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3">Refund Policy</h3>
        <p>
          We offer a 60-day money-back guarantee for new paid subscriptions. Refund requests must be submitted within 60
          days of your initial payment. After this period, payments are non-refundable. We do not provide prorated
          refunds for mid-cycle cancellations, but you retain access to the service through the end of your paid billing
          period.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3">Usage Quotas and Overages</h3>
        <p>
          Each plan includes specific usage limits. If you exceed your plan&apos;s page view limit, you may be required
          to upgrade to a higher tier. We will notify you when approaching your limits. Consistent overage may result in
          automatic plan upgrades or service restrictions. We reserve the right to enforce fair use policies to prevent
          abuse of unlimited plans.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Cancellation and Downgrade</h2>
        <h3 className="text-xl font-semibold mt-6 mb-3">How to Cancel</h3>
        <p>
          You may cancel your subscription at any time through your account settings or by contacting support.
          Cancellations take effect at the end of your current billing period. You will retain access to paid features
          until that time.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3">Downgrading Your Plan</h3>
        <p>
          You may downgrade to a lower-tier plan or the free tier at any time. Downgrades take effect at the end of your
          current billing period. If your usage exceeds the limits of the downgraded plan, you may need to reduce your
          websites or accept data retention limitations.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3">Data After Cancellation</h3>
        <p>
          After cancellation or downgrade to free tier, your analytics data will be permanently deleted within 60 days.
          We recommend exporting your data before cancellation if you wish to retain it. Once deleted, data cannot be
          recovered.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Service Availability</h2>
        <p>
          We strive to provide reliable service but do not guarantee uninterrupted access. We reserve the right to
          modify, suspend, or discontinue any part of the service at any time with or without notice. We are not liable
          for any modification, suspension, or discontinuation of the service.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Data and Privacy</h2>
        <h3 className="text-xl font-semibold mt-6 mb-3">Your Data Ownership</h3>
        <p>
          You retain all rights to your website analytics data. We will never sell or share your site data to any
          third parties. Your data is yours, and we act only as a processor of that data on your behalf.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3">Privacy Commitment</h3>
        <p>
          Rybbit does not collect personally identifiable information from your website visitors. Our service is
          designed to be privacy-friendly and compliant with GDPR, CCPA, and other privacy regulations. Our full data
          practices are described in our
          <a href="/privacy" className="text-emerald-400 hover:text-emerald-300 mx-1">
            Privacy Policy
          </a>
          .
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3">Your Compliance Obligations</h3>
        <p>
          You are responsible for ensuring your use of Rybbit complies with all applicable privacy laws and
          regulations in your jurisdiction. You must obtain any necessary consents from your website visitors as
          required by law.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Intellectual Property</h2>
        <p>
          The Rybbit name, logo, and branding are property of Rybbit. The open-source code is available under the MIT
          License. All other content on this website, including text, graphics, and documentation, is protected by
          copyright and other intellectual property laws.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Rybbit and its contributors shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred
          directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your use or inability to use the service</li>
          <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
          <li>Any interruption or cessation of transmission to or from the service</li>
          <li>Any bugs, viruses, or other harmful code that may be transmitted through the service</li>
          <li>Any errors or omissions in any content or for any loss or damage incurred from use of any content</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Disclaimer of Warranties</h2>
        <p>
          The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without any warranties of
          any kind, whether express or implied. We do not warrant that the service will be uninterrupted, secure, or
          error-free, or that any defects will be corrected.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Termination</h2>
        <p>
          We reserve the right to terminate or suspend your account and access to the service immediately, without prior
          notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the
          service will cease immediately.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Rybbit and its contributors from any claims, damages, losses,
          liabilities, and expenses (including legal fees) arising from your use of the service or violation of these
          Terms.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict
          of law provisions. Any disputes arising from these Terms or use of the service shall be resolved in
          appropriate courts.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will notify users of any material changes by
          posting the updated Terms on this page with a revised date. Your continued use of the service after such
          changes constitutes acceptance of the modified Terms.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Severability</h2>
        <p>
          If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or
          eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force and effect.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Entire Agreement</h2>
        <p>
          These Terms, along with our Privacy Policy, constitute the entire agreement between you and Rybbit regarding
          the use of the service and supersede any prior agreements.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Information</h2>
        <p>
          If you have any questions about these Terms and Conditions, please contact us at:
          <a href="https://www.rybbit.io/contact" className="text-emerald-400 hover:text-emerald-300 ml-1">
            hello@rybbit.io
          </a>
        </p>
      </div>
    </div>
  );
}
