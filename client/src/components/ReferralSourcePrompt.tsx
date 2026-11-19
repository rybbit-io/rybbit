"use client";

import { X } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IS_CLOUD } from "@/lib/const";
import { userStore } from "@/lib/userStore";

// Set when signup creates the organization, cleared once the question is answered or closed.
const ASK_KEY = "rybbit-ask-referral-source";

/** Signup no longer asks how the person found Rybbit; ask on their dashboard instead. */
export function askReferralSourceLater() {
  try {
    window.localStorage.setItem(ASK_KEY, "1");
  } catch {
    // Storage is blocked: the question is skipped.
  }
}

/**
 * "How did you find Rybbit?", asked once on the dashboard of someone who has just signed up in
 * this browser. The answer goes to our own analytics as a property of the user.
 */
export function ReferralSourcePrompt({ className }: { className?: string }) {
  const t = useExtracted();
  const userId = userStore(state => state.user?.id);
  const [asking, setAsking] = useState(false);

  // localStorage isn't readable while rendering on the server.
  useEffect(() => {
    try {
      setAsking(IS_CLOUD && window.localStorage.getItem(ASK_KEY) === "1");
    } catch {
      setAsking(false);
    }
  }, []);

  if (!asking || !userId) return null;

  const finish = () => {
    setAsking(false);
    try {
      window.localStorage.removeItem(ASK_KEY);
    } catch {
      // Nothing to clear.
    }
  };

  const answer = (source: string) => {
    window.rybbit?.identify(userId, { source });
    finish();
  };

  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-neutral-100 bg-white px-4 py-3 text-sm dark:border-neutral-850 dark:bg-neutral-900 " +
        (className ?? "")
      }
    >
      <label htmlFor="referral-source" className="font-medium">
        {t("How did you find Rybbit?")}
      </label>
      <Select onValueChange={answer}>
        <SelectTrigger id="referral-source" className="h-9 w-56">
          <SelectValue placeholder={t("Select an option")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="google">{t("Google")}</SelectItem>
          <SelectItem value="reddit">{t("Reddit")}</SelectItem>
          <SelectItem value="twitter">{t("Twitter/X")}</SelectItem>
          <SelectItem value="youtube">{t("YouTube")}</SelectItem>
          <SelectItem value="linkedin">{t("LinkedIn")}</SelectItem>
          <SelectItem value="discord">{t("Discord")}</SelectItem>
          <SelectItem value="producthunt">{t("Product Hunt")}</SelectItem>
          <SelectItem value="hacker-news">{t("Hacker News")}</SelectItem>
          <SelectItem value="github">{t("Github")}</SelectItem>
          <SelectItem value="friends">{t("Friends")}</SelectItem>
          <SelectItem value="work">{t("Work")}</SelectItem>
          <SelectItem value="blog">{t("Blog")}</SelectItem>
          <SelectItem value="other">{t("Other")}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" className="ml-auto size-8" aria-label={t("Close")} onClick={finish}>
        <X className="size-4" />
      </Button>
    </div>
  );
}
