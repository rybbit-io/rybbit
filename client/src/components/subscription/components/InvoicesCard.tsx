import { authClient } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useExtracted, useLocale } from "next-intl";
import { authedFetch } from "../../../api/utils";
import { IS_CLOUD } from "../../../lib/const";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

function useInvoices() {
  const { data: activeOrg } = authClient.useActiveOrganization();

  return useQuery<Invoice[]>({
    queryKey: ["stripe-invoices", activeOrg?.id],
    queryFn: () => authedFetch<Invoice[]>(`/stripe/invoices?organizationId=${activeOrg!.id}`),
    enabled: !!activeOrg && IS_CLOUD,
    staleTime: 5 * 60 * 1000,
  });
}

function formatCurrency(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number, locale: string) {
  return new Date(timestamp * 1000).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const statusVariants: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  paid: "success",
  open: "warning",
  void: "secondary",
  uncollectible: "destructive",
  draft: "secondary",
};

function getStatusLabel(status: string | null, t: (key: string) => string): string {
  switch (status) {
    case "paid":
      return t("Paid");
    case "open":
      return t("Open");
    case "void":
      return t("Void");
    case "uncollectible":
      return t("Uncollectible");
    case "draft":
      return t("Draft");
    default:
      return status ?? "";
  }
}

export function InvoicesCard() {
  const t = useExtracted();
  const locale = useLocale();
  const { data: invoices, isLoading } = useInvoices();

  if (isLoading || !invoices || invoices.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Invoices")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">{t("Date")}</th>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">{t("Status")}</th>
                <th className="text-right py-2 pr-4 font-medium text-muted-foreground">{t("Amount")}</th>
                <th className="text-right py-2 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0">
                  <td className="py-2.5 pr-4">{formatDate(invoice.created, locale)}</td>
                  <td className="py-2.5 pr-4">
                    <Badge variant={statusVariants[invoice.status ?? ""] ?? "secondary"}>
                      {getStatusLabel(invoice.status, t)}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-right">{formatCurrency(invoice.amountPaid || invoice.amountDue, invoice.currency, locale)}</td>
                  <td className="py-2.5 text-right">
                    {invoice.hostedInvoiceUrl && (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm transition-colors hover:underline"
                      >
                        {t("View")}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
