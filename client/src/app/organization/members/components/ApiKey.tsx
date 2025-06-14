"use client";
import { useState } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetOrganizationApiKey } from "@/api/admin/organizations";
import { toast } from "sonner";

export function ApiKey({
  organizationId,
  isOwnerOrAdmin,
}: {
  organizationId: string;
  isOwnerOrAdmin: boolean;
}) {
  const { data: apiKeyData, isLoading } = useGetOrganizationApiKey(organizationId);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleCopy = async () => {
    if (apiKeyData?.apiKey) {
      await navigator.clipboard.writeText(apiKeyData.apiKey);
      toast.success("Copied to clipboard");
    }
  };

  if (!isOwnerOrAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">API Key</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-10 bg-muted animate-pulse rounded w-full"></div>
          ) : (
            <>
              <Input
                readOnly
                type={isRevealed ? "text" : "password"}
                value={apiKeyData?.apiKey || "No API Key found"}
                placeholder="************************"
                className="flex-grow font-mono focus-visible:ring-0"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRevealed(!isRevealed)}
              >
                {isRevealed ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {isRevealed ? "Hide API Key" : "Reveal API Key"}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={!apiKeyData?.apiKey}
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy API Key</span>
              </Button>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Use this secret key to authenticate with our API. Do not share it publicly.
        </p>
      </CardContent>
    </Card>
  );
}
