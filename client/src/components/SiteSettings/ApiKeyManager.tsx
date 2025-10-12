"use client";

import { Copy, Eye, EyeOff, Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

import { useGenerateApiKey, useGetApiConfig, useRevokeApiKey } from "../../api/admin/apiKey";

interface ApiKeyManagerProps {
  siteId: number;
  disabled?: boolean;
}

export function ApiKeyManager({ siteId, disabled = false }: ApiKeyManagerProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  // API key hooks
  const { data: apiConfig, isLoading: isLoadingApiConfig } = useGetApiConfig(siteId);
  const generateApiKey = useGenerateApiKey();
  const revokeApiKey = useRevokeApiKey();

  // Use the API key from config or from newly generated key
  const apiKey = apiConfig?.apiKey || null;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">API Key</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Generate an API key to track events from{" "}
          <Link
            href="https://rybbit.io/docs/local-tracking"
            target="_blank"
            className="text-indigo-300 hover:underline"
          >
            localhost
          </Link>
          , server-side applications, or mobile apps using the{" "}
          <Link href="https://rybbit.io/docs/api" target="_blank" className="text-indigo-300 hover:underline">
            API endpoint
          </Link>
          .
        </p>
      </div>

      {isLoadingApiConfig ? (
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-32" />
        </div>
      ) : apiKey ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={showApiKey && apiKey ? apiKey : "rb_••••••••••••••••••••••••••••••••••"}
                  readOnly
                  className="pr-20 font-mono text-xs"
                />
                <div className="absolute right-1 top-1 flex space-x-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="h-7 px-2"
                  >
                    {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  {apiKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKey);
                        toast.success("API key copied to clipboard");
                      }}
                      className="h-7 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={disabled || revokeApiKey.isPending}>
                  Revoke API Key
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately invalidate the current API key. Any applications using this key will stop
                    working.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      try {
                        await revokeApiKey.mutateAsync(siteId);
                        setShowApiKey(false);
                        toast.success("API key revoked successfully");
                      } catch (error) {
                        toast.error("Failed to revoke API key");
                      }
                    }}
                    variant="destructive"
                  >
                    Revoke Key
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : (
        <Button
          onClick={async () => {
            try {
              const result = await generateApiKey.mutateAsync(siteId);
              if (result.apiKey) {
                setShowApiKey(true);
                toast.success("API key generated successfully");
              }
            } catch (error) {
              toast.error("Failed to generate API key");
            }
          }}
          disabled={disabled || generateApiKey.isPending}
        >
          <Key className="h-4 w-4 mr-2" />
          Generate API Key
        </Button>
      )}
    </div>
  );
}
