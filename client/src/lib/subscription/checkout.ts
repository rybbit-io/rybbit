import { BACKEND_URL } from "../const";

/**
 * Creates an embedded Stripe Checkout session for an organization and returns its client
 * secret. Stripe sends the customer back to `returnPath` with the session id appended.
 */
export async function createCheckoutSession({
  priceId,
  organizationId,
  returnPath,
}: {
  priceId: string;
  organizationId: string;
  returnPath: string;
}): Promise<string> {
  const separator = returnPath.includes("?") ? "&" : "?";
  const response = await fetch(`${BACKEND_URL}/stripe/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      priceId,
      returnUrl: `${window.location.origin}${returnPath}${separator}session_id={CHECKOUT_SESSION_ID}`,
      organizationId,
      referral: window.Rewardful?.referral || undefined,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to create checkout session");
  }
  if (!data.clientSecret) {
    throw new Error("Checkout session not received");
  }
  return data.clientSecret;
}
