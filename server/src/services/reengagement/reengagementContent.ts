export interface ReengagementContent {
  day: number;
  subject: string;
  title: string;
  message: string;
  ctaText: string;
}

export const REENGAGEMENT_EMAILS: Record<number, ReengagementContent> = {
  3: {
    day: 3,
    subject: "Need help getting started with Rybbit?",
    title: "We noticed you haven't added your tracking script yet",
    message:
      "It looks like we haven't received any data from {domain} yet. Adding Rybbit is quick and easy - just one line of code. If you're running into any issues or have questions, just reply to this email and we'll help you get set up.",
    ctaText: "Go to Dashboard",
  },
  7: {
    day: 7,
    subject: "Your Rybbit analytics are waiting",
    title: "It's been a week - let's get you started",
    message:
      "You signed up for Rybbit a week ago but we still haven't received any analytics data for {domain}. We'd hate for you to miss out on understanding your website traffic. Need help with installation? Our setup takes less than 5 minutes.",
    ctaText: "Go to Dashboard",
  },
  14: {
    day: 14,
    subject: "Last chance: Start tracking your analytics",
    title: "We're here to help",
    message:
      "It's been two weeks since you signed up and we haven't seen any data from {domain}. If you're having trouble with the setup or if Rybbit isn't the right fit, we'd love to know. Reply to this email and let us know how we can help.",
    ctaText: "Go to Dashboard",
  },
};
