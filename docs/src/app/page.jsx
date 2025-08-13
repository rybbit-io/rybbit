import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tilt_Warp } from "next/font/google";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { GitHubStarButton } from "@/components/GitHubStarButton";
import { AdvancedFilters } from "./components/Cards/AdvancedFilters";
import { EventTracking } from "./components/Cards/EventTracking";
import { Funnels } from "./components/Cards/Funnels";
import { GoalConversion } from "./components/Cards/GoalConversion";
import { RealTimeAnalytics } from "./components/Cards/RealTimeAnalytics";
import { UserBehaviorTrends } from "./components/Cards/UserBehaviorTrends";
import { UserFlowAnalysis } from "./components/Cards/UserFlowAnalysis";
import { UserProfiles } from "./components/Cards/UserProfiles";
import { UserSessions } from "./components/Cards/UserSessions";
import { SessionReplay } from "./components/Cards/SessionReplay";
import { WebVitals } from "./components/Cards/WebVitals";
import { Integrations } from "./components/integrations";
import { PricingSection } from "./pricing/components/PricingSection";
import { TweetCard } from "./components/Tweet";
import Image from "next/image";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export const metadata = {
  title: "Rybbit Analytics",
  description:
    "Next-gen, open source, lightweight, cookieless web & product analytics for everyone — GDPR/CCPA compliant.",
};

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

export default function IndexPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="flex flex-col items-center justify-center overflow-x-hidden pt-16 md:pt-24">
        <GitHubStarButton />

        <h1
          className={cn(
            "text-4xl md:text-5xl lg:text-7xl font-semibold  px-4 tracking-tight max-w-4xl text-center text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400",
            tilt_wrap.className
          )}
        >
          The Open Source Google Analytics Replacement
        </h1>
        <h2 className="text-lg md:text-2xl pt-4 md:pt-6 px-4 tracking-tight max-w-4xl text-center text-neutral-300">
          Next-gen, open source, lightweight, cookieless web & product analytics for everyone.
        </h2>

        <div className="flex flex-col items-center my-8 md:my-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg px-4">
            <Link
              href="https://app.rybbit.io/signup"
              className="w-full sm:w-auto"
              data-rybbit-event="signup"
              data-rybbit-prop-location="hero"
            >
              <button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer">
                Track your site
              </button>
            </Link>
            <Link href="https://demo.rybbit.io/21" className="w-full sm:w-auto" data-rybbit-event="demo">
              <button className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-5 py-3 rounded-lg border border-neutral-600 transform hover:-translate-y-0.5 transition-all duration-200 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer">
                See live demo
              </button>
            </Link>
          </div>
          <p className="text-neutral-400 text-xs md:text-sm flex items-center justify-center gap-2 mt-6">
            <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
            First 10,000 events/m are free. No credit card required.
          </p>
        </div>

        <div className="relative w-full max-w-[1300px] mb-10 px-4">
          {/* Background gradients - overlapping circles for organic feel */}
          <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-emerald-500/40 rounded-full blur-[80px] opacity-70"></div>
          <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-600/30 rounded-full blur-[70px] opacity-50"></div>

          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/40 rounded-full blur-[80px] opacity-60"></div>
          <div className="absolute bottom-40 right-20 w-[350px] h-[350px] bg-indigo-500/30 rounded-full blur-[75px] opacity-50"></div>

          <div className="absolute top-1/4 right-0 w-[320px] h-[320px] bg-purple-500/40 rounded-full blur-[70px] opacity-50"></div>
          <div className="absolute top-1/3 right-20 w-[250px] h-[250px] bg-violet-500/30 rounded-full blur-[65px] opacity-40"></div>

          <div className="absolute bottom-1/3 left-0 w-[320px] h-[320px] bg-emerald-400/30 rounded-full blur-[70px] opacity-60"></div>
          <div className="absolute bottom-1/4 left-20 w-[240px] h-[240px] bg-teal-400/25 rounded-full blur-[65px] opacity-50"></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-400/30 rounded-full blur-[80px] opacity-50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/3 -translate-y-1/3 w-[350px] h-[350px] bg-sky-400/20 rounded-full blur-[75px] opacity-40"></div>

          {/* Iframe container with responsive visibility */}
          <div className="relative z-10 rounded-lg overflow-hidden border-8 border-neutral-100/5 shadow-2xl shadow-emerald-900/10">
            {/* Remove mobile message and show iframe on all devices */}
            <iframe
              src="https://demo.rybbit.io/21"
              width="1300"
              height="750"
              className="w-full h-[600px] md:h-[700px] lg:h-[750px]"
              style={{ border: "none" }}
              title="Rybbit Analytics Demo"
            ></iframe>
          </div>
        </div>

        {/* Logo Section */}
        <section className="py-12 md:py-16 w-full">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-10 md:mb-12">
              <p className="text-neutral-400 text-sm uppercase tracking-wider font-medium">
                Trusted by 2000+ companies worldwide
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/vanguard.webp"
                  alt="Vanguard"
                  width={120}
                  height={40}
                  className="opacity-60 hover:opacity-100 transition-opacity invert"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/ustwo.svg"
                  alt="ustwo"
                  width={100}
                  height={40}
                  className="opacity-60 hover:opacity-100 transition-opacity invert"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/tilaa.svg"
                  alt="Tilaa"
                  width={100}
                  height={40}
                  className="opacity-60 hover:opacity-100 transition-opacity invert"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/strawpoll.svg"
                  alt="StrawPoll"
                  width={120}
                  height={40}
                  className="opacity-60 hover:opacity-100 transition-opacity invert"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/mydramalist.png"
                  alt="MyDramaList"
                  width={120}
                  height={40}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/dtelecom.svg"
                  alt="DTelecom"
                  width={100}
                  height={40}
                  className="opacity-60 hover:opacity-100 transition-opacity grayscale"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/onyx.webp"
                  alt="Onyx"
                  width={100}
                  height={40}
                  className="opacity-60 hover:opacity-100 transition-opacity invert"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/logos/apc.webp"
                  alt="Apc"
                  width={90}
                  height={30}
                  className="opacity-60 hover:opacity-100 transition-opacity invert grayscale"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20 w-full max-w-7xl px-4">
          <div className="text-center mb-10 md:mb-16">
            <div className="inline-block bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
              Analytics Reimagined
            </div>

            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Features</h2>
            <p className="mt-4 text-base md:text-xl text-neutral-300 max-w-2xl mx-auto">
              Everything you need to understand your audience and grow your business, without the complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {/* <Funnels /> */}
            {/* <AdvancedFilters /> */}

            <RealTimeAnalytics />
            <SessionReplay />
            <WebVitals />
            <UserProfiles />
            <UserSessions />
            <UserFlowAnalysis />

            <UserBehaviorTrends />
            <EventTracking />
            <GoalConversion />
          </div>
        </section>

        <Integrations />

        {/* Testimonial Section */}
        <section className="py-10 md:py-16 w-full">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10 md:mb-16">
              <div className="inline-block bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
                User Testimonials
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">People love Rybbit</h2>
              <p className="mt-4 text-base md:text-xl text-neutral-300 max-w-2xl mx-auto">
                See what others think about Rybbit Analytics
              </p>
            </div>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
              <TweetCard id="1934145508999877089" className="break-inside-avoid mb-4" />
              <TweetCard id="1920470706761929048" className="break-inside-avoid mb-4" />
              <TweetCard id="1919290867451404670" className="break-inside-avoid mb-4" />
              <TweetCard id="1927817460993884321" className="break-inside-avoid mb-4" />

              <TweetCard id="1921928423284629758" className="break-inside-avoid mb-4" />
              <TweetCard id="1920318739335033226" className="break-inside-avoid mb-4" />
              <TweetCard id="1920425974954381456" className="break-inside-avoid mb-4" />

              {/* <TweetCard
                id="1921878010417848443"
                className="break-inside-avoid mb-4"
              /> */}
              <TweetCard id="1920899082253434950" className="break-inside-avoid mb-4" />
              <TweetCard id="1920379817113088341" className="break-inside-avoid mb-4" />
              <TweetCard id="1919793785384386576" className="break-inside-avoid mb-4" />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <PricingSection />

        {/* FAQ Section */}
        <section className="py-16 md:py-24 w-full">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-block bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
                Common Questions
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
              <p className="mt-4 text-neutral-300 max-w-2xl mx-auto">
                Everything you need to know about Rybbit Analytics
              </p>
            </div>

            <div className="bg-neutral-800/20 backdrop-blur-sm border border-neutral-700 rounded-xl overflow-hidden">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-b border-neutral-700/50">
                  <AccordionTrigger className="px-6 py-4 text-base md:text-lg font-medium hover:text-emerald-400 transition-colors">
                    Is Rybbit GDPR and CCPA compliant?
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-neutral-300">
                    Yes, Rybbit is fully compliant with GDPR, CCPA, and other privacy regulations. We don't use cookies
                    or collect any personal data that could identify your users. We salt user IDs daily to ensure users
                    are not fingerprinted. You will not need to display a cookie consent banner to your users.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-b border-neutral-700/50">
                  <AccordionTrigger className="px-6 py-4 text-base md:text-lg font-medium hover:text-emerald-400 transition-colors">
                    Rybbit vs. Google Analytics
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-neutral-300">
                    <p>
                      Google Analytics is free because Google uses it as a funnel into their ecosystem and to sell ads.
                      Rybbit's only goal is to provide you with high quality analytics. No more confusing dashboards
                      pushing random AI features nobody wants.
                    </p>
                    <br />
                    <p>
                      You can see for yourself by checking out our{" "}
                      <Link href="https://demo.rybbit.io/21" className="text-emerald-400 hover:text-emerald-300">
                        demo site
                      </Link>
                      . The difference in usability is night and day.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-b border-neutral-700/50">
                  <AccordionTrigger className="px-6 py-4 text-base md:text-lg font-medium hover:text-emerald-400 transition-colors">
                    Rybbit vs. Plausible/Umami/Simple Analytics
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-neutral-300">
                    <p>
                      Rybbit is similar to these simple and privacy-focused analytics platforms, but we are raising the
                      bar when it comes to UX and the quality and scope of our feature set.
                    </p>
                    <br />
                    <p>
                      We don't want to just be a simple analytics tool, but we carefully craft every feature to be
                      understandable without having to read pages of documentation.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border-b border-neutral-700/50">
                  <AccordionTrigger className="px-6 py-4 text-base md:text-lg font-medium hover:text-emerald-400 transition-colors">
                    Rybbit vs. Posthog/Mixpanel/Amplitude
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-neutral-300">
                    <p>
                      Rybbit has most of the features of enterprise analytics platforms, but packaged in a way that is
                      usable for small and medium sized teams.
                    </p>
                    <br />
                    <p>
                      We have advanced features like session replay, error tracking, web vitals, and funnels - but you
                      don't need to spend days learning how to use them.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-b border-neutral-700/50">
                  <AccordionTrigger className="px-6 py-4 text-base md:text-lg font-medium hover:text-emerald-400 transition-colors">
                    Can I self-host Rybbit?
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-neutral-300">
                    Absolutely! Rybbit is available as a self-hosted option. You can install it on your own server and
                    have complete control over your data.{" "}
                    <Link href="/docs/self-hosting" className="text-emerald-400 hover:text-emerald-300">
                      Learn more here
                    </Link>
                    . We also offer a cloud version if you prefer a managed solution.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6" className="border-b border-neutral-700/50">
                  <AccordionTrigger className="px-6 py-4 text-base md:text-lg font-medium hover:text-emerald-400 transition-colors">
                    How easy is it to set up Rybbit?
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-neutral-300">
                    <Link href="/docs/script" className="text-emerald-400 hover:text-emerald-300">
                      Setting up Rybbit
                    </Link>{" "}
                    is incredibly simple. Just add a small script to your website or install @rybbit/js from npm, and
                    you're good to go. Most users are up and running in less than 5 minutes. We also provide
                    comprehensive documentation and support if you need any help.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger className="px-6 py-4 text-base md:text-lg font-medium hover:text-emerald-400 transition-colors">
                    What platforms does Rybbit support?
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-neutral-300">
                    Rybbit works with virtually any website platform. Whether you're using WordPress, Shopify, Next.js,
                    React, Vue, or any other framework, our simple tracking snippet integrates seamlessly. You can also
                    use @rybbit/js, our web SDK you can install from npm.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-8">
                  <AccordionTrigger className="px-6 py-4 text-base md:text-lg font-medium hover:text-emerald-400 transition-colors">
                    Is Rybbit open source?
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-neutral-300">
                    Yes, Rybbit is open source under the AGPL v3.0 license. You are free to{" "}
                    <Link href="/docs/self-hosting" className="text-emerald-400 hover:text-emerald-300">
                      self-host Rybbit
                    </Link>{" "}
                    for either personal or business use.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-9" className="border-t border-neutral-700/50">
                  <AccordionTrigger className="px-6 py-4 text-base md:text-lg font-medium hover:text-emerald-400 transition-colors">
                    What counts as an event?
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-neutral-300">
                    An event is either a pageview or a custom event that you create on your website. Pageviews are
                    tracked automatically, while custom events can be defined to track specific user interactions.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* add CTA section here */}
        <section className="py-12 md:py-20 w-full bg-gradient-to-b from-neutral-900 to-neutral-950">
          <div className="max-w-7xl mx-auto px-4">
            <div className="relative p-6 md:p-12 flex flex-col items-center justify-center text-center">
              <div className="mb-6 md:mb-8">
                <Image src="/rybbit-text.svg" alt="Rybbit" width={150} height={27} />
              </div>
              <h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6">
                It's time to switch to analytics that's made for you
              </h2>
              <p className="text-base md:text-xl text-neutral-300 mb-6 md:mb-10 max-w-3xl mx-auto">
                The first 10,000 events a month are free
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-6 md:mb-8 w-full sm:w-auto">
                <Link href="https://app.rybbit.io/signup" className="w-full sm:w-auto">
                  <button
                    data-rybbit-event="signup"
                    data-rybbit-prop-location="bottom"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-medium px-6 md:px-8 py-3 md:py-4 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
                  >
                    Track your site for free
                  </button>
                </Link>
                {/* <Link href="https://docs.tomato.gg" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 md:px-8 py-3 md:py-4 rounded-lg border border-neutral-600 transform hover:-translate-y-0.5 transition-all duration-200 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50">
                    View Documentation
                  </button>
                </Link> */}
              </div>

              <p className="text-neutral-400 text-xs md:text-sm flex items-center justify-center gap-2">
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
