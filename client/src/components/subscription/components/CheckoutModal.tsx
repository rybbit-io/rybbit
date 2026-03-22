"use client";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/const";

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface CheckoutModalProps {
  clientSecret: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutModal({ clientSecret, open, onOpenChange }: CheckoutModalProps) {
  if (!clientSecret) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-[1000px] py-8 px-0 overflow-hidden rounded-3xl bg-[#1a1a1a] dark:bg-[#1a1a1a] border-neutral-800 dark:border-neutral-800">
        <EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </DialogContent>
    </Dialog>
  );
}
