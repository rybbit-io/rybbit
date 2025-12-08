"use client";

import { Minus, Plus } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useGetExcludedIPs, useUpdateExcludedIPs } from "@/api/admin/excludedIPs";
import { validateIPPattern } from "@/lib/ipValidation";

interface IPExclusionManagerProps {
  siteId: number;
  disabled?: boolean;
}

export function IPExclusionManager({ siteId, disabled = false }: IPExclusionManagerProps) {
  const { data: excludedIPsData, isLoading } = useGetExcludedIPs(siteId);
  const updateExcludedIPsMutation = useUpdateExcludedIPs();

  const [ipList, setIpList] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize IP list when data is loaded
  React.useEffect(() => {
    if (excludedIPsData?.excludedIPs) {
      setIpList(excludedIPsData.excludedIPs.length > 0 ? excludedIPsData.excludedIPs : [""]);
      setHasUnsavedChanges(false);
    } else if (!isLoading) {
      setIpList([""]);
    }
  }, [excludedIPsData, isLoading]);

  const addIPField = () => {
    setIpList([...ipList, ""]);
    setHasUnsavedChanges(true);
  };

  const removeIPField = (index: number) => {
    if (ipList.length > 1) {
      const newList = ipList.filter((_, i) => i !== index);
      setIpList(newList);
      setHasUnsavedChanges(true);
    }
  };

  const updateIPField = (index: number, value: string) => {
    const newList = [...ipList];
    newList[index] = value;
    setIpList(newList);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    // Filter out empty entries and validate
    const filteredIPs = ipList.filter(ip => ip.trim() !== "");
    const invalidIPs: string[] = [];
    const validationErrors: string[] = [];

    filteredIPs.forEach(ip => {
      const validation = validateIPPattern(ip);
      if (!validation.valid) {
        invalidIPs.push(ip);
        if (validation.error) {
          validationErrors.push(`${ip}: ${validation.error}`);
        }
      }
    });

    if (invalidIPs.length > 0) {
      const errorMessage =
        validationErrors.length > 0
          ? `Invalid IP patterns:\n${validationErrors.join("\n")}`
          : `Invalid IP patterns: ${invalidIPs.join(", ")}`;
      toast.error(errorMessage);
      return;
    }

    try {
      await updateExcludedIPsMutation.mutateAsync({
        siteId,
        excludedIPs: filteredIPs,
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleReset = () => {
    if (excludedIPsData?.excludedIPs) {
      setIpList(excludedIPsData.excludedIPs.length > 0 ? excludedIPsData.excludedIPs : [""]);
    } else {
      setIpList([""]);
    }
    setHasUnsavedChanges(false);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading IP exclusions...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-foreground block">IP Exclusions</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Exclude traffic from specific IP addresses or ranges. Supports single IPs (192.168.1.1), CIDR notation
          (192.168.1.0/24), and ranges (192.168.1.1-192.168.1.10).
        </p>
      </div>

      <div className="space-y-2">
        {ipList.map((ip, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Input
              value={ip}
              onChange={e => updateIPField(index, e.target.value)}
              placeholder="e.g., 192.168.1.1 or 10.0.0.0/24"
              disabled={disabled}
              className={!validateIPPattern(ip).valid && ip.trim() !== "" ? "border-red-500" : ""}
            />
            {ipList.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeIPField(index)}
                disabled={disabled}
                className="shrink-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addIPField}
          disabled={disabled || ipList.length >= 100}
          className="flex items-center space-x-1"
        >
          <Plus className="h-4 w-4" />
          <span>Add IP</span>
        </Button>

        {ipList.length >= 100 && (
          <span className="text-xs text-muted-foreground">Maximum 100 IP exclusions allowed</span>
        )}
      </div>

      {hasUnsavedChanges && (
        <div className="flex items-center space-x-2 pt-2">
          <Button onClick={handleSave} disabled={disabled || updateExcludedIPsMutation.isPending} size="sm">
            {updateExcludedIPsMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={disabled || updateExcludedIPsMutation.isPending}
            size="sm"
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
