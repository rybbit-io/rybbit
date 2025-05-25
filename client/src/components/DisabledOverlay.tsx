import { ArrowRight, Crown } from "lucide-react";
import Link from "next/link";
import React, { ReactNode } from "react";
import { useStripeSubscription } from "../app/settings/subscription/utils/useStripeSubscription";
import { Button } from "./ui/button";

interface DisabledOverlayProps {
  children: ReactNode;
  message?: string;
  blur?: number;
  borderRadius?: number;
  showMessage?: boolean;
  style?: React.CSSProperties;
}

function defaultMessage(message: string) {
  return (
    <div className="bg-neutral-900 rounded-lg  border border-neutral-700 shadow-xl flex items-center gap-3 p-4">
      <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">
          Upgrade to <span className="font-medium text-foreground">Pro</span> to
          unlock {message}
        </p>
      </div>
      <Button asChild size="sm" variant="success">
        <Link href="/subscribe">
          Upgrade <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}

export const DisabledOverlay: React.FC<DisabledOverlayProps> = ({
  children,
  message = "this feature",
  blur = 10,
  borderRadius = 0,
  showMessage = true,
  style,
}) => {
  const { data: subscription } = useStripeSubscription();

  const disabled = subscription?.planName === "free";

  if (!disabled) {
    return <>{children}</>;
  }

  const borderRadiusStyle =
    borderRadius > 0 ? { borderRadius: `${borderRadius}px` } : {};

  return (
    <div className="relative" style={style}>
      <div
        className={disabled ? "filter" : ""}
        style={disabled ? { filter: `blur(${blur}px)` } : {}}
      >
        {children}
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center z-10"
        style={borderRadiusStyle}
      >
        {showMessage && (
          <div className="flex items-center justify-center">
            {defaultMessage(message)}
          </div>
        )}
      </div>
    </div>
  );
};
