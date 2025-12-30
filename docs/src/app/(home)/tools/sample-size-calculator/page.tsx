import { Metadata } from "next";
import Link from "next/link";
import { SampleSizeForm } from "./SampleSizeForm";
import { ToolPageLayout } from "../components/ToolPageLayout";

export const metadata: Metadata = {
  title: "Free Sample Size Calculator | A/B Test Sample Size Calculator for Marketing",
  description:
    "Calculate the sample size needed for statistically significant A/B test results. Determine confidence levels, statistical power, and minimum detectable effect. Never run underpowered tests again with our free A/B testing calculator.",
  openGraph: {
    title: "Free Sample Size Calculator | A/B Test Sample Size Calculator",
    description:
      "Calculate how many visitors you need for statistically significant A/B test results. Get accurate sample size calculations with confidence levels and statistical power.",
    type: "website",
    url: "https://rybbit.com/tools/sample-size-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Sample Size Calculator for A/B Tests",
    description:
      "Calculate sample size needed for statistically significant A/B test results. Determine confidence levels and statistical power.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/sample-size-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "A/B Test Sample Size Calculator",
      applicationCategory: "Statistics Tool",
      description: "Free tool to calculate the sample size needed for statistically significant A/B testing results",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Accurate sample size calculation",
        "Configurable confidence levels (90%, 95%, 99%)",
        "Adjustable statistical power (80%, 90%)",
        "Minimum detectable effect customization",
        "Test duration estimation",
        "Real-time results visualization",
      ],
      operatingSystem: "Any",
      url: "https://rybbit.com/tools/sample-size-calculator",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is sample size in A/B testing?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sample size is the number of visitors or observations required in each test variant (control and treatment) to reach statistical significance. It's calculated based on your baseline conversion rate, the minimum detectable effect (smallest improvement you want to reliably detect), the confidence level (how certain you want to be), and statistical power (probability of detecting the effect if it exists). Proper sample size ensures your A/B test results are reliable and not due to random chance.",
          },
        },
        {
          "@type": "Question",
          name: "Why does minimum detectable effect matter?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Minimum detectable effect (MDE) defines the smallest improvement you want to detect in your A/B test. For example, a 0.5% improvement in conversion rate or a 2% improvement. Smaller MDEs require much larger sample sizes because you need more data to distinguish tiny differences from random variation. A 0.1% improvement might need 10x more visitors than a 1% improvement. Setting realistic MDEs based on business impact helps you balance statistical rigor with practical feasibility.",
          },
        },
        {
          "@type": "Question",
          name: "What is statistical significance and why does it matter for A/B tests?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Statistical significance measures whether the difference between your control and treatment variants is real or just due to random chance. A statistically significant result typically means there's less than a 5% probability (at 95% confidence) that the difference occurred by chance alone. Without sufficient sample size, you might see a 'winning' variant that's actually just lucky variation. Reaching statistical significance requires hitting the calculated sample size, which is why you shouldn't stop A/B tests early even if you see early winners.",
          },
        },
        {
          "@type": "Question",
          name: "What is the difference between confidence level and statistical power?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Confidence level (often 95%) measures the risk of Type I error - claiming a difference exists when it doesn't (false positive). A 95% confidence level means you accept a 5% chance of false positives. Statistical power (typically 80%) measures the risk of Type II error - missing a real difference when it exists (false negative). An 80% power means you have a 20% chance of missing a real effect if it exists. Both matter: 95% confidence and 80% power are standard in A/B testing as they balance risk appropriately.",
          },
        },
        {
          "@type": "Question",
          name: "How long should I run my A/B test?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Run your A/B test until you've reached the calculated sample size, regardless of what the results look like mid-test. The duration depends on your daily visitor volume. If you need 10,000 visitors total and get 1,000/day, you'll need about 10 days. At 5,000/day, that's 2 days. Running tests longer than needed wastes resources, but stopping early risks false positives - you might declare a 'winner' that's just random luck. Use analytics to track progress toward your sample size goal.",
          },
        },
        {
          "@type": "Question",
          name: "What baseline conversion rate should I use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Your baseline conversion rate is your current control variant's conversion rate. If you're testing a website redesign and currently 2.5% of visitors convert, use 2.5% as your baseline. You can get this from your analytics tools (Google Analytics, Rybbit Analytics, etc.). Use your most recent data that's representative of normal traffic. Seasonal variations and traffic changes can affect your baseline, so update it if conditions change significantly. More accurate baselines lead to more realistic sample size calculations.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What Is Sample Size?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Sample size is the number of visitors or observations needed in each variant (control and treatment) of your A/B
      test to achieve statistical significance. It's a critical calculation that determines whether your test results
      are reliable or just due to random chance.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Without proper sample size, you risk two costly mistakes: (1) declaring a "winning" variant that's actually just
      lucky variation (Type I error), or (2) missing a real improvement because you didn't collect enough data (Type II
      error). The correct sample size balances these risks based on your specific test parameters.
    </p>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">
      Why Sample Size Matters for A/B Tests
    </h2>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Avoid False Positives:</strong> Adequate sample size reduces the risk of declaring a winner when the
        difference is just random fluctuation. At 95% confidence, you accept only a 5% chance of being wrong.
      </li>
      <li>
        <strong>Detect Real Improvements:</strong> Proper power (typically 80%) ensures you have a high probability of
        catching real improvements when they exist, avoiding missed opportunities.
      </li>
      <li>
        <strong>Business Confidence:</strong> Statistically significant results give you confidence to implement changes
        with real revenue impact, rather than relying on gut feeling.
      </li>
      <li>
        <strong>Efficient Resource Allocation:</strong> Knowing your sample size upfront prevents wasting time and
        resources running tests longer than needed or stopping early out of impatience.
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">
      Understanding Statistical Significance
    </h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Statistical significance answers the question: "Is this result real, or just random chance?" A result is
      statistically significant when the probability of observing it by chance alone (if there were truly no difference)
      is very small - typically less than 5%.
    </p>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>P-Value:</strong> The p-value is the probability of seeing your results if there's actually no
        difference. A p-value of 0.03 (3%) means there's only a 3% chance this difference occurred randomly. With 95%
        confidence, you need p &lt; 0.05.
      </li>
      <li>
        <strong>Confidence Interval:</strong> A 95% confidence interval around your observed effect means if you
        repeated the test 100 times, the true effect would fall within this range 95 times. Wider intervals indicate
        less certainty; narrower ones indicate more precision.
      </li>
      <li>
        <strong>Statistical vs. Practical Significance:</strong> A result can be statistically significant (real
        difference exists) but practically insignificant (too small to matter). Conversely, a practically significant
        result might not reach statistical significance without enough data. Both matter for good business decisions.
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">
      Confidence Levels and Statistical Power
    </h2>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">
      Confidence Level (Type I Error Protection)
    </h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>90% - 10% false positive risk:</strong> More lenient, detects effects with fewer visitors. Use when
        speed matters and you can tolerate higher false positive risk.
      </li>
      <li>
        <strong>95% - 5% false positive risk:</strong> Industry standard. Recommended for most A/B tests. Provides good
        balance between safety and efficiency.
      </li>
      <li>
        <strong>99% - 1% false positive risk:</strong> Very strict, requires more visitors. Use only when false
        positives are extremely costly.
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">
      Statistical Power (Type II Error Protection)
    </h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>80% - 20% false negative risk:</strong> Standard in A/B testing. Recommended for most tests. Good
        balance of detecting real effects while managing sample size.
      </li>
      <li>
        <strong>90% - 10% false negative risk:</strong> More strict, requires more visitors. Use when missing
        improvements is very costly.
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Minimum Detectable Effect (MDE)</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Minimum detectable effect is the smallest change in conversion rate (or other metric) that your test is powered to
      detect reliably. It's expressed as an absolute percentage point change.
    </p>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>0.1% MDE:</strong> 2.5% → 2.6% conversion - Very large sample size (hundreds of thousands)
      </li>
      <li>
        <strong>0.5% MDE:</strong> 2.5% → 3.0% conversion - Large sample size (tens of thousands)
      </li>
      <li>
        <strong>1.0% MDE:</strong> 2.5% → 3.5% conversion - Moderate sample size (thousands)
      </li>
      <li>
        <strong>5.0% MDE:</strong> 2.5% → 7.5% conversion - Small sample size (hundreds)
      </li>
    </ul>
    <p className="text-neutral-700 dark:text-neutral-300 mb-6">
      Smaller MDEs require exponentially larger sample sizes. Define your MDE based on business impact: what's the
      smallest improvement worth implementing? If a 0.5% improvement would save $100K/year, that's worth detecting; if a
      0.1% improvement would only save $5K, you might not need to detect it.
    </p>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">How to Use This Calculator</h2>
    <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Enter Your Baseline Conversion Rate:</strong> Get this from your analytics (Google Analytics, Rybbit,
        etc.). If 100 visitors and 3 convert, your baseline is 3%. Use your most recent representative data.
      </li>
      <li>
        <strong>Define Your Minimum Detectable Effect:</strong> What's the smallest improvement worth detecting? If your
        baseline is 2%, a 0.5% MDE means you want to reliably detect moving to 2.5% or higher. Think about business
        impact, not just percentage points.
      </li>
      <li>
        <strong>Choose Your Confidence Level (Default: 95%):</strong> 95% is standard and recommended. This means you
        accept a 5% chance that your result is a false positive. Only use 90% if time is critical, or 99% if false
        positives are extremely costly.
      </li>
      <li>
        <strong>Select Your Statistical Power (Default: 80%):</strong> 80% power is standard, meaning you accept a 20%
        chance of missing a real improvement. Use 90% if missing improvements is very costly (requires larger sample
        size).
      </li>
      <li>
        <strong>Calculate and Plan Your Test:</strong> The calculator shows the required sample size per variant, total
        visitors needed, and estimated test duration. Use Rybbit Analytics to monitor progress and track when you reach
        statistical significance.
      </li>
    </ol>
  </>
);

const faqs = [
  {
    question: "What is sample size in A/B testing?",
    answer: (
      <>
        Sample size is the number of visitors needed in each test variant (control and treatment) to reach statistical
        significance. It's calculated based on your baseline conversion rate, the minimum detectable effect you want to
        find, your desired confidence level, and statistical power. Proper sample size ensures your A/B test results are
        reliable and not due to random chance.
      </>
    ),
  },
  {
    question: "Why does MDE matter for sample size?",
    answer: (
      <>
        Minimum detectable effect (MDE) defines the smallest improvement you want to reliably detect. Smaller MDEs
        require exponentially larger sample sizes. For example, detecting a 0.5% improvement might require 10 times more
        visitors than detecting a 5% improvement. Set your MDE based on business impact: what's the smallest improvement
        worth implementing? This helps balance statistical rigor with practical feasibility.
      </>
    ),
  },
  {
    question: "What is statistical significance and why does it matter?",
    answer: (
      <>
        Statistical significance means the difference between your variants is real and not just due to random chance.
        At 95% confidence, a statistically significant result means there's less than a 5% probability the difference
        occurred randomly. Without sufficient sample size, you might see a "winning" variant that's just lucky
        variation. Reaching calculated sample size is critical - don't stop tests early even if you see early winners.
      </>
    ),
  },
  {
    question: "What is the difference between confidence level and statistical power?",
    answer: (
      <>
        Confidence level (typically 95%) measures Type I error - the risk of claiming a difference exists when it
        doesn't (false positive). At 95% confidence, you accept a 5% chance of being wrong. Statistical power (typically
        80%) measures Type II error - the risk of missing a real difference when it exists (false negative). At 80%
        power, you have a 20% chance of missing a real effect. Both matter for reliable A/B testing.
      </>
    ),
  },
  {
    question: "How long should I run my A/B test?",
    answer: (
      <>
        Run your test until you reach the calculated sample size, even if you see apparent "winners" mid-test. Stopping
        early increases false positive risk. The duration depends on your daily visitor volume - if you need 10,000
        visitors and get 1,000/day, run it about 10 days. Use{" "}
        <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Rybbit Analytics
        </Link>{" "}
        to track progress and know when you reach statistical significance.
      </>
    ),
  },
  {
    question: "What baseline conversion rate should I use?",
    answer: (
      <>
        Your baseline is your current control variant's conversion rate. Get this from your analytics tools. If 2.5% of
        visitors currently convert, use 2.5%. Use your most recent representative data. Seasonal variations and traffic
        changes can affect your baseline, so update it if conditions change. More accurate baselines lead to more
        realistic sample size calculations and test planning.
      </>
    ),
  },
];

export default function SampleSizeCalculatorPage() {
  return (
    <ToolPageLayout
      toolSlug="sample-size-calculator"
      title="A/B Test Sample Size Calculator"
      description="Calculate how many visitors you need for statistically significant A/B test results. Never run underpowered tests again."
      badge="Free Tool"
      toolComponent={<SampleSizeForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Run better A/B tests with Rybbit"
      ctaDescription="Track conversions, variants, and statistical significance in real-time. Know exactly when you've reached statistical significance and avoid costly false positives."
      ctaEventLocation="sample_size_calculator_cta"
      structuredData={structuredData}
    />
  );
}
