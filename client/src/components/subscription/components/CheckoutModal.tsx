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
      {/* pt-10 clears the close button so it never sits on top of the Stripe iframe. */}
      <DialogContent className="max-h-[90vh] max-w-[1000px] overflow-y-auto pt-10">
        <EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </DialogContent>
    </Dialog>
  );
}
