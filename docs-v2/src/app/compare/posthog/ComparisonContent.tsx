export function PostHogComparisonContent() {
  return (
    <div className="space-y-6 text-neutral-350 font-light">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Understanding the Key Differences</h2>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">PostHog Is Amazing... For Developers</h3>
        <p className="leading-relaxed">
          Let's be clear: PostHog is an incredibly powerful platform. They've built a comprehensive suite of developer
          tools including feature flags, A/B testing, SQL queries, and deep product analytics. If you're a developer
          who loves complexity and wants every possible feature under the sun, PostHog might be perfect for you. But
          here's the thing: most businesses need web analytics that the entire team can use, not just the engineering
          department. That's where Rybbit shines. We've taken the best parts of advanced analytics and wrapped them in
          an interface so beautiful and intuitive that your marketing team, product managers, and even executives will
          actually use it. No SQL required, no documentation needed, just instant insights.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Beautiful Simplicity vs Feature Overload</h3>
        <p className="leading-relaxed">
          PostHog follows the "everything and the kitchen sink" philosophy. They have heatmaps, feature flags, surveys,
          experiments, notebooks, and a dozen other features you'll probably never use. It's impressive, but it's also
          overwhelming. Their interface looks like an IDE, not an analytics tool. Rybbit takes the opposite approach:
          we carefully selected the features that actually matter for web analytics and made them gorgeous. Our
          real-time globe view isn't just functional, it's mesmerizing. Our dashboards aren't just informative, they're
          a joy to use. We believe analytics should be something you want to check, not something you have to check.
          When your tools are this beautiful, your team will actually use them.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Privacy-First vs Privacy-Optional</h3>
        <p className="leading-relaxed">
          PostHog can be configured for privacy, but it's not the default. They use cookies, collect personal data,
          and build detailed user profiles complete with email addresses and names. You have to actively configure it
          for GDPR compliance. Rybbit is privacy-first by design. No cookies ever. No personal data collection. GDPR
          compliant out of the box. We even offer daily rotating salt for enhanced privacy that PostHog doesn't have.
          While PostHog treats privacy as a configuration option, we treat it as a core principle. Your users shouldn't
          have to trust that you configured your analytics correctly. With Rybbit, privacy isn't optional, it's guaranteed.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Web Analytics Excellence vs Jack of All Trades</h3>
        <p className="leading-relaxed">
          PostHog tries to be everything: product analytics, feature management, experimentation platform, and more.
          They're good at many things but excellent at none. Rybbit focuses exclusively on being the world's best web
          analytics platform. Every feature, every design decision, every line of code is optimized for understanding
          web traffic and user behavior. Our session replay is smoother, our funnels are clearer, our dashboards load
          faster. While PostHog users struggle with complex configurations and scattered features, Rybbit users are
          already getting insights. Sometimes doing one thing exceptionally well beats doing everything adequately.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Predictable Pricing vs Billing Surprise</h3>
        <p className="leading-relaxed">
          PostHog's pricing is a maze. They charge separately for analytics events, session recordings, feature flag
          requests, survey responses, and more. Each product has its own pricing tier and usage limits. You might start
          with their generous free tier, but once you scale, the bills can shock you. One customer reported their bill
          jumping from $0 to $2,000/month overnight. Rybbit keeps it simple: pay for events, get everything included.
          No hidden costs for session replay, no extra charges for funnels, no surprise bills. Our pricing is transparent
          and predictable, so you can focus on growing your business instead of managing your analytics budget.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Fast and Lightweight vs Heavy and Slow</h3>
        <p className="leading-relaxed">
          PostHog's script is over 60KB and includes autocapture that tracks every single interaction on your site. It's
          powerful but heavy, potentially impacting your site's performance and your Core Web Vitals scores. Rybbit's
          script is just 18KB, less than a third of PostHog's size. We track what matters without the bloat. Our
          lightweight approach means faster page loads, better user experience, and improved SEO rankings. Plus, we
          bypass ad blockers naturally without requiring complex reverse proxy setups. In the world of web performance,
          every kilobyte counts, and we've optimized every single one.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Team-Friendly vs Developer-Only</h3>
        <p className="leading-relaxed">
          PostHog's target audience is clear: developers, developers, developers. Their marketing, documentation, and
          product all scream "technical users only." That's great if your entire team consists of engineers, but most
          companies have marketers, product managers, customer success teams, and executives who need analytics too.
          Rybbit is built for everyone. Our interface is so intuitive that new users understand it within minutes. No
          SQL knowledge required, no technical documentation needed, no training sessions necessary. When everyone on
          your team can access and understand your analytics, better decisions get made faster.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Bootstrapped Focus vs VC Pressure</h3>
        <p className="leading-relaxed">
          PostHog raised over $27 million in venture capital. That money comes with expectations: grow fast, add more
          features, increase prices, and eventually exit. This pressure shows in their product strategy of trying to be
          everything to everyone. Rybbit is proudly bootstrapped. We answer to our customers, not investors. This means
          we can focus on building the best product instead of the biggest product. We can keep prices fair instead of
          maximizing revenue. We can say no to feature bloat and yes to polish and refinement. When you choose Rybbit,
          you're choosing a company aligned with your success, not one racing toward an exit.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">The Verdict: Choose Your Fighter</h3>
        <p className="leading-relaxed">
          If you're a developer who wants to write SQL queries, manage feature flags, run experiments, and have access
          to every possible analytics feature, PostHog is your platform. But if you want beautiful, intuitive web
          analytics that your entire team will love, with enterprise features like session replay and funnels but without
          the complexity, Rybbit is the clear choice. We've proven you don't need to sacrifice power for simplicity or
          beauty for functionality. Sometimes the best solution isn't the one with the most features, it's the one that
          makes the features you actually need an absolute pleasure to use. Welcome to analytics that sparks joy.
        </p>
      </div>
    </div>
  );
}