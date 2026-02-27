import { DEFAULT_EVENT_LIMIT } from "@/lib/const";

export function SimpleAnalyticsComparisonContent() {
  return (
    <div className="space-y-6 text-neutral-350 font-light">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Understanding the Key Differences</h2>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Privacy-First, Feature-Rich</h3>
        <p className="leading-relaxed">
          SimpleAnalytics and Rybbit share the same core mission: provide privacy-friendly analytics without cookies or
          personal data collection. Both platforms are GDPR/CCPA compliant by design, store data in EU servers, and
          respect user privacy. The key difference lies in depth of features. While SimpleAnalytics focuses on keeping
          things minimal with basic web analytics, Rybbit proves you can have both privacy and power. We offer session
          replay, funnels, user journeys, detailed user profiles, Web Vitals monitoring, and error tracking, all while
          maintaining the same privacy standards and ease of use that SimpleAnalytics champions.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Open Source Freedom vs Closed Source Limitations</h3>
        <p className="leading-relaxed">
          SimpleAnalytics keeps their code proprietary and closed source, requiring you to trust their privacy claims
          without verification. Rybbit is fully open source (AGPL v3) with 8000+ GitHub stars. You can inspect every
          line of code, verify our privacy implementation, contribute improvements, or self-host for complete control.
          While SimpleAnalytics shares their revenue metrics publicly (which is admirable), we share something more
          important: our actual code. True transparency means letting users see exactly how their data is handled, not
          just financial metrics.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">See the Complete User Journey</h3>
        <p className="leading-relaxed">
          SimpleAnalytics tells you what pages were visited and which buttons were clicked. That's useful, but modern
          businesses need deeper insights. Rybbit's session replay shows you exactly how users interact with your site,
          helping you identify confusion points and optimize user experience. Our funnel analysis reveals where users
          drop off in conversion flows. User journey visualization shows path patterns across your entire site. Detailed
          user profiles track behavior over time. While SimpleAnalytics gives you surface-level metrics, Rybbit provides
          the depth needed to truly understand and improve your product.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Built for Modern Product Teams</h3>
        <p className="leading-relaxed">
          SimpleAnalytics works well for blogs and content sites that need basic visitor metrics. Rybbit is designed for
          product teams building SaaS applications, e-commerce platforms, and complex web apps. Our error tracking helps
          you catch JavaScript exceptions before users report them. Web Vitals monitoring ensures optimal performance.
          Custom events with rich attributes track complex user interactions. Organization support manages multiple
          products and teams from one dashboard. If you're building a product rather than publishing content, Rybbit
          provides the tools you actually need.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">AI Hype vs Real Features</h3>
        <p className="leading-relaxed">
          SimpleAnalytics recently added an AI assistant to help interpret analytics data. While AI can be helpful, we
          believe in providing features that deliver immediate, tangible value. Instead of asking an AI what your users
          are doing, Rybbit shows you with session replay. Instead of AI-generated insights about conversion rates, our
          funnels reveal exactly where users drop off. Real-time globe visualization, Sankey diagrams, and detailed user
          profiles provide actionable insights without the AI middleman. We focus on building powerful features, not
          chasing trends.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Free Tier That Makes Sense</h3>
        <p className="leading-relaxed">
          SimpleAnalytics offers unlimited pageviews on their free tier, but with a major catch: they delete all data
          older than 30 days. This makes historical comparisons impossible and limits the free tier's usefulness for any
          serious analysis. Rybbit's free tier provides {DEFAULT_EVENT_LIMIT.toLocaleString()} pageviews per month with
          full data retention. You can track seasonal trends, compare year-over-year growth, and build a complete
          picture of your site's performance over time. A truly useful free tier shouldn't delete your history just when
          it becomes valuable.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Modern Stack for Modern Needs</h3>
        <p className="leading-relaxed">
          SimpleAnalytics uses Node.js and PostgreSQL, a solid but traditional stack. Rybbit leverages Next.js,
          TypeScript, and ClickHouse, the same database technology that powers analytics at scale for companies like
          Cloudflare. This modern architecture enables features SimpleAnalytics can't match: lightning-fast queries on
          massive datasets, real-time data processing, and seamless integration with modern frameworks. Yes, our script
          is slightly larger (18KB vs 3KB), but that includes powerful features like session replay and error tracking
          that SimpleAnalytics simply doesn't offer.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Choose Power Without Sacrificing Simplicity</h3>
        <p className="leading-relaxed">
          Both Rybbit and SimpleAnalytics are bootstrapped companies fighting against surveillance capitalism. We
          respect their commitment to privacy and transparency. But we believe users shouldn't have to choose between
          simplicity and functionality. Rybbit maintains the same clean, intuitive interface that makes SimpleAnalytics
          appealing, while adding the advanced features that modern businesses need. Think of us as the next evolution:
          all the privacy and simplicity you expect, plus the power and insights you deserve. With our live demo, you
          can see the difference immediately, no implementation required.
        </p>
      </div>
    </div>
  );
}
