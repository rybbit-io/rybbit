import { GitHubStarButton } from "@/components/GitHubStarButton";
import { Integrations } from "@/components/Integration";
import { PricingSection } from "@/components/PricingSection";
import { SectionBadge } from "@/components/SectionBadge";
import { TrackedButton } from "@/components/TrackedButton";
import { TweetCard } from "@/components/Tweet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { CheckCircle, Code, Cookie, MousePointer, Target, TrendingUp, Zap } from "lucide-react";
import { Tilt_Warp } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Funnels } from "../../components/Cards/Funnels";
import { RealTimeAnalytics } from "../../components/Cards/RealTimeAnalytics";
import { SessionReplay } from "../../components/Cards/SessionReplay";
import { UserSessions } from "../../components/Cards/UserSessions";
import { DEFAULT_EVENT_LIMIT } from "../../lib/const";
import { SpinningGlobe } from "@/components/SpinningGlobe";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
});

// FAQ Structured Data
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Rybbit GDPR and CCPA compliant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Rybbit is fully compliant with GDPR, CCPA, and other privacy regulations. We don't use cookies or collect any personal data that could identify your users. We salt user IDs daily to ensure users are not fingerprinted. You will not need to display a cookie consent banner to your users.",
      },
    },
    {
      "@type": "Question",
      name: "How does Rybbit compare to Google Analytics?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rybbit is much less bloated than Google Analytics, both in terms of our tracking script and the UX of the dashboard. We show you exactly what you need to see. The difference in usability is night and day.",
      },
    },
    {
      "@type": "Question",
      name: "Can I self-host Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely! Rybbit is available as a self-hosted option. You can install it on your own server and have complete control over your data. We also offer a cloud version if you prefer a managed solution.",
      },
    },
    {
      "@type": "Question",
      name: "How easy is it to set up Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Setting up Rybbit is incredibly simple. Just add a small script to your website or install @rybbit/js from npm, and you're good to go. Most users are up and running in less than 5 minutes.",
      },
    },
    {
      "@type": "Question",
      name: "What platforms does Rybbit support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rybbit works with virtually any website platform. Whether you're using WordPress, Shopify, Next.js, React, Vue, or any other framework, our simple tracking snippet integrates seamlessly.",
      },
    },
    {
      "@type": "Question",
      name: "Is Rybbit truly open source?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Rybbit is 100% open source. Every single line of code, including for our cloud/enterprise offerings, is available on GitHub under the AGPL 3.0 license.",
      },
    },
  ],
};

export const metadata = {
  title: "Rybbit - Cookieless Google Analytics Replacement",
  description:
    "Next-gen, open source, lightweight, cookieless web & product analytics for everyone — GDPR/CCPA compliant.",
};

const features = [
  {
    icon: TrendingUp,
    title: "Ditch Google Analytics",
    description:
      "Google Analytics is bloated, confusing, and designed to sell ads. At Rybbit, our only product is web analytics, and our only goal is to help you understand your users (instead of tracking them across the web).",
  },
  {
    icon: Zap,
    title: "Setup in minutes",
    description:
      "Add one line of code to your site and you're done using one of our 30+ framework guides.  Start seeing real-time data within seconds of installation.",
  },
  {
    icon: MousePointer,
    title: "One click from everything",
    description:
      "Our dashboard is stupidly simple to use. You don't have to spend hours learning how to use it. Funnels, goals, journeys, web vitals, and session replays are all just a click away.",
  },
  {
    icon: Target,
    title: "See more accurate data",
    description:
      "Built-in bot detection filters out fake traffic automatically. No more inflated numbers from scrapers and crawlers. See only real human visitors and make decisions based on actual user behavior.",
  },
  {
    icon: Cookie,
    title: "No more cookie banners",
    description:
      "We don't use cookies. Period. That means no annoying consent banners cluttering your site, no user friction, and full compliance with GDPR, CCPA, and other privacy regulations by default.",
  },
  {
    icon: Code,
    title: "Open source forever",
    description:
      "We're bootstrapped, independent, and 100% open source. Every line of code is on GitHub for you to inspect, modify, or self-host. We're building Rybbit for the community, not for venture capitalists.",
  },
];

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="flex flex-col items-center justify-center overflow-x-hidden pt-16 md:pt-24">
        <GitHubStarButton />

        <h1
          className={cn(
            "text-4xl md:text-5xl lg:text-7xl px-4 tracking-tight max-w-4xl text-center text-neutral-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:via-gray-100 dark:to-gray-400",
            tilt_wrap.className
          )}
        >
          The Modern Google Analytics Replacement
        </h1>
        <h2 className="text-base md:text-xl pt-4 md:pt-6 px-4 tracking-tight max-w-4xl text-center text-neutral-600 dark:text-neutral-300 font-light">
          Rybbit is powerful, lightweight, and super easy to use analytics. Cookieless and GDPR compliant. Hosted on EU
          infrastructure in Germany{" "}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 767 512"
            role="img"
            aria-label="European flag"
            className="inline mr-2 w-8 rounded align-sub"
          >
            <title>European flag</title>
            <path className="fill-[#233E90]/80" d="M766 1H1v510h765V1Z"></path>
            <path
              className="fill-yellow-400"
              d="m387 117-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm114 43-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm47 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-321 0-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm283 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123 35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123-35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm0-250-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Z"
            ></path>
          </svg>
        </h2>

        <div className="flex flex-col items-center my-8 md:my-10">
          <div className="flex flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg">
            <TrackedButton
              href="https://app.rybbit.io/signup"
              eventName="signup"
              eventProps={{ location: "hero", button_text: "get started" }}
              className="w-full whitespace-nowrap sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
            >
              Get started
            </TrackedButton>
            <TrackedButton
              href="https://demo.rybbit.com/1"
              eventName="demo"
              target="_blank"
              rel="noopener noreferrer"
              eventProps={{ location: "hero", button_text: "Live demo" }}
              className="w-full whitespace-nowrap sm:w-auto bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium px-6 py-3 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer"
            >
              Live demo
            </TrackedButton>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm flex items-center justify-center gap-2 mt-6">
            <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
            First {DEFAULT_EVENT_LIMIT.toLocaleString()} pageviews/m are free. No credit card required.
          </p>
        </div>
        <div className="relative w-full max-w-[1300px] mb-10 px-4">
          {/* Background gradients - overlapping circles for organic feel */}
          <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-emerald-500/30 dark:bg-emerald-500/40 rounded-full blur-[80px] opacity-80 dark:opacity-70"></div>
          <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-600/20 dark:bg-emerald-600/30 rounded-full blur-[70px] opacity-60 dark:opacity-50"></div>

          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/30 dark:bg-blue-500/40 rounded-full blur-[80px] opacity-70 dark:opacity-60"></div>
          <div className="absolute bottom-40 right-20 w-[350px] h-[350px] bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full blur-[75px] opacity-60 dark:opacity-50"></div>

          <div className="absolute top-1/4 right-0 w-[320px] h-[320px] bg-purple-500/30 dark:bg-purple-500/40 rounded-full blur-[70px] opacity-60 dark:opacity-50"></div>
          <div className="absolute top-1/3 right-20 w-[250px] h-[250px] bg-violet-500/20 dark:bg-violet-500/30 rounded-full blur-[65px] opacity-50 dark:opacity-40"></div>

          <div className="absolute bottom-1/3 left-0 w-[320px] h-[320px] bg-emerald-400/20 dark:bg-emerald-400/30 rounded-full blur-[70px] opacity-70 dark:opacity-60"></div>
          <div className="absolute bottom-1/4 left-20 w-[240px] h-[240px] bg-teal-400/15 dark:bg-teal-400/25 rounded-full blur-[65px] opacity-60 dark:opacity-50"></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-400/20 dark:bg-indigo-400/30 rounded-full blur-[80px] opacity-60 dark:opacity-50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/3 -translate-y-1/3 w-[350px] h-[350px] bg-sky-400/15 dark:bg-sky-400/20 rounded-full blur-[75px] opacity-50 dark:opacity-40"></div>

          {/* Iframe container with responsive visibility */}
          <div className="relative z-10 rounded-2xl overflow-hidden bg-neutral-400/10 dark:bg-neutral-100/5 border-8 shadow-2xl shadow-neutral-900/20 dark:shadow-emerald-900/10">
            {/* Remove mobile message and show iframe on all devices */}
            <iframe
              src="https://demo.rybbit.com/1/main"
              width="1300"
              height="750"
              className="w-full h-[600px] md:h-[700px] lg:h-[750px] rounded-xl"
              style={{ border: "none" }}
              title="Rybbit Analytics Demo"
            ></iframe>
          </div>
        </div>

        {/* Logo Section */}
        <section className="py-12 md:py-16 w-full">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-10 md:mb-12">
              <p className="text-neutral-500 dark:text-neutral-400 text-sm uppercase tracking-wider font-medium">
                Trusted by 4,000+ organizations worldwide
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/tencent.svg"
                  alt="Tencent"
                  width={130}
                  height={40}
                  className="opacity-50 hover:opacity-80 dark:opacity-70 dark:hover:opacity-100 transition-opacity dark:invert grayscale"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/convex.svg"
                  alt="Convex"
                  width={120}
                  height={40}
                  className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0 dark:grayscale-0"
                />
              </div>
              <div className="flex items-center justify-center">
                <Link href="https://onyx.app" target="_blank">
                  <Image
                    src="/logos/onyx.webp"
                    alt="Onyx"
                    width={100}
                    height={40}
                    className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert"
                  />
                </Link>
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/vanguard.webp"
                  alt="Vanguard"
                  width={120}
                  height={40}
                  className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/ustwo.svg"
                  alt="ustwo"
                  width={100}
                  height={40}
                  className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert"
                />
              </div>
              {/* <div className="flex items-center justify-center">
                <Image
                  src="/logos/strawpoll.svg"
                  alt="StrawPoll"
                  width={120}
                  height={40}
                  className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert"
                />
              </div> */}
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/mydramalist.png"
                  alt="MyDramaList"
                  width={120}
                  height={40}
                  className="opacity-50 hover:opacity-80 dark:opacity-60 dark:hover:opacity-100 transition-opacity invert dark:invert-0"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/dtelecom.svg"
                  alt="DTelecom"
                  width={120}
                  height={40}
                  className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0"
                />
              </div>

              <div className="flex items-center justify-center">
                <Link href="https://dpm.lol" target="_blank">
                  <Image
                    src="/logos/dpm.webp"
                    alt="DPM.lol"
                    width={120}
                    height={40}
                    className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="py-14 md:py-20 w-full max-w-6xl px-8">
          {/* <div className="bg-neutral-900/30 backdrop-blur-sm border border-neutral-800/50 rounded-2xl p-4 md:p-8"> */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 dark:from-emerald-500/20 dark:to-emerald-600/10 border border-emerald-500/40 dark:border-emerald-500/30 shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-medium tracking-tight">{feature.title}</h3>
                  <p className="text-neutral-600 dark:text-neutral-300 text-base">{feature.description}</p>
                </div>
              );
            })}
          </div>
          {/* </div> */}
        </section>

        <section className="py-14 md:py-20 w-full max-w-6xl px-4">
          <div className="text-center mb-10 md:mb-16">
            <SectionBadge className="mb-4"> Analytics Reimagined</SectionBadge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Features</h2>
            <p className="mt-4 text-base md:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto font-light">
              Everything you need to understand your audience and grow your business, without the complexity.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <RealTimeAnalytics />
            <SessionReplay />
            <UserSessions />
            <Funnels />
          </div>
        </section>

        {/* Real-Time Globe Section */}
        <section className="py-14 md:py-20 w-full max-w-6xl">
          <div className="text-center mb-10 md:mb-16 px-4">
            <SectionBadge className="mb-4">Real-Time Insights</SectionBadge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">See Your Users Around the World</h2>
            <p className="mt-4 text-base md:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto font-light">
              Watch real-time visitor activity across the globe. Every dot represents a real user exploring your site
              right now.
            </p>
          </div>
          <div className="relative h-[420px] md:h-[700px] max-w-[100vw] mx-auto rounded-2xl">
            <SpinningGlobe />
          </div>
        </section>

        <Integrations />
        {/* Testimonial Section */}
        <section className="py-10 md:py-16 w-full">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10 md:mb-16">
              <SectionBadge className="mb-4">User Testimonials</SectionBadge>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">People love Rybbit</h2>
              <p className="mt-4 text-base md:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto font-light">
                See what others think about Rybbit Analytics
              </p>
            </div>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
              <TweetCard id="1934145508999877089" className="break-inside-avoid mb-4" />
              <TweetCard id="1920470706761929048" className="break-inside-avoid mb-4" />
              <TweetCard id="1921928423284629758" className="break-inside-avoid mb-4" />
              <TweetCard id="1920899082253434950" className="break-inside-avoid mb-4" />
              <TweetCard id="1982378431166963982" className="break-inside-avoid mb-4" />
              <TweetCard id="1927817460993884321" className="break-inside-avoid mb-4" />
              {/* <TweetCard id="1971933281324355679" className="break-inside-avoid mb-4" /> */}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <PricingSection />

        {/* FAQ Section */}
        <section className="py-16 md:py-24 w-full">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <SectionBadge className="mb-4">Common Questions</SectionBadge>
              <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
              <p className="mt-4 text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto font-light">
                Everything you need to know about Rybbit Analytics
              </p>
            </div>

            <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="md:text-lg">Is Rybbit GDPR and CCPA compliant?</AccordionTrigger>
                  <AccordionContent>
                    Yes, Rybbit is fully compliant with GDPR, CCPA, and other privacy regulations. We don&apos;t use
                    cookies or collect any personal data that could identify your users. We salt user IDs daily to
                    ensure users are not fingerprinted. You will not need to display a cookie consent banner to your
                    users.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger className="md:text-lg">Rybbit vs. Google Analytics</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Google Analytics is free because Google uses it as a funnel into their ecosystem and to sell ads.
                      Rybbit&apos;s only goal is to provide you with high quality analytics. No more confusing
                      dashboards pushing random AI features nobody wants.
                    </p>
                    <br />
                    <p>
                      You can see for yourself by checking out our{" "}
                      <Link
                        href="https://demo.rybbit.com/1"
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
                      >
                        demo site
                      </Link>
                      . The difference in usability is night and day.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger className="md:text-lg">Rybbit vs. Plausible/Umami/Fathom</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Rybbit is similar to these simple and privacy-focused analytics platforms, but we are raising the
                      bar when it comes to UX and the quality and scope of our feature set.
                    </p>
                    <br />
                    <p>
                      We don&apos;t want to just be a simple analytics tool, but we carefully craft every feature to be
                      understandable without having to read pages of documentation.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger className="md:text-lg">Rybbit vs. Posthog/Mixpanel/Amplitude</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Rybbit has most of the features of enterprise analytics platforms, but packaged in a way that is
                      usable for small and medium sized teams.
                    </p>
                    <br />
                    <p>
                      We have advanced features like session replay, error tracking, web vitals, and funnels - but you
                      don&apos;t need to spend days learning how to use them.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger className="md:text-lg">Can I self-host Rybbit?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely! Rybbit is available as a self-hosted option. You can install it on your own server and
                    have complete control over your data.{" "}
                    <Link
                      href="/docs/self-hosting"
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
                    >
                      Learn more here
                    </Link>
                    . We also offer a cloud version if you prefer a managed solution.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger className="md:text-lg">How easy is it to set up Rybbit?</AccordionTrigger>
                  <AccordionContent>
                    <Link
                      href="/docs/script"
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
                    >
                      Setting up Rybbit
                    </Link>{" "}
                    is incredibly simple. Just add a small script to your website or install @rybbit/js from npm, and
                    you&apos;re good to go. Most users are up and running in less than 5 minutes. We also provide
                    comprehensive documentation and support if you need any help.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger className="md:text-lg">What platforms does Rybbit support?</AccordionTrigger>
                  <AccordionContent>
                    Rybbit works with virtually any website platform. Whether you&apos;re using WordPress, Shopify,
                    Next.js, React, Vue, or any other framework, our simple tracking snippet integrates seamlessly. You
                    can also use @rybbit/js, our web SDK you can install from npm. Check out our{" "}
                    <Link
                      href="/docs"
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
                    >
                      documentation
                    </Link>{" "}
                    for setup guides.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-8">
                  <AccordionTrigger className="md:text-lg">Is Rybbit open source?</AccordionTrigger>
                  <AccordionContent>
                    Yes, Rybbit is open source under the AGPL v3.0 license. You are free to{" "}
                    <Link
                      href="/docs/self-hosting"
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
                    >
                      self-host Rybbit
                    </Link>{" "}
                    for either personal or business use.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-9">
                  <AccordionTrigger className="md:text-lg">Can I invite my team to my organization?</AccordionTrigger>
                  <AccordionContent>
                    Yes, you can invite unlimited team members to your organization. Each member can have different
                    permission levels to view or manage your analytics dashboards.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-10">
                  <AccordionTrigger className="md:text-lg">Can I share my dashboard publicly?</AccordionTrigger>
                  <AccordionContent>
                    Yes, you can share your dashboard publicly in two ways: with a secret link that only people with the
                    URL can access, or as a completely public dashboard that anyone can view.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-11">
                  <AccordionTrigger className="md:text-lg">Does Rybbit have an API?</AccordionTrigger>
                  <AccordionContent>
                    Yes, Rybbit provides a comprehensive{" "}
                    <Link
                      href="/docs/api/getting-started"
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
                    >
                      API
                    </Link>{" "}
                    that allows you to programmatically access your analytics data. You can integrate Rybbit data into
                    your own applications, dashboards, or workflows.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* add CTA section here */}
        <section className="py-12 md:py-20 w-full bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-950">
          <div className="max-w-7xl mx-auto px-4">
            <div className="relative p-6 md:p-12 flex flex-col items-center justify-center text-center">
              <div className="mb-6 md:mb-8">
                <Image src="/rybbit-text.svg" alt="Rybbit" width={150} height={27} className="dark:invert-0 invert" />
              </div>
              <h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6">
                It&apos;s time to switch to analytics that&apos;s made for you
              </h2>
              <p className="text-base md:text-xl text-neutral-600 dark:text-neutral-300 mb-6 md:mb-10 max-w-3xl mx-auto font-light">
                The first {DEFAULT_EVENT_LIMIT.toLocaleString()} pageviews a month are free
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-6 md:mb-8 w-full sm:w-auto">
                <TrackedButton
                  href="https://app.rybbit.io/signup"
                  eventName="signup"
                  eventProps={{ location: "bottom_cta", button_text: "Get started" }}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-medium px-6 md:px-8 py-3 md:py-4 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
                >
                  Get started
                </TrackedButton>
              </div>

              <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm flex items-center justify-center gap-2">
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                No credit card required
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
