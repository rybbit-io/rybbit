"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { Label } from "../../../../components/ui/label";
import { DateTime } from "luxon";
import { useListApiKeys, useCreateApiKey, useDeleteApiKey } from "../../../../api/admin/hooks/useUserApiKeys";

export function ApiKeyManager() {
  const t = useExtracted();
  const [apiKeyName, setApiKeyName] = useState("");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);

  const { data: apiKeys, isLoading: isLoadingApiKeys, isError, error, refetch } = useListApiKeys();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const handleCreateApiKey = async () => {
    if (!apiKeyName.trim()) {
      toast.error(t("Please enter a name for the API key"));
      return;
    }

    try {
      const result = await createApiKey.mutateAsync({ name: apiKeyName });
      setCreatedApiKey(result.key);
      setShowApiKeyDialog(true);
      setApiKeyName("");
      toast.success(t("API key created successfully"));
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to create API key"));
    }
  };

  const handleDeleteApiKey = async (keyId: string, keyName: string | null) => {
    if (!confirm(t("Are you sure you want to delete the API key \"{keyName}\"?", { keyName: keyName || t("Unnamed") }))) {
      return;
    }

    try {
      await deleteApiKey.mutateAsync(keyId);
      toast.success(t("API key deleted successfully"));
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to delete API key"));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("Copied to clipboard"));
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
            <div className="flex space-x-2">
              <Input
                id="apiKeyName"
                value={apiKeyName}
                onChange={({ target }) => setApiKeyName(target.value)}
                placeholder={t("API Key Name")}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateApiKey();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={handleCreateApiKey}
                disabled={createApiKey.isPending || !apiKeyName.trim()}
              >
                {createApiKey.isPending ? t("Creating...") : t("Create")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("Your API Keys")}</h4>
            {isLoadingApiKeys ? (
              <p className="text-xs text-neutral-500">{t("Loading API keys...")}</p>
            ) : isError ? (
              <div className="space-y-2">
                <p className="text-xs text-red-500">
                  {t("Failed to load API keys")}{error?.message ? `: ${error.message}` : ""}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {t("Retry")}
                </Button>
              </div>
            ) : apiKeys && apiKeys.length > 0 ? (
              <div className=" rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Name")}</TableHead>
                      <TableHead>{t("Key")}</TableHead>
                      <TableHead>{t("Created")}</TableHead>
                      <TableHead className="text-right">{t("Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map(key => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name || t("Unnamed")}</TableCell>
                        <TableCell className="font-mono text-xs">{key.start || "****"}...</TableCell>
                        <TableCell>{DateTime.fromISO(key.createdAt).toLocaleString(DateTime.DATETIME_SHORT)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteApiKey(key.id, key.name)}
                            disabled={deleteApiKey.isPending}
                          >
                            {t("Delete")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">{t("No API keys created yet")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("API Key Created")}</DialogTitle>
            <DialogDescription>{t("Save this API key securely. You won't be able to see it again.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("Your API Key")}</Label>
              <div className="flex space-x-2">
                <Input value={createdApiKey || ""} readOnly className="font-mono text-xs" />
                <Button variant="outline" onClick={() => createdApiKey && copyToClipboard(createdApiKey)}>
                  {t("Copy")}
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-3 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>{t("Important")}:</strong> {t("Store this key securely. It won't be displayed again.")}
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setShowApiKeyDialog(false);
                setCreatedApiKey(null);
              }}
              variant="success"
            >
              {t("Done")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
