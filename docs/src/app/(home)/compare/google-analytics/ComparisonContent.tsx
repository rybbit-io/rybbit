export function GoogleAnalyticsComparisonContent() {
  return (
    <div className="space-y-6 text-neutral-350 font-light">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Understanding the Key Differences</h2>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Privacy First, Not Privacy Theater</h3>
        <p className="leading-relaxed">
          The fundamental difference between Rybbit and Google Analytics lies in our approach to privacy. While Google
          Analytics collects vast amounts of personal data requiring cookie consent banners to comply with GDPR and
          CCPA, Rybbit is built privacy-first. We don't use cookies, don't track personal information, and are compliant
          by default. This means you can finally remove those annoying cookie banners while still getting powerful
          insights. We identify users with a privacy-friendly hash and offer daily rotating salt for enhanced anonymity.
          Your visitors' privacy is respected, and you stay compliant without any extra work.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">The Sweet Spot Between Simple and Powerful</h3>
        <p className="leading-relaxed">
          Google Analytics 4 has become notoriously complex, often requiring dedicated specialists or extensive training
          to extract meaningful insights. Meanwhile, simpler alternatives may lack the advanced features you need.
          Rybbit fills this gap perfectly: we provide comprehensive features including session replay, user profiles,
          funnels, and journey visualization while maintaining an intuitive interface that anyone can use. Everything
          works out of the box with minimal configuration. It's the best of both worlds: powerful analytics without the
          complexity.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Built for Performance</h3>
        <p className="leading-relaxed">
          Website performance directly impacts user experience, SEO rankings, and conversion rates. Google Analytics'
          tracking script can significantly slow down your site with its large size and multiple network requests.
          Rybbit's lightweight script loads from a global CDN, ensuring minimal impact on your site's performance while
          still delivering powerful features like session replay and error tracking. Better performance means happier
          visitors and improved search rankings.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Real-Time, Accurate Data That Lasts</h3>
        <p className="leading-relaxed">
          Google Analytics has significant accuracy issues that most users don't realize. It samples data on
          high-traffic sites (showing you only a fraction of actual visits), has delays in reporting, and automatically
          deletes your data after 2-14 months. Many ad blockers also block Google Analytics, meaning you're missing
          15-30% of your visitors. Rybbit gives you 100% accurate, real-time data with no sampling ever. We're less
          prone to ad blockers, and your data is retained for years. See everything that happens on your site, when it
          happens.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Beyond Basic Analytics</h3>
        <p className="leading-relaxed">
          While Google Analytics shows you what happened through numbers and charts, Rybbit provides a comprehensive
          suite of advanced features. Watch real user sessions with session replay, track user journeys with Sankey
          diagrams, analyze conversion funnels, monitor Web Vitals by page and region, track browser errors, and build
          detailed user profiles with session history. Our real-time globe view adds a visual element to see live
          visitor activity. Features like public dashboards and organization support make Rybbit perfect for agencies
          and teams. It's not just analytics but a complete understanding of your users.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Open Source and Self-Hostable</h3>
        <p className="leading-relaxed">
          Google Analytics is a closed system where you have no control or visibility into how your data is processed.
          Rybbit is open source (AGPL v3) with thousands of stars on GitHub, meaning you can inspect our code,
          contribute improvements, or even self-host for complete control. On the self-hosted version, almost all
          features are available for free. This transparency and flexibility is impossible with Google Analytics.
          Whether you choose our cloud service or self-host, you maintain full ownership and control of your analytics
          infrastructure.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Transparent Business Model</h3>
        <p className="leading-relaxed">
          Google Analytics is "free" because you're the product. Your data feeds their advertising empire. Rybbit has a
          transparent, sustainable business model: we charge fair prices for our service. No hidden costs, no data
          mining, no advertising network. We're independently bootstrapped and aligned with your success, not venture
          capital demands. You know exactly what you're paying for and why.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Try Before You Buy</h3>
        <p className="leading-relaxed">
          Unlike Google Analytics where you need to implement tracking before seeing any interface, Rybbit offers a live
          demo with real data so you can explore all features immediately. See our beautiful UI, test the session
          replay, and explore the dashboards all before signing up. When you're ready, implementation is just one line
          of code with no complex configuration needed. Everything works out of the box. Join thousands of websites that
          have already made the switch to analytics that respects both you and your visitors.
        </p>
      </div>
    </div>
  );
}
