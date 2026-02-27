import { DEFAULT_EVENT_LIMIT } from "@/lib/const";

export function PlausibleComparisonContent() {
  return (
    <div className="space-y-6 text-neutral-350 font-light">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Understanding the Key Differences</h2>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Same Simplicity, Way More Features</h3>
        <p className="leading-relaxed">
          Plausible pioneered the simple, privacy-friendly analytics dashboard, and we respect that. In fact, our main
          dashboard is remarkably similar because that clean, intuitive design just works. But here's where we diverge:
          while Plausible stops at basic web analytics, Rybbit goes much further. We've added session replay, funnels,
          user journeys, detailed user profiles, Web Vitals monitoring, and error tracking, all while maintaining the
          same ease of use. You don't have to choose between simplicity and functionality. With Rybbit, you get both.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Privacy-Friendly Brothers in Arms</h3>
        <p className="leading-relaxed">
          Both Rybbit and Plausible share the same core values: respect user privacy, avoid cookies, and comply with
          GDPR by default. We're both open source (AGPL v3), both self-hostable, and both store data in EU servers.
          Neither of us will ever sell your data or use it for advertising. The privacy community doesn't need to pick
          sides here. We're fighting the same fight against surveillance capitalism. The difference is that Rybbit
          proves you can be privacy-first while still offering advanced features that help businesses grow.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">See How Users Really Behave</h3>
        <p className="leading-relaxed">
          Plausible tells you what pages users visit. Rybbit shows you how they actually interact with those pages. Our
          session replay feature lets you watch real user sessions, understand confusion points, identify bugs, and
          optimize user experience. See users rage-clicking, getting stuck in forms, or abandoning carts. Combine this
          with our funnel analysis and user journey visualization, and you have a complete picture of user behavior that
          Plausible simply can't provide. It's the difference between knowing your bounce rate and understanding why
          users bounce.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Built for Product Teams, Not Just Marketers</h3>
        <p className="leading-relaxed">
          Plausible excels at answering marketing questions: Where do visitors come from? What content performs best?
          Rybbit answers those questions too, but we also serve product teams. Track custom events with attributes,
          analyze conversion funnels, monitor Web Vitals performance, catch JavaScript errors, and build detailed user
          profiles. Our sessions view shows every action a user takes, helping you understand the complete user journey.
          While Plausible is great for content sites and blogs, Rybbit is built for SaaS products, e-commerce platforms,
          and complex web applications.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Organizations and Scale</h3>
        <p className="leading-relaxed">
          As your business grows, your analytics needs evolve. Plausible works well for individual websites, but lacks
          organization-level features. Rybbit provides full organization support, allowing you to manage multiple
          websites, team members, and permissions from a central dashboard. Our infrastructure is built on ClickHouse,
          the same database that powers analytics at Cloudflare and Uber, ensuring we can handle massive scale. Whether
          you're tracking one website or one hundred, Rybbit grows with you without compromising performance or
          simplicity.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">A Free Tier That Actually Helps</h3>
        <p className="leading-relaxed">
          Plausible requires payment from day one, even for small personal projects. We believe analytics should be
          accessible to everyone, which is why Rybbit offers a generous free tier with{" "}
          {DEFAULT_EVENT_LIMIT.toLocaleString()} pageviews per month. Perfect for personal blogs, side projects, or
          testing before you commit. When you're ready to upgrade, our pricing is competitive and transparent. Both
          companies are bootstrapped and independent, but we've chosen to make getting started easier for developers and
          small businesses who are just beginning their journey.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">The Best of Both Worlds</h3>
        <p className="leading-relaxed">
          Choosing Rybbit doesn't mean rejecting what Plausible stands for. We share their commitment to privacy,
          simplicity, and ethical business practices. We've just taken it further. Our beautiful interface matches
          Plausible's elegance while adding powerful features under the hood. Our real-time globe view makes analytics
          fun. Our session replay makes debugging easier. Our funnels help you optimize conversions. Think of Rybbit as
          Plausible Plus: everything you love about simple, privacy-friendly analytics, plus everything you need to
          truly understand and improve your user experience.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Modern Stack, Modern Features</h3>
        <p className="leading-relaxed">
          While both platforms use ClickHouse for data storage, our Next.js and TypeScript foundation enables rapid
          feature development and seamless integration with modern web frameworks. This shows in our feature velocity:
          session replay, error tracking, Web Vitals monitoring, and user journey visualization are just the beginning.
          We're constantly shipping new features based on user feedback, all while maintaining the clean, simple
          interface that makes Plausible-style analytics so appealing. When you choose Rybbit, you're not just getting
          more features today, you're joining a platform that's evolving faster to meet tomorrow's needs.
        </p>
      </div>
    </div>
  );
}
