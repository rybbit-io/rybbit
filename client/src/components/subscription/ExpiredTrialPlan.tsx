import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { InvoicesSection } from "./components/InvoicesSection";
import { PlanSection } from "./components/PlanSection";

interface ExpiredTrialPlanProps {
  message?: string;
}

export function ExpiredTrialPlan({ message }: ExpiredTrialPlanProps) {
  const t = useExtracted();
  const router = useRouter();

  return (
    <>
      <PlanSection
        name={t("Trial expired")}
        description={t("Subscription required.")}
        status={message || t("Your free trial has expired. Subscribe to a plan to continue tracking visits again.")}
        action={
          <Button onClick={() => router.push("/subscribe")} variant="success">
            {t("Subscribe now")} <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />
      <InvoicesSection />
    </>
  );
}
