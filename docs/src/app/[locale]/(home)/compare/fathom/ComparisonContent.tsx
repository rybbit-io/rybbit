import { DEFAULT_EVENT_LIMIT } from "@/lib/const";

export function FathomComparisonContent() {
  return (
    <div className="space-y-6 text-neutral-350 font-light">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Understanding the Key Differences</h2>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Open Source vs Closed Source Philosophy</h3>
        <p className="leading-relaxed">
          While Fathom shares our commitment to privacy and simplicity, they've chosen to keep their code proprietary
          and closed source. This fundamental difference matters. With Rybbit's open source approach (AGPL v3), you can
          inspect every line of code, verify our privacy claims, contribute improvements, or even self-host for complete
          control. Fathom requires you to trust their black box. We believe transparency builds trust, which is why our
          8000+ GitHub stars represent a community that can see exactly how we handle their data. Open source isn't just
          a feature; it's a philosophy that aligns with the privacy-first movement both companies champion.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Beyond Basic Analytics</h3>
        <p className="leading-relaxed">
          Fathom excels at simple web analytics, and they've built a solid product for content sites and blogs. But
          modern businesses need more than pageview counts and referrer data. Rybbit provides the advanced features that
          Fathom lacks: session replay to watch real user interactions, funnels to optimize conversion paths, user
          journeys to visualize flow patterns, detailed user profiles with session history, Web Vitals monitoring for
          performance tracking, and browser error tracking to catch issues. While Fathom tells you what happened, Rybbit
          shows you why it happened and how to improve it.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Built for Product Teams</h3>
        <p className="leading-relaxed">
          Fathom was created by content creators for content creators, and it shows. Their features focus on blog
          analytics, newsletter tracking, and content performance. Rybbit is built for product teams who need deeper
          insights. Our session replay helps debug user issues. Our funnel analysis optimizes checkout flows. Our error
          tracking catches JavaScript exceptions. Our user profiles reveal behavior patterns. Our organization support
          manages multiple products and teams. If you're building a SaaS product, e-commerce platform, or web
          application, Rybbit provides the tools you actually need, not just the basics.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Modern Architecture, Modern Features</h3>
        <p className="leading-relaxed">
          Fathom's Go and MySQL stack is solid but traditional. Rybbit leverages Next.js, TypeScript, and ClickHouse,
          the same database that powers analytics at Cloudflare and Uber. This modern architecture enables features
          Fathom can't match: real-time globe visualization, Sankey diagrams for user journeys, lightning-fast queries
          on massive datasets, and seamless React/Vue integration. Our 18KB script includes powerful features like
          session replay and error tracking. Yes, Fathom's script is smaller at 2KB, but you're trading essential
          functionality for marginal performance gains on modern networks.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Privacy Without Compromise</h3>
        <p className="leading-relaxed">
          Both Rybbit and Fathom are privacy-first, cookie-free, and GDPR compliant. We both store data in EU servers
          and never sell user information. But Rybbit goes further with our daily rotating salt option for enhanced
          anonymization and our open source transparency. More importantly, we prove you can respect privacy while still
          providing powerful features. Session replay without cookies. User profiles without personal data. Detailed
          analytics without surveillance. Fathom chose to limit features in the name of simplicity. We chose to innovate
          within privacy constraints.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Accessible to Everyone</h3>
        <p className="leading-relaxed">
          Fathom requires payment from day one, even for personal projects or testing. Their cheapest plan starts at
          $15/month with no free tier. Rybbit believes analytics should be accessible to everyone, offering
          {DEFAULT_EVENT_LIMIT.toLocaleString()} free events monthly, perfect for side projects, personal blogs, or
          evaluation. When you do upgrade, you get significantly more features for a comparable price. Both companies
          are bootstrapped and independent, but we've chosen to lower the barrier to entry. Great analytics shouldn't be
          limited to those who can afford it immediately.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">The Power of Choice</h3>
        <p className="leading-relaxed">
          With Fathom, you get what you get. No self-hosting option. No code transparency. No advanced features. It's a
          take-it-or-leave-it proposition. Rybbit gives you choices. Run our cloud service for zero maintenance.
          Self-host for complete control. Use basic features for simple sites. Enable advanced features for complex
          applications. Contribute to our open source project. Build custom integrations with our API. Your analytics
          platform should adapt to your needs, not force you into a box. That flexibility is the difference between a
          simple tool and a comprehensive platform.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Try Before You Buy</h3>
        <p className="leading-relaxed">
          Fathom offers a 7-day trial, but you need to implement tracking before seeing their interface. Rybbit provides
          a live demo with real data, letting you explore every feature immediately. See session replays in action. Test
          funnel analysis. Explore user journeys. Experience our beautiful UI. No credit card, no time limit, no
          pressure. We're confident that once you see what modern, privacy-friendly analytics can do, you'll understand
          why thousands of developers choose Rybbit. We're not just an alternative to Fathom; we're the evolution of
          what simple, powerful, privacy-first analytics should be.
        </p>
      </div>
    </div>
  );
}
