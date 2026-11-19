import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";

import { IS_CLOUD } from "../../../lib/const";
import { isValidDomain } from "../../../lib/utils";

interface SetupStepProps {
  domain: string;
  setDomain: (v: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
}

/**
 * The domain is the only thing asked for: the organization is named after it (and can be
 * renamed in settings), and "How did you find Rybbit?" waits for the dashboard.
 */
export function SetupStep({ domain, setDomain, isLoading, onSubmit }: SetupStepProps) {
  const t = useExtracted();
  const canSubmit = !!domain && isValidDomain(domain);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">{t("Set up your workspace")}</h2>
      {/* A real form, so Enter submits like the account step. */}
      <form
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault();
          if (canSubmit && !isLoading) onSubmit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="domain">{t("Website Domain")}</Label>
          <Input
            id="domain"
            type="text"
            placeholder="example.com or sub.example.com"
            value={domain}
            onChange={e => setDomain(e.target.value.toLowerCase())}
            required
            autoFocus
            className="h-10 transition-all bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
          />
          <p className="text-xs text-muted-foreground">{t("Enter the domain of the website you want to track")}</p>
        </div>

        <Button
          type="submit"
          className="w-full transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
          loading={isLoading}
          disabled={!canSubmit}
          variant="success"
        >
          {IS_CLOUD ? t("Start free trial") : t("Continue")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
