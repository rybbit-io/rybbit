"use client";

import { AlertTriangle, Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useCreateApiKey, useDeleteApiKey, useListApiKeys } from "../../../../api/admin/hooks/useUserApiKeys";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { IS_CLOUD } from "../../../../lib/const";
import { useStripeSubscription } from "../../../../lib/subscription/useStripeSubscription";
import { ApiKeyScopePicker, getScopeLabel, type ScopeSelection } from "./ApiKeyScopePicker";

function PermissionsBadge({ permissions }: { permissions: Record<string, string[]> | null | undefined }) {
  const t = useExtracted();
  const entries = permissions ? Object.entries(permissions) : [];

  if (entries.length === 0) {
    return <Badge variant="secondary">{t("Full access")}</Badge>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="cursor-default">
          {t("{count, plural, one {# resource} other {# resources}}", { count: entries.length })}
        </Badge>
      </TooltipTrigger>
      <TooltipContent align="start">
        <div className="space-y-1">
          {entries.map(([resource, actions]) => (
            <div key={resource} className="flex items-center justify-between gap-6">
              <span>{getScopeLabel(resource)}</span>
              <span className="text-neutral-500 dark:text-neutral-400">{actions.join(", ")}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function ApiKeyManager() {
  const t = useExtracted();
  const [apiKeyName, setApiKeyName] = useState("");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [restrictScopes, setRestrictScopes] = useState(false);
  const [scopes, setScopes] = useState<ScopeSelection>({});
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string | null } | null>(null);

  const { data: subscription } = useStripeSubscription();
  const { data: apiKeysData, isLoading: isLoadingApiKeys, isError, error, refetch } = useListApiKeys();

  const planName = subscription?.planName || "free";
  const isFreePlan = planName === "free" || planName.includes("basic");
  const isPlanGated = IS_CLOUD && isFreePlan;

  const apiKeys = apiKeysData?.apiKeys;
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const handleCreateApiKey = async () => {
    if (!apiKeyName.trim()) {
      toast.error(t("Please enter a name for the API key"));
      return;
    }

    const permissions = restrictScopes ? (scopes as Record<string, string[]>) : undefined;
    if (permissions && Object.keys(permissions).length === 0) {
      toast.error(t("Select at least one permission, or turn off restrictions for a full-access key"));
      return;
    }

    try {
      const result = await createApiKey.mutateAsync({ name: apiKeyName, permissions });
      setCreatedApiKey(result.key);
      setCopied(false);
      setShowApiKeyDialog(true);
      setApiKeyName("");
      setRestrictScopes(false);
      setScopes({});
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to create API key"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      await deleteApiKey.mutateAsync(pendingDelete.id);
      toast.success(t("API key deleted"));
      setPendingDelete(null);
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to delete API key"));
    }
  };

  const handleCopy = async () => {
    if (!createdApiKey) return;
    try {
      await navigator.clipboard.writeText(createdApiKey);
      setCopied(true);
    } catch {
      toast.error(t("Couldn't copy to clipboard. Select the key and copy it manually."));
    }
  };

  return (
    <>
      <Card className="p-2">
        <CardHeader>
          <CardTitle className="text-xl">{t("API Keys")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("Create API Key")}</h4>
            <p className="text-xs text-neutral-500">
              {t("Generate API keys to access analytics endpoints from your applications")}
            </p>
            {isPlanGated ? (
              <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900 p-3 border border-neutral-100 dark:border-neutral-800">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {t("API keys are available on Standard and Pro plans.")}{" "}
                  <Link
                    href="/settings/billing"
                    className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-300"
                  >
                    {t("Upgrade your plan")}
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <Input
                    id="apiKeyName"
                    value={apiKeyName}
                    onChange={({ target }) => setApiKeyName(target.value)}
                    placeholder={t("API Key Name")}
                    aria-label={t("API Key Name")}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateApiKey();
                      }
                    }}
                  />
                  <Button
                    variant="success"
                    onClick={handleCreateApiKey}
                    disabled={createApiKey.isPending || !apiKeyName.trim()}
                  >
                    {createApiKey.isPending ? t("Creating...") : t("Create")}
                  </Button>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="restrictScopes"
                    checked={restrictScopes}
                    onCheckedChange={checked => setRestrictScopes(!!checked)}
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor="restrictScopes" className="text-sm">
                      {t("Restrict permissions")}
                    </Label>
                    <p className="text-xs text-neutral-500">
                      {t(
                        "Limit this key to specific resources. Leave off for a full-access key that can do everything you can."
                      )}
                    </p>
                  </div>
                </div>

                {restrictScopes && <ApiKeyScopePicker value={scopes} onChange={setScopes} />}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("Your API Keys")}</h4>
            {isLoadingApiKeys ? (
              <div className="space-y-2" aria-hidden="true">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : isError ? (
              <div className="space-y-2">
                <p className="text-xs text-red-500">
                  {t("Failed to load API keys")}
                  {error?.message ? `: ${error.message}` : ""}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {t("Retry")}
                </Button>
              </div>
            ) : apiKeys && apiKeys.length > 0 ? (
              <div className="rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Name")}</TableHead>
                      <TableHead>{t("Key")}</TableHead>
                      <TableHead>{t("Permissions")}</TableHead>
                      <TableHead>{t("Created")}</TableHead>
                      <TableHead>{t("Last used")}</TableHead>
                      <TableHead className="w-10">
                        <span className="sr-only">{t("Actions")}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map(key => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">
                          {key.name || <span className="font-normal italic text-neutral-500">{t("Unnamed")}</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                          {key.start ? `${key.start}…` : "••••"}
                        </TableCell>
                        <TableCell>
                          <PermissionsBadge permissions={key.permissions} />
                        </TableCell>
                        <TableCell className="text-neutral-600 dark:text-neutral-400">
                          {DateTime.fromJSDate(new Date(key.createdAt)).toLocaleString(DateTime.DATE_MED)}
                        </TableCell>
                        <TableCell className="text-neutral-600 dark:text-neutral-400">
                          {key.lastRequest
                            ? DateTime.fromJSDate(new Date(key.lastRequest)).toRelative()
                            : t("Never")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="smIcon"
                            className="text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400"
                            onClick={() => setPendingDelete({ id: key.id, name: key.name })}
                            aria-label={t("Delete API key {name}", { name: key.name || t("Unnamed") })}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-100 px-4 py-8 text-center dark:border-neutral-800">
                <KeyRound className="mx-auto h-5 w-5 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">{t("No API keys yet")}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {t("API keys let your scripts and integrations access your analytics data.")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("API Key Created")}</DialogTitle>
            <DialogDescription>
              {t("This is the only time you'll see this key. Copy it now and store it somewhere safe.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <code className="block select-all break-all rounded-lg border border-neutral-100 bg-neutral-50 p-3 font-mono text-xs leading-relaxed dark:border-neutral-800 dark:bg-neutral-900">
              {createdApiKey}
            </code>
            <div className="flex gap-2">
              <Button variant="success" className="flex-1" onClick={handleCopy}>
                {copied ? <Check /> : <Copy />}
                {copied ? t("Copied") : t("Copy key")}
              </Button>
              <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                {t("Done")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" color="hsl(var(--red-500))" />
              {t("Delete this API key?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('"{name}" will be revoked immediately. Anything still using it will stop working.', {
                name: pendingDelete?.name || t("Unnamed"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteApiKey.isPending}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteApiKey.isPending}
              onClick={e => {
                e.preventDefault();
                handleConfirmDelete();
              }}
            >
              {deleteApiKey.isPending ? t("Deleting...") : t("Delete key")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
