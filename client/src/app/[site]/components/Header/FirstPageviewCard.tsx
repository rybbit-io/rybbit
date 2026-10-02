"use client";

import { motion } from "framer-motion";
import { useExtracted, useLocale } from "next-intl";
import type { Ref } from "react";
import { SparkBurst } from "../../../../components/interior/spark-burst";
import { TaskSteps } from "../../../../components/interior/task-steps";
import { Button } from "../../../../components/ui/button";
import { useWhiteLabel } from "../../../../hooks/useIsWhiteLabel";
import { SPRING_POP } from "../../../../lib/motion";

// The card mounts once the install card has faded out, so its beats start at zero: the frog lands,
// the sparks leave it just after, and the checks pop once both are under way.
const SPARKS_DELAY = 0.06;
const CHECKS_DELAY = 0.15;

export interface FirstVisitor {
  country: string;
  browser: string;
}

interface FirstPageviewCardProps {
  headingId: string;
  siteName: string;
  isMobileSite: boolean;
  /** The dashboard's refetch has landed. */
  dashboardReady: boolean;
  /** Present only when the live-sessions query already fetched it. */
  visitor?: FirstVisitor;
  onDismiss: () => void;
  dismissRef?: Ref<HTMLButtonElement>;
}

function regionName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function FirstPageviewCard({
  headingId,
  siteName,
  isMobileSite,
  dashboardReady,
  visitor,
  onDismiss,
  dismissRef,
}: FirstPageviewCardProps) {
  const t = useExtracted();
  const locale = useLocale();
  // The frog is Rybbit's mark; white-labelled dashboards keep the card without it.
  const { isWhiteLabel } = useWhiteLabel();

  const country = visitor?.country ? regionName(visitor.country, locale) : "";
  const browser = visitor?.browser ?? "";
  const origin = !country
    ? undefined
    : browser
      ? t("from {country} · {browser}", { country, browser })
      : t("from {country}", { country });

  const steps = [
    { id: "installed", label: isMobileSite ? t("SDK installed") : t("Snippet installed") },
    {
      id: "received",
      label: isMobileSite ? t("First screen view received") : t("First pageview received"),
      meta: origin,
    },
    { id: "dashboard", label: t("Your dashboard is filling in") },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {!isWhiteLabel && (
          // 56px wide and centred beside the checklist, so the burst has room on every side: its sparks
          // land within ±42px across and ±36px down, inside the card and short of the title.
          <div aria-hidden="true" className="relative grid w-14 shrink-0 place-items-center self-stretch">
            <motion.img
              src="/rybbit/frog_white.svg"
              alt=""
              width={32}
              height={21}
              className="h-auto w-8 invert dark:invert-0"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING_POP}
            />
            <SparkBurst inner={{ x: 18, y: 13 }} outer={{ x: 42, y: 36 }} delay={SPARKS_DELAY} />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2
            id={headingId}
            className="break-words text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
          >
            {siteName ? t("Now tracking {name}", { name: siteName }) : t("Now tracking your site")}
          </h2>
          <TaskSteps
            steps={steps}
            current={dashboardReady ? steps.length : steps.length - 1}
            appear
            appearDelay={CHECKS_DELAY}
            announce={false}
            label={t("Setup progress")}
          />
        </div>
      </div>
      <Button ref={dismissRef} size="sm" onClick={onDismiss} className="shrink-0 self-start">
        {t("Explore your dashboard")}
      </Button>
    </div>
  );
}
