export function MatomoComparisonContent() {
  return (
    <div className="space-y-6 text-neutral-350 font-light">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Understanding the Key Differences</h2>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Simplicity Wins Over Complexity</h3>
        <p className="leading-relaxed">
          Matomo positions itself as an open-source Google Analytics alternative, and it shows. With over 70 individual
          reports spread across 12 main sections, Matomo inherits the same overwhelming complexity that makes Google
          Analytics so difficult to use. Finding the data you need requires navigating through endless menus and
          configurations. Rybbit takes the opposite approach: we provide powerful analytics through a beautifully simple
          interface. All your essential metrics are visible at a glance, with advanced features just a click away. You
          get comprehensive insights without drowning in complexity.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Modern Technology vs Legacy Architecture</h3>
        <p className="leading-relaxed">
          Matomo was built in 2007 using PHP and MySQL, and its age shows in both performance and user experience. The
          interface feels dated, the script is heavy (20-50KB), and it requires constant maintenance and updates. Rybbit
          is built with modern technologies like Next.js, TypeScript, and ClickHouse, delivering blazing fast
          performance with an 18KB script. Our cloud infrastructure auto-scales to handle any traffic spike, while
          Matomo's self-hosted setup requires you to manage servers, handle updates, and worry about performance
          optimization yourself.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Privacy by Default, Not by Configuration</h3>
        <p className="leading-relaxed">
          While Matomo claims to be privacy-focused, achieving GDPR compliance requires navigating through multiple
          configuration steps. By default, Matomo uses cookies and collects IP addresses, meaning you'll likely still
          need consent banners. Getting it privacy-compliant involves disabling features, configuring anonymization, and
          careful testing. Rybbit is privacy-compliant from the moment you install it. No cookies, no personal data
          collection, and no consent banners needed. We've built privacy into our core architecture, not added it as an
          afterthought.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Zero Maintenance vs Constant Updates</h3>
        <p className="leading-relaxed">
          Running Matomo means becoming a system administrator. You need to handle server management, security updates,
          PHP upgrades, database optimization, and regular maintenance. Each update risks breaking your analytics, and
          you're responsible for backups and disaster recovery. With Rybbit's cloud service, we handle everything. No
          servers to manage, no updates to install, no security patches to worry about. Your analytics just work,
          always up-to-date with the latest features and security improvements. Focus on your business, not on
          maintaining analytics infrastructure.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Features That Actually Matter</h3>
        <p className="leading-relaxed">
          Matomo includes hundreds of features, but many are outdated or rarely used. Meanwhile, it's missing modern
          essentials like user journey visualization, Web Vitals monitoring, and a real-time globe view. Rybbit focuses
          on features that deliver real value: session replay to understand user behavior, funnels to optimize
          conversions, error tracking to catch issues, and beautiful visualizations that make data exploration enjoyable.
          We don't just match Matomo's capabilities; we provide the modern features that today's businesses actually
          need.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Affordable Cloud vs Expensive Self-Hosting</h3>
        <p className="leading-relaxed">
          While Matomo is "free" to self-host, the real costs add up quickly: server hosting, maintenance time, security
          monitoring, and the opportunity cost of managing infrastructure instead of growing your business. Matomo's
          cloud offering is limited and expensive, starting at €19/month for just 50k pageviews. Rybbit offers generous
          cloud plans starting at $19/month for 100k events, with all features included. Or self-host our open-source
          version with almost all features available for free. Either way, you get better value than Matomo's
          complicated pricing structure.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Built for Today's Web</h3>
        <p className="leading-relaxed">
          Matomo feels like analytics software from a previous era because it is. Its PHP-based architecture, MySQL
          dependency, and complex setup process reflect web development practices from 15 years ago. Rybbit is built for
          modern web applications. Our TypeScript SDK integrates seamlessly with React, Vue, and other frameworks. Our
          API is RESTful and developer-friendly. Our infrastructure leverages ClickHouse for lightning-fast queries on
          massive datasets. When you choose Rybbit, you're choosing technology that matches your modern development
          stack.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Try It Before You Commit</h3>
        <p className="leading-relaxed">
          Setting up Matomo requires significant time investment before you can even see if it meets your needs. You need
          to provision servers, install dependencies, configure the database, set up tracking, and navigate through
          complex documentation. With Rybbit, you can explore a live demo with real data immediately. See the interface,
          test the features, and understand the value before writing a single line of code. When you're ready to start,
          implementation takes just one line of JavaScript. That's the difference between software designed for
          developers and software that fights against them.
        </p>
      </div>
    </div>
  );
}