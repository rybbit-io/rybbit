"use client";

import { Check, Copy, Globe, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useExtracted } from "next-intl";
import { useCallback, useState } from "react";

import { CodeSnippet } from "@/components/CodeSnippet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";

import { ProxyStatus } from "@/api/admin/endpoints";
import { useDisableProxy, useEnableProxy, useProxyStatus } from "@/api/admin/hooks/useProxy";

// Mirror of the server-side discouraged labels — ad blockers target these subdomains, so we
// nudge customers toward a neutral name without hard-blocking.
const DISCOURAGED_LABELS = ["analytics", "tracking", "track", "metrics", "stats", "rybbit"];

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-neutral-150 bg-neutral-50 px-2 py-1.5 font-mono text-xs dark:border-neutral-800 dark:bg-neutral-900">
          {value}
        </code>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: ProxyStatus | null }) {
  const t = useExtracted();
  if (status === "active") return <Badge variant="success">{t("Active")}</Badge>;
  if (status === "failed") return <Badge variant="destructive">{t("Failed")}</Badge>;
  return <Badge variant="warning">{t("Pending verification")}</Badge>;
}

export function CustomDomainTab({ siteId, disabled = false }: { siteId: number; disabled?: boolean }) {
  const t = useExtracted();
  const { data, isLoading, refetch, isRefetching } = useProxyStatus(siteId);
  const enableMutation = useEnableProxy(siteId);
  const disableMutation = useDisableProxy(siteId);
  const [domain, setDomain] = useState("");

  const handleEnable = async () => {
    const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!normalized.includes(".")) {
      toast.error(t("Enter a full subdomain you control, e.g. a.yourdomain.com"));
      return;
    }
    try {
      await enableMutation.mutateAsync(normalized);
      toast.success(t("Custom domain added. Add the DNS records below to finish setup."));
      setDomain("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to add custom domain"));
    }
  };

  const handleDisable = async () => {
    try {
      await disableMutation.mutateAsync();
      toast.success(t("Custom domain removed"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to remove custom domain"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    );
  }

  // Feature isn't enabled on this server (no Cloudflare credentials configured).
  if (!data?.configured) {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t("Custom Domain")}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              "Managed custom domains aren't enabled on this server. A self-hosted instance needs Cloudflare for SaaS credentials configured to offer this."
            )}
          </p>
        </div>
      </div>
    );
  }

  const firstLabel = domain.trim().toLowerCase().split(".")[0];
  const discouraged = firstLabel.length > 0 && DISCOURAGED_LABELS.includes(firstLabel);

  // Setup form — no custom domain configured yet.
  if (!data.enabled) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t("Custom Domain")}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                "Serve the tracking script from a subdomain of your own site. This makes analytics first-party, improving data quality and resilience to ad blockers — and we handle TLS for you."
              )}
            </p>
          </div>

          <div className="flex space-x-2">
            <Input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !disabled && !enableMutation.isPending) handleEnable();
              }}
              placeholder="a.yourdomain.com"
              disabled={disabled || enableMutation.isPending}
            />
            <Button
              variant="outline"
              onClick={handleEnable}
              disabled={disabled || enableMutation.isPending || domain.trim().length === 0}
            >
              {enableMutation.isPending ? t("Adding...") : t("Add Domain")}
            </Button>
          </div>

          {discouraged && (
            <p className="flex items-start gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
              <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {t(
                'Subdomains like "{label}" are commonly blocked by ad blockers. Consider a neutral name to maximize data quality.',
                { label: firstLabel }
              )}
            </p>
          )}

          {data.cnameTarget && (
            <p className="text-xs text-muted-foreground">
              {t("You'll point this subdomain at {target} with a CNAME record after adding it.", {
                target: data.cnameTarget,
              })}
            </p>
          )}
        </div>
      </div>
    );
  }

  // A custom domain is configured — show its status, DNS records, and the install snippet.
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0" />
              <span className="truncate">{data.domain}</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-1">{t("Your custom tracking domain")}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={data.status} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refetch()}
              disabled={isRefetching}
              aria-label={t("Check status")}
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {data.status === "pending" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("Add the DNS records below. Verification runs automatically once DNS propagates (usually a few minutes).")}
          </p>
        )}

        {data.status === "failed" && (
          <div className="space-y-1">
            <p className="text-xs text-red-600 dark:text-red-400">
              {t("Verification failed. Double-check the DNS records below, then re-check.")}
            </p>
            {data.validationErrors?.map((err, i) => (
              <p key={i} className="text-xs text-muted-foreground font-mono">
                {err}
              </p>
            ))}
          </div>
        )}
      </div>

      {data.dnsRecords && data.dnsRecords.length > 0 && (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t("DNS Records")}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {t("Add these records at your DNS provider for {domain}.", { domain: data.domain ?? "" })}
            </p>
          </div>
          {data.dnsRecords.map((rec, i) => (
            <div key={i} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{rec.type}</Badge>
                {rec.purpose === "ssl-validation" && (
                  <span className="text-xs text-muted-foreground">{t("SSL validation")}</span>
                )}
                {rec.purpose === "ownership" && (
                  <span className="text-xs text-muted-foreground">{t("Ownership verification")}</span>
                )}
              </div>
              <CopyField label={t("Name / Host")} value={rec.name} />
              <CopyField label={t("Value / Target")} value={rec.value} />
            </div>
          ))}
        </div>
      )}

      {data.active && data.scriptSnippet && (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t("Update your tracking script")}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {t("Replace your existing snippet with this one to serve analytics from your own domain.")}
            </p>
          </div>
          <CodeSnippet language="HTML" code={data.scriptSnippet} />
        </div>
      )}

      <div className="space-y-3 pt-3">
        <h4 className="text-sm font-semibold text-destructive">{t("Danger Zone")}</h4>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={disabled || disableMutation.isPending}>
              {disableMutation.isPending ? t("Removing...") : t("Remove custom domain")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Remove this custom domain?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "Analytics will stop being served from {domain} and its TLS certificate will be released. If you've installed the custom-domain snippet, switch it back to the default before removing.",
                  { domain: data.domain ?? "" }
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDisable} disabled={disableMutation.isPending} variant="destructive">
                {disableMutation.isPending ? t("Removing...") : t("Yes, remove it")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
