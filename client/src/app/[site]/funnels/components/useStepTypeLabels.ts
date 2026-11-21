import { useExtracted } from "next-intl";
import { FunnelStepType } from "@/api/analytics/endpoints";

/** What each kind of funnel step is called, for a step with no label and for the line under its name. */
export function useStepTypeLabels(): Record<FunnelStepType, string> {
  const t = useExtracted();
  return {
    page: t("Page"),
    event: t("Event"),
    outbound: t("Outbound"),
    button_click: t("Button"),
    form_submit: t("Form"),
    copy: t("Copy"),
  };
}
