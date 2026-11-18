"use client";

import { Download } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { dpaPdfUrl, type DpaAgreement } from "@/api/admin/endpoints/dpa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LedgerSection, LedgerTable } from "../../components/Ledger";

const ROW = "hover:bg-transparent dark:hover:bg-transparent dark:border-b-neutral-850";
const HEAD = "h-auto px-3 py-2";
const CELL = "px-3 py-2.5 align-top";
const SECONDARY = "text-xs text-neutral-500 dark:text-neutral-400";

export function SignedAgreements({
  organizationId,
  agreements,
  currentVersion,
}: {
  organizationId: string;
  agreements: DpaAgreement[];
  currentVersion: string;
}) {
  const t = useExtracted();

  return (
    <LedgerSection
      title={t("Signed agreements")}
      count={agreements.length}
      description={t("Each copy is countersigned by Rybbit and was emailed to its signer when signed.")}
    >
      <LedgerTable>
        <Table className="min-w-[640px]">
          <TableHeader className="bg-transparent dark:bg-transparent [&_tr]:border-b">
            <TableRow className={ROW}>
              <TableHead className={HEAD}>{t("Company")}</TableHead>
              <TableHead className={HEAD}>{t("Signed by")}</TableHead>
              <TableHead className={HEAD}>{t("Signed")}</TableHead>
              <TableHead className={HEAD}>
                <span className="sr-only">{t("Download")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-transparent dark:bg-transparent">
            {agreements.map((agreement, index) => (
              <TableRow key={agreement.id} className={ROW}>
                <TableCell className={CELL}>
                  <div className="flex items-center gap-2 font-medium">
                    {agreement.companyName}
                    {index === 0 && <Badge variant="success">{t("Current")}</Badge>}
                  </div>
                  <div className={SECONDARY}>
                    {agreement.dpaVersion === currentVersion
                      ? t("Version {version}", { version: agreement.dpaVersion })
                      : t("Version {version} (earlier text)", { version: agreement.dpaVersion })}
                  </div>
                </TableCell>
                <TableCell className={CELL}>
                  <div>{agreement.signerName}</div>
                  <div className={SECONDARY}>
                    {agreement.signerTitle} · {agreement.signerEmail}
                  </div>
                </TableCell>
                <TableCell className={CELL}>
                  {DateTime.fromISO(agreement.signedAt).toLocaleString(DateTime.DATE_MED)}
                </TableCell>
                <TableCell className={`${CELL} text-right`}>
                  <Button asChild variant="outline" size="sm">
                    <a href={dpaPdfUrl(organizationId, agreement.id)} download>
                      <Download />
                      {t("PDF")}
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </LedgerTable>
    </LedgerSection>
  );
}
