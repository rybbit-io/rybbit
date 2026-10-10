"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useExtracted } from "next-intl";
import { useId, useState } from "react";
import { CopyButton } from "@/components/interior/copy-button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useCreateOrgApiKey, useDeleteOrgApiKey, useListOrgApiKeys } from "../../../../api/admin/hooks/useOrgApiKeys";
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
import { Button } from "../../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Switch } from "../../../../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { IS_CLOUD } from "../../../../lib/const";
import { useStripeSubscription } from "../../../../lib/subscription/useStripeSubscription";
import { LedgerRow, LedgerSection, LedgerTable } from "../../components/Ledger";
import { ApiKeyScopePicker, getScopeLabel, type ScopeSelection } from "./ApiKeyScopePicker";

const INLINE_LINK =
  "font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-300";
const MUTED = "text-neutral-500 dark:text-neutral-400";
// Rows inside the create form sit 16px in from the section edge; narrowing the label column by the
// same amount keeps their controls on the page's control column.
const FORM_ROW = "px-4 md:grid-cols-[244px_minmax(0,1fr)]";

/** "Full access", or what a restricted key may touch, with the full list on hover. */
function PermissionsSummary({ permissions }: { permissions: Record<string, string[]> | null | undefined }) {
  const t = useExtracted();
  const entries = permissions ? Object.entries(permissions) : [];

  if (entries.length === 0) {
    return <span>{t("Full access")}</span>;
  }

  // Name the resources outright when there are few and they share one access level.
  const accessLevels = new Set(entries.map(([, actions]) => [...actions].sort().join(",")));
  const [sharedLevel] = accessLevels.size === 1 ? [...accessLevels] : [];
  const sharedLabel =
    sharedLevel === "read"
      ? t("Read")
      : sharedLevel === "write"
        ? t("Write")
        : sharedLevel === "read,write"
          ? t("Read and write")
          : null;
  const summary =
    sharedLabel && entries.length <= 3
      ? t("{access} · {resources}", {
          access: sharedLabel,
          resources: entries.map(([resource]) => getScopeLabel(resource)).join(", "),
        })
      : t("{count, plural, one {# resource} other {# resources}}", { count: entries.length });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-default underline decoration-neutral-300 decoration-dotted underline-offset-4 dark:decoration-neutral-600"
        >
          {summary}
        </span>
      </TooltipTrigger>
      <TooltipContent align="start">
        <div className="space-y-1">
          {entries.map(([resource, actions]) => (
            <div key={resource} className="flex items-center justify-between gap-6">
              <span>{getScopeLabel(resource)}</span>
              <span className={MUTED}>{actions.join(", ")}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Manages API keys for the current user, or — when `organizationId` is set —
 * organization-owned keys (org-wide access, survive member departures).
 */
export function ApiKeyManager({ organizationId }: { organizationId?: string }) {
  const t = useExtracted();
  const formId = useId();
  const nameInputId = useId();
  const restrictSwitchId = useId();
  const [isCreating, setIsCreating] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  // The key is shown once. Closing the reveal dialog before it has been copied
  // takes a second, deliberate step.
  const [keyCopied, setKeyCopied] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [restrictScopes, setRestrictScopes] = useState(false);
  const [scopes, setScopes] = useState<ScopeSelection>({});
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string | null } | null>(null);

  const { data: subscription } = useStripeSubscription();
  // Both hooks are called unconditionally (rules of hooks); the unused one is
  // disabled via its enabled flag.
  const userKeysQuery = useListApiKeys(!organizationId);
  const orgKeysQuery = useListOrgApiKeys(organizationId);
  const {
    data: apiKeysData,
    isLoading: isLoadingApiKeys,
    isError,
    error,
    refetch,
  } = organizationId ? orgKeysQuery : userKeysQuery;

  const planName = subscription?.planName || "free";
  const isFreePlan = planName === "free" || planName.includes("basic");
  const isPlanGated = IS_CLOUD && isFreePlan;

  const apiKeys = apiKeysData?.apiKeys;
  const createUserApiKey = useCreateApiKey();
  const deleteUserApiKey = useDeleteApiKey();
  const createOrgApiKey = useCreateOrgApiKey(organizationId);
  const deleteOrgApiKey = useDeleteOrgApiKey(organizationId);
  const createApiKey = organizationId ? createOrgApiKey : createUserApiKey;
  const deleteApiKey = organizationId ? deleteOrgApiKey : deleteUserApiKey;

  const closeCreateForm = () => {
    setIsCreating(false);
    setApiKeyName("");
    setRestrictScopes(false);
    setScopes({});
  };

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
      setKeyCopied(false);
      setConfirmClose(false);
      setShowApiKeyDialog(true);
      closeCreateForm();
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

  const handleApiKeyDialogOpenChange = (open: boolean) => {
    if (!open && !keyCopied && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    setShowApiKeyDialog(open);
  };

  // Selecting the key and pressing Cmd/Ctrl+C counts as copying it too.
  const handleManualKeyCopy = () => {
    if (createdApiKey && document.getSelection()?.toString().includes(createdApiKey)) {
      setKeyCopied(true);
    }
  };

  const showCloseWarning = confirmClose && !keyCopied;

  const description = organizationId
    ? IS_CLOUD
      ? t(
          "These belong to the organization rather than a person, so they keep working when people leave. Only owners and admins can see or create them, and they share the organization's daily request budget."
        )
      : t(
          "These belong to the organization rather than a person, so they keep working when people leave. Only owners and admins can see or create them."
        )
    : t.rich(
        "Keys that act as you, with your role in each organization, and stop working if you leave it. For an integration that should outlive your membership, use an <link>organization key</link> (owners and admins only).",
        {
          link: chunks => (
            <Link href="/settings/organization" className={INLINE_LINK}>
              {chunks}
            </Link>
          ),
        }
      );

  return (
    <LedgerSection
      title={organizationId ? t("Organization API keys") : t("Personal API keys")}
      count={apiKeys && apiKeys.length > 0 ? apiKeys.length : undefined}
      description={
        isPlanGated ? (
          <>
            {description} {t("API keys are available on Standard and Pro plans.")}
          </>
        ) : (
          description
        )
      }
      actions={
        isPlanGated ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/billing">{t("Upgrade your plan")}</Link>
          </Button>
        ) : (
          <Button
            size="sm"
            aria-expanded={isCreating}
            aria-controls={isCreating ? formId : undefined}
            onClick={() => (isCreating ? closeCreateForm() : setIsCreating(true))}
            className={cn(isCreating && "bg-neutral-50 dark:bg-neutral-800")}
          >
            <Plus />
            {t("Create key")}
          </Button>
        )
      }
    >
      {isCreating && !isPlanGated && (
        <form
          id={formId}
          aria-label={organizationId ? t("New organization API key") : t("New personal API key")}
          onSubmit={e => {
            e.preventDefault();
            handleCreateApiKey();
          }}
          className="mb-5 divide-y divide-neutral-100 rounded-lg border border-neutral-150 bg-white dark:divide-neutral-850 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <LedgerRow
            label={t("Key name")}
            description={t("So you can tell your keys apart.")}
            htmlFor={nameInputId}
            className={FORM_ROW}
          >
            <Input
              id={nameInputId}
              autoFocus
              value={apiKeyName}
              onChange={({ target }) => setApiKeyName(target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") closeCreateForm();
              }}
              className="max-w-sm"
            />
          </LedgerRow>
          <LedgerRow
            label={t("Restrict permissions")}
            description={
              organizationId
                ? t("Off, the key has full access to all of this organization's sites.")
                : t("Off, the key can do anything you can.")
            }
            htmlFor={restrictSwitchId}
            className={FORM_ROW}
          >
            <div className="flex min-h-9 items-center gap-3">
              <Switch id={restrictSwitchId} checked={restrictScopes} onCheckedChange={setRestrictScopes} />
              <span className={cn("text-sm", MUTED)}>
                {restrictScopes ? t("Only what's selected below") : t("Full access")}
              </span>
            </div>
            {restrictScopes && (
              <div className="mt-3">
                <ApiKeyScopePicker value={scopes} onChange={setScopes} />
              </div>
            )}
          </LedgerRow>
          <div className={cn("grid gap-x-10 gap-y-3 py-3", FORM_ROW)}>
            <div className="hidden md:block" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className={cn("text-xs leading-4", MUTED)}>
                {t("You'll see the key once, right after you create it.")}
              </p>
              <div className="ml-auto flex items-center gap-1.5">
                <Button type="button" variant="ghost" size="sm" onClick={closeCreateForm}>
                  {t("Cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  size="sm"
                  loading={createApiKey.isPending}
                  loadingLabel={t("Creating...")}
                  disabled={!apiKeyName.trim()}
                >
                  {t("Create key")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {isLoadingApiKeys ? (
        <div className="space-y-3 border-y border-neutral-100 py-4 dark:border-neutral-850" aria-hidden="true">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      ) : isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-neutral-100 py-4 dark:border-neutral-850">
          <p className="text-sm text-red-600 dark:text-red-400">
            {t("Failed to load API keys")}
            {error?.message ? `: ${error.message}` : ""}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("Retry")}
          </Button>
        </div>
      ) : apiKeys && apiKeys.length > 0 ? (
        <LedgerTable>
          <Table>
            <TableHeader className="bg-transparent dark:bg-transparent [&_tr]:border-b">
              <TableRow className="hover:bg-transparent dark:border-b-neutral-850 dark:hover:bg-transparent">
                <TableHead className="h-9">{t("Name")}</TableHead>
                <TableHead className="h-9">{t("Key")}</TableHead>
                <TableHead className="h-9">{t("Permissions")}</TableHead>
                <TableHead className="h-9">{t("Created")}</TableHead>
                <TableHead className="h-9">{t("Last used")}</TableHead>
                <TableHead className="h-9 w-10">
                  <span className="sr-only">{t("Actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-transparent dark:bg-transparent">
              {apiKeys.map(key => (
                <TableRow key={key.id} className="dark:border-b-neutral-850">
                  <TableCell className="whitespace-nowrap py-3 font-medium">
                    {key.name || <span className={cn("font-normal italic", MUTED)}>{t("Unnamed")}</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {key.start ? `${key.start}…` : "••••"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-3">
                    <PermissionsSummary permissions={key.permissions} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-3 tabular-nums">
                    {DateTime.fromJSDate(new Date(key.createdAt)).toLocaleString(DateTime.DATE_MED)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-3">
                    {key.lastRequest ? (
                      DateTime.fromJSDate(new Date(key.lastRequest)).toRelative()
                    ) : (
                      <span className={MUTED}>{t("Never")}</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right">
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
        </LedgerTable>
      ) : (
        <div className="border-y border-neutral-100 py-6 dark:border-neutral-850">
          <p className="text-sm font-medium">{t("No API keys yet")}</p>
          <p className={cn("mt-0.5 text-xs leading-4", MUTED)}>
            {t("API keys let your scripts and integrations access your analytics data.")}
          </p>
        </div>
      )}

      <Dialog open={showApiKeyDialog} onOpenChange={handleApiKeyDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("API Key Created")}</DialogTitle>
            <DialogDescription>
              {t("This is the only time you'll see this key. Copy it now and store it somewhere safe.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <code
              onCopy={handleManualKeyCopy}
              className="block select-all break-all rounded-lg border border-neutral-100 bg-neutral-50 p-3 font-mono text-xs leading-relaxed dark:border-neutral-800 dark:bg-neutral-900"
            >
              {createdApiKey}
            </code>
            {showCloseWarning && (
              <p role="alert" className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t("You haven't copied this key yet. Once you close this dialog, it can't be shown again.")}
              </p>
            )}
            <div className="flex gap-2">
              <CopyButton
                variant="success"
                className="flex-1"
                value={createdApiKey ?? ""}
                label={t("Copy key")}
                onCopy={() => setKeyCopied(true)}
                onError={() => toast.error(t("Couldn't copy to clipboard. Select the key and copy it manually."))}
              />
              <Button variant="outline" onClick={() => handleApiKeyDialogOpenChange(false)}>
                {showCloseWarning ? t("Close anyway") : t("Done")}
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
    </LedgerSection>
  );
}
