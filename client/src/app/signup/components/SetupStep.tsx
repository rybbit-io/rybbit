import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";

import { IS_CLOUD } from "../../../lib/const";
import { isValidDomain } from "../../../lib/utils";

interface SetupStepProps {
  domain: string;
  setDomain: (v: string) => void;
  orgName: string;
  orgSlug: string;
  handleOrgNameChange: (v: string) => void;
  referralSource: string;
  setReferralSource: (v: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
}

export function SetupStep({
  domain,
  setDomain,
  orgName,
  orgSlug,
  handleOrgNameChange,
  referralSource,
  setReferralSource,
  isLoading,
  onSubmit,
}: SetupStepProps) {
  const t = useExtracted();

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">{t("Set up your workspace")}</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="domain">{t("Website Domain")}</Label>
          <Input
            id="domain"
            type="text"
            placeholder="example.com or sub.example.com"
            value={domain}
            onChange={e => setDomain(e.target.value.toLowerCase())}
            required
            className="h-10 transition-all bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
          />
          <p className="text-xs text-muted-foreground">
            {t("Enter the domain of the website you want to track")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="orgName">{t("Organization Name")}</Label>
          <Input
            id="orgName"
            type="text"
            placeholder="Acme Inc."
            value={orgName}
            onChange={e => handleOrgNameChange(e.target.value)}
            required
            className="h-10 transition-all bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
          />
        </div>

        {IS_CLOUD && (
          <div className="space-y-2">
            <Label htmlFor="referralSource">{t("How did you find Rybbit?")}</Label>
            <Select value={referralSource} onValueChange={setReferralSource}>
              <SelectTrigger className="h-10 bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700">
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
          </div>
        )}

        <Button
          className="w-full transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
          onClick={onSubmit}
          disabled={
            isLoading ||
            !orgName ||
            !orgSlug ||
            !domain ||
            !isValidDomain(domain) ||
            (IS_CLOUD && !referralSource)
          }
          variant="success"
        >
          {IS_CLOUD ? t("Start free trial") : t("Continue")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
