export function CloudflareAnalyticsComparisonContent() {
  return (
    <div className="space-y-6 text-neutral-350 font-light">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Understanding the Key Differences</h2>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Free Isn't Always Better</h3>
        <p className="leading-relaxed">
          Cloudflare Web Analytics is free, which sounds great until you realize why. It's a side feature for their CDN
          business, not a dedicated analytics product. This shows in the severe limitations: only 10% data sampling
          (they analyze just 1 in 10 visitors), 6-month data retention, no data export, and missing essential features
          like UTM tracking, events, goals, or session tracking. Rybbit is a dedicated analytics platform where every
          feature is thoughtfully designed for understanding your users. We charge fair prices because analytics is our
          core business, not an afterthought.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">See 100% of Your Traffic, Not Just a Sample</h3>
        <p className="leading-relaxed">
          Imagine making business decisions based on just 10% of your data. That's what Cloudflare Analytics gives you.
          Their platform only samples 10% of page load events to keep costs down. Worse, they count the same visitor as
          multiple "unique" visitors if they come from different sources, massively inflating your numbers. Rybbit
          analyzes 100% of your traffic with no sampling ever. We accurately track unique visitors using
          privacy-friendly identification, giving you the complete picture of your site's performance. When every
          visitor matters, you can't afford to miss 90% of them.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Essential Features You Actually Need</h3>
        <p className="leading-relaxed">
          Cloudflare Analytics is missing critical features that even basic analytics tools provide. No UTM campaign
          tracking means you can't measure marketing effectiveness. No events or goals means you can't track
          conversions. No session data means you can't understand user behavior. No bounce rate or visit duration means
          you're flying blind on engagement. Rybbit provides all these essentials plus advanced features like session
          replay, funnels, user journeys, and detailed user profiles. We don't just count page views. We help you
          understand and improve your user experience.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Keep Your Data Forever, Export Anytime</h3>
        <p className="leading-relaxed">
          Cloudflare automatically deletes your data after just 6 months, and provides no way to export it. Your data is
          locked in their system. This makes historical comparisons impossible and leaves you vulnerable if you ever
          need to switch providers. Rybbit keeps your data for years and provides full data export capabilities. Your
          data belongs to you, and you should be able to access it however and whenever you need. We're confident you'll
          stay because you love our product, not because you're trapped.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">No CDN Lock-in Required</h3>
        <p className="leading-relaxed">
          Here's the catch with Cloudflare Analytics: you must proxy your entire website through Cloudflare's CDN to use
          it. This means changing your DNS, routing all traffic through their servers, and potentially dealing with
          caching issues or configuration complexity. If you're already using another CDN or hosting provider, you're
          out of luck. Rybbit works with any website, anywhere. Just add one line of JavaScript. No DNS changes, no
          proxying, no lock-in. Use whatever hosting, CDN, or infrastructure you prefer while getting superior
          analytics.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Advanced Features for Modern Teams</h3>
        <p className="leading-relaxed">
          Cloudflare Analytics shows basic top-15 lists with no depth or detail. You can't dig deeper, can't segment
          data, can't share dashboards, and can't collaborate with your team. There's no API, no custom tracking, no
          mobile support, and no customer support. Rybbit is built for real businesses: unlimited data views, team
          collaboration, organization support, API access, public dashboard sharing, and responsive human support. Plus
          advanced features like session replay, error tracking, Web Vitals monitoring, and real-time globe
          visualization that Cloudflare doesn't even attempt to offer.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Open Source with Self-Hosting Option</h3>
        <p className="leading-relaxed">
          Cloudflare Analytics is a closed system tied to their infrastructure. You can't self-host, can't inspect the
          code, and can't customize anything. Rybbit is proudly open source (AGPL v3) with thousands of GitHub stars.
          You can review our code, contribute features, or self-host for complete control and privacy. The self-hosted
          version includes almost all features for free, making it perfect for privacy-conscious organizations or those
          with specific compliance requirements. Choose between our managed cloud service or run it on your own
          infrastructure. The freedom is yours.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl text-white font-medium">Analytics Is Our Only Focus</h3>
        <p className="leading-relaxed">
          For Cloudflare, web analytics is a minor feature to complement their CDN business. For Rybbit, analytics is
          everything. We're 100% focused on building the best analytics platform possible. Every feature is carefully
          crafted, every update improves the product, and every support request gets personal attention. We're
          independently bootstrapped and deeply invested in making the product better every day. When you choose Rybbit,
          you're not getting a neglected side feature. You're getting a product that's constantly evolving based on real
          user needs, with a live demo available so you can try before you buy.
        </p>
      </div>
    </div>
  );
}
