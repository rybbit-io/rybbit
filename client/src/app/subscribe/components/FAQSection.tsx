import React from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What counts as an event?",
    answer:
      "An event is either a pageview or a custom event that you create on your website. Pageviews are tracked automatically, while custom events can be defined to track specific user interactions.",
  },
  {
    question: "Can I change my plan later?",
    answer: "Absolutely. You can upgrade, downgrade, or cancel your plan at any time through your account settings.",
  },
  {
    question: "What happens if I go over my event limit?",
    answer:
      "We'll notify you when you're approaching your limit. You can either upgrade to a higher plan or continue with your current plan (events beyond the limit won't be tracked).",
  },
];

export function FAQSection() {
  return (
    <div className="mt-10 space-y-6">
      <h3 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">Frequently Asked Questions</h3>

      {FAQ_ITEMS.map((faq, index) => (
        <div key={index} className="bg-neutral-50 dark:bg-neutral-800/20 p-5 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h4 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">{faq.question}</h4>
          <p className="text-neutral-600 dark:text-neutral-300">{faq.answer}</p>
        </div>
      ))}
    </div>
  );
}
