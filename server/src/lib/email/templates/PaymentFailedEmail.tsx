import { DateTime } from "luxon";
import * as React from "react";
import { appUrl, formatDate } from "../format.js";
import { H1, HELP_URL, LedgerLayout, Note, P, PrimaryButton, Rows } from "./ledger.js";

/**
 * Sent to an organization's owners when a card charge for its subscription fails ("failed"),
 * and when Stripe gives up retrying and cancels a plan that had been paid for ("canceled").
 */
export type PaymentFailedStage = "failed" | "canceled";

export interface PaymentFailedEmailProps {
  stage: PaymentFailedStage;
  /** Owners of several organizations land on this one's billing page, not whichever is active. */
  organizationId: string;
  organizationName: string;
  /** What the failed charge was for, in the currency's smallest unit. Only on "failed". */
  amountDue?: number;
  currency?: string;
  /** When Stripe will try the card again, if it has scheduled another attempt. */
  nextAttemptAt?: Date | null;
  /**
   * Whether the organization's sites are still collecting: "on" while a paid plan's renewal is
   * retried and during the grace period after a trial, "paused" when the plan is off until the
   * charge goes through.
   */
  tracking?: "on" | "paused" | "unknown";
}

/** "$19.00", "€19.00", "¥1,900": Stripe amounts are in the currency's smallest unit. */
export const formatMoney = (amount: number, currency: string): string => {
  try {
    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() });
    return formatter.format(amount / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2));
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
};

const billingUrl = (organizationId: string) =>
  `${appUrl()}/settings/billing?organization=${encodeURIComponent(organizationId)}`;

export const paymentFailedSubject = ({ stage }: PaymentFailedEmailProps) =>
  stage === "canceled" ? "Your Rybbit plan was canceled" : "We couldn't charge your card for Rybbit";

const preview = ({ stage, tracking }: PaymentFailedEmailProps) => {
  if (stage === "canceled") return "The payment kept failing. Pick a plan to start tracking again.";
  if (tracking === "paused") return "Update your card to turn your plan back on.";
  return "Update your card and we'll charge it straight away.";
};

const Failed = ({
  organizationId,
  organizationName,
  amountDue,
  currency,
  nextAttemptAt,
  tracking = "unknown",
}: PaymentFailedEmailProps) => {
  const amount = amountDue != null && currency ? formatMoney(amountDue, currency) : null;
  return (
    <>
      <H1>We couldn't charge your card</H1>
      <P>
        {amount ? `The ${amount} payment` : "The payment"} for {organizationName} didn't go through. It's usually an
        expired card or the bank blocking the charge.
      </P>
      <Rows
        rows={[
          ...(amount ? [{ label: "Amount", value: amount }] : []),
          ...(nextAttemptAt
            ? [{ label: "Next try", value: formatDate(DateTime.fromJSDate(nextAttemptAt, { zone: "utc" })) }]
            : []),
          ...(tracking === "on" ? [{ label: "Tracking", value: "Still on" }] : []),
          ...(tracking === "paused" ? [{ label: "Plan", value: "On hold", strong: true }] : []),
        ]}
      />
      {tracking === "paused" && (
        <P top={24}>
          Your plan is on hold until the payment goes through, so your sites may not be collecting data right now.
        </P>
      )}
      {tracking === "on" && <P top={24}>Your sites are still being tracked while we retry.</P>}
      <P top={tracking === "unknown" ? 24 : 12}>Update your card and we'll charge it straight away.</P>
      <PrimaryButton label="Update card" href={billingUrl(organizationId)} />
    </>
  );
};

const Canceled = ({ organizationId, organizationName }: PaymentFailedEmailProps) => (
  <>
    <H1>Your plan was canceled because the payment kept failing</H1>
    <P>
      We tried the card on file for {organizationName} several times and couldn't charge it, so the plan has been
      canceled. Your data is still here.
    </P>
    <P>Pick a plan with a card that works and tracking starts again.</P>
    <PrimaryButton label="Choose a plan" href={billingUrl(organizationId)} />
  </>
);

export const PaymentFailedEmail = (props: PaymentFailedEmailProps) => (
  <LedgerLayout
    preview={preview(props)}
    footer={[
      { label: "Help", href: HELP_URL },
      { label: "Billing", href: billingUrl(props.organizationId) },
    ]}
  >
    {props.stage === "canceled" ? <Canceled {...props} /> : <Failed {...props} />}
    <Note>Questions? Just reply.</Note>
  </LedgerLayout>
);
