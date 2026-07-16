import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey
  ? new Stripe(secretKey, {
      typescript: true, // Enable TypeScript support
      // Automatically retry requests that fail with a 429 (rate limit) or transient
      // network/5xx error using Stripe's built-in exponential backoff with jitter.
      maxNetworkRetries: 3,
    })
  : null;
