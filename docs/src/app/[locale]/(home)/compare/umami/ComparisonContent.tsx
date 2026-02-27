import { DEFAULT_EVENT_LIMIT } from "@/lib/const";

export function UmamiComparisonContent() {
  return (
    <div className="space-y-6 text-neutral-350 font-light">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Understanding the Key Differences</h2>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">More Than Just a Lightweight Alternative</h3>
        <p className="leading-relaxed">
          Umami has earned respect as one of the lightest analytics scripts available at under 2KB. It's a testament to
          minimalism and efficiency. Rybbit takes a different approach: while our script is larger at 18KB, it's because
          we've packed in powerful features like session replay, error tracking, and advanced user analytics. Think of
          it this way: Umami is a bicycle - efficient, simple, gets you there. Rybbit is an electric bike - still easy
          to use, but with power assistance when you need to go further, faster, and with more insight into your
          journey.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Privacy-First, Open Source Brothers</h3>
        <p className="leading-relaxed">
          Both Rybbit and Umami share the same DNA: privacy-focused, cookie-free, GDPR-compliant analytics that respect
          user privacy. We're both open source, both self-hostable, and neither of us will ever sell your data. Umami
          uses PostgreSQL or MySQL for data storage, while we use ClickHouse for massive scalability. The privacy
          community wins either way. The difference is that Rybbit goes further with features like daily rotating salt
          for enhanced anonymization, while still maintaining the privacy principles we both stand for.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Session Replay: The Game Changer</h3>
        <p className="leading-relaxed">
          Umami tells you what happened. Rybbit shows you exactly how it happened. Our session replay feature is the
          critical difference - watch real users navigate your site, identify confusion points, spot bugs as they
          happen, and understand why users drop off. See rage clicks, form abandonment, and user frustration in
          real-time. Umami deliberately avoids this to maintain simplicity, but we believe you can have both privacy and
          deep insights. Session replay transforms analytics from numbers into understanding, from metrics into
          actionable improvements.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Beyond Basic Analytics</h3>
        <p className="leading-relaxed">
          While Umami recently added funnels and journey reports, Rybbit goes several steps further. We offer
          comprehensive user profiles showing complete session history, real-time error tracking to catch JavaScript
          issues instantly, Web Vitals monitoring for performance optimization, and a stunning real-time globe
          visualization. Umami focuses on being a simple Google Analytics alternative. Rybbit aims to be a complete
          analytics platform that replaces multiple tools - combining the simplicity of Umami, the power of Mixpanel,
          the debugging capability of LogRocket, and the performance monitoring of web vitals tools.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Data Retention and Scale</h3>
        <p className="leading-relaxed">
          One of Umami's acknowledged limitations is data retention - they openly state having limited retention
          capabilities. Rybbit offers 2-5+ years of data retention depending on your plan, powered by ClickHouse, the
          same database that handles billions of events at Cloudflare. While Umami works great for small to medium
          sites, our infrastructure is built for scale from day one. Whether you're tracking thousands or millions of
          events, Rybbit maintains sub-second query performance. This isn't just about handling more data - it's about
          being able to analyze historical trends, year-over-year comparisons, and long-term user behavior patterns.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Self-Hosting vs Managed Service</h3>
        <p className="leading-relaxed">
          Umami shines as a self-hosted solution - it's completely free when you host it yourself, making it perfect for
          developers comfortable managing their own infrastructure. Their cloud offering is relatively new and limited.
          Rybbit offers both robust self-hosting options and a mature managed cloud service with a generous free tier of
          {DEFAULT_EVENT_LIMIT.toLocaleString()} events. We handle the infrastructure, updates, scaling, and maintenance
          so you can focus on understanding your users. For teams that want the benefits of self-hosting without the
          operational overhead, Rybbit provides the best of both worlds.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Built for Different Needs</h3>
        <p className="leading-relaxed">
          Umami is perfect if you want a free, ultra-lightweight, self-hosted alternative to Google Analytics for basic
          web analytics. It does that job admirably. Rybbit is built for teams that need more: product analytics, user
          behavior insights, conversion optimization, debugging tools, and performance monitoring. If you're running a
          blog or content site and just need visitor counts, Umami might be enough. If you're building a SaaS product,
          e-commerce platform, or any application where understanding user behavior deeply matters, Rybbit provides the
          tools you need without the complexity of enterprise analytics platforms.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">The Complete Picture</h3>
        <p className="leading-relaxed">
          Choosing between Umami and Rybbit isn't about which is "better" - it's about what you need. Umami is excellent
          for basic analytics with minimal overhead. Rybbit is designed for teams that need comprehensive insights
          without sacrificing simplicity or privacy. Our session replay, error tracking, Web Vitals monitoring, and
          advanced user analytics aren't just features - they're tools that help you build better products. While Umami
          keeps things simple, we've proven you can have powerful features and still maintain ease of use. With Rybbit,
          you're not just counting visitors, you're understanding users.
        </p>
      </div>
    </div>
  );
}
