import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Data Processing Agreement",
  description: "Rybbit Data Processing Agreement (DPA) - how we process data on your behalf",
  openGraph: {
    images: [createOGImageUrl("Data Processing Agreement", "Rybbit Data Processing Agreement (DPA) - how we process data on your behalf")],
  },
  twitter: {
    images: [createOGImageUrl("Data Processing Agreement", "Rybbit Data Processing Agreement (DPA) - how we process data on your behalf")],
  },
});

export default function DataProcessingAgreement() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Data Processing Agreement</h1>

      <div className="prose prose-invert max-w-none">
        <p className="text-lg">
          Last updated: December 10, 2025
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
        <p>
          This Data Processing Agreement (&quot;DPA&quot;) forms part of the agreement between Rybbit
          (&quot;Processor&quot;, &quot;we&quot;, &quot;us&quot;) and the customer (&quot;Controller&quot;,
          &quot;you&quot;) for the provision of Rybbit&apos;s web analytics services (&quot;Services&quot;).
        </p>
        <p>
          This DPA applies to the processing of personal data by Rybbit on behalf of the Controller in connection with
          the Services, in accordance with applicable data protection laws including the General Data Protection
          Regulation (GDPR).
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Definitions</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>&quot;Personal Data&quot;</strong> means any information relating to an identified or identifiable
            natural person.
          </li>
          <li>
            <strong>&quot;Processing&quot;</strong> means any operation performed on Personal Data, including
            collection, storage, use, disclosure, or deletion.
          </li>
          <li>
            <strong>&quot;Data Subject&quot;</strong> means the individual to whom Personal Data relates.
          </li>
          <li>
            <strong>&quot;Sub-processor&quot;</strong> means any third party engaged by Rybbit to process Personal Data
            on behalf of the Controller.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Scope of Processing</h2>
        <p>
          Rybbit processes Personal Data solely for the purpose of providing the web analytics Services as described in
          our Terms of Service and Privacy Policy. The categories of data processed include:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Page view and session data</li>
          <li>Device and browser information</li>
          <li>Geographic location (country/region level, derived from IP addresses which are not stored)</li>
          <li>Referrer information</li>
          <li>Page performance metrics</li>
          <li>JavaScript errors</li>
          <li>Session replays</li>
          <li>Custom events configured by the Controller</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Processor Obligations</h2>
        <p>Rybbit agrees to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Process Personal Data only on documented instructions from the Controller</li>
          <li>Ensure that persons authorized to process Personal Data are bound by confidentiality obligations</li>
          <li>Implement appropriate technical and organizational security measures</li>
          <li>Assist the Controller in responding to Data Subject requests</li>
          <li>Delete or return Personal Data upon termination of the Services, at the Controller&apos;s choice</li>
          <li>Make available information necessary to demonstrate compliance with this DPA</li>
          <li>Notify the Controller without undue delay of any Personal Data breach</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Controller Obligations</h2>
        <p>The Controller agrees to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Ensure there is a lawful basis for the processing of Personal Data</li>
          <li>Provide any necessary privacy notices to Data Subjects</li>
          <li>Ensure instructions to Rybbit comply with applicable data protection laws</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Sub-processors</h2>
        <p>
          The Controller authorizes Rybbit to engage Sub-processors for the provision of the Services. Rybbit will
          inform the Controller of any intended changes to Sub-processors, giving the Controller the opportunity to
          object. Current Sub-processors include:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Hetzner:</strong> Servers and storage
          </li>
          <li>
            <strong>Cloudflare:</strong> Object storage and security
          </li>
          <li>
            <strong>Stripe:</strong> Payment processing
          </li>
          <li>
            <strong>Resend:</strong> Email delivery
          </li>
          <li>
            <strong>ipapi.is:</strong> IP geolocation (IP addresses are processed but not stored)
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Security Measures</h2>
        <p>Rybbit implements appropriate technical and organizational measures to protect Personal Data, including:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Encryption of data in transit and at rest</li>
          <li>Access controls and authentication mechanisms</li>
          <li>Regular security assessments and updates</li>
          <li>Incident response procedures</li>
          <li>Employee security training</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. International Data Transfers</h2>
        <p>
          If Personal Data is transferred outside the European Economic Area (EEA), Rybbit ensures appropriate
          safeguards are in place, such as Standard Contractual Clauses or other legally recognized transfer mechanisms.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Data Subject Rights</h2>
        <p>
          Rybbit will assist the Controller in fulfilling its obligations to respond to Data Subject requests, including
          requests for access, rectification, erasure, data portability, and objection to processing.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Data Retention</h2>
        <p>
          Rybbit retains Personal Data for the duration specified in our Privacy Policy or as agreed with the
          Controller. Upon termination of the Services, Personal Data will be deleted or returned as requested by the
          Controller within 30 days.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Audits</h2>
        <p>
          Rybbit will make available to the Controller information necessary to demonstrate compliance with this DPA and
          allow for audits conducted by the Controller or an appointed auditor, subject to reasonable notice and
          confidentiality obligations.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">12. Term and Termination</h2>
        <p>
          This DPA remains in effect for the duration of the Services agreement. The obligations regarding data
          protection and confidentiality survive termination.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contact</h2>
        <p>
          For questions about this DPA or to exercise any rights, please contact us at:
          <a href="mailto:hello@rybbit.com" className="text-emerald-400 hover:text-emerald-300 ml-1">
            hello@rybbit.com
          </a>
        </p>
      </div>
    </div>
  );
}
