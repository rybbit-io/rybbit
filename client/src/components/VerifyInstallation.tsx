"use client";

import { useVerifyScript } from "@/api/admin/hooks/useSites";
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { Button } from "./ui/button";

interface VerifyInstallationProps {
  siteId: number | string;
}

export function VerifyInstallation({ siteId }: VerifyInstallationProps) {
  const { mutate: verify, data: verifyResult, isPending: isVerifying, reset: resetVerify } = useVerifyScript();
  const t = useExtracted();

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={() => {
          resetVerify();
          verify(siteId);
        }}
        disabled={isVerifying}
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t("Checking installation...")}
          </>
        ) : (
          t("Verify Installation")
        )}
      </Button>
      {verifyResult && (
        <div className="rounded-md border p-3 text-xs space-y-2">
          {verifyResult.scriptTagFound && verifyResult.scriptExecuted && verifyResult.siteIdMatch ? (
            <div className="flex text-sm items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">{t("Script is installed and running correctly.")}</span>
            </div>
          ) : verifyResult.scriptTagFound && !verifyResult.scriptExecuted ? (
            <div className="flex text-sm items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">{t("Script tag found but not executing")}</span>
            </div>
          ) : (
            <div className="flex text-sm items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">{t("Script not detected")}</span>
            </div>
          )}
          {verifyResult.issues.length > 0 && (
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              {verifyResult.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}

        </div>
      )}
    </div>
  );
}
