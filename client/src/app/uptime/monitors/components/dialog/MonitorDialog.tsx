import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateMonitor, useUpdateMonitor, UptimeMonitor } from "@/api/uptime/monitors";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { createMonitorSchema, updateMonitorSchema } from "../monitorSchemas";
import { Form } from "@/components/ui/form";
import { authClient } from "../../../../../lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/basic-tabs";
import { GeneralTab } from "./GeneralTab";
import { AdvancedTab } from "./AdvancedTab";
import { RegionsTab } from "./RegionsTab";
import { NotificationsTab } from "./NotificationsTab";
import { IS_CLOUD } from "@/lib/const";
import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "../../../../../api/utils";

interface MonitorDialogProps {
  monitor?: UptimeMonitor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MonitorDialog({ monitor, open, onOpenChange }: MonitorDialogProps) {
  const { data: activeOrganization, isPending } = authClient.useActiveOrganization();
  const createMonitor = useCreateMonitor();
  const updateMonitor = useUpdateMonitor();
  const isEdit = !!monitor;

  // Fetch available regions
  const { data: regionsData } = useQuery({
    queryKey: ["uptime-regions"],
    queryFn: async () => {
      const response = await authedFetch<{
        regions: Array<{ code: string; name: string; isHealthy: boolean; isLocal: boolean }>;
      }>("/uptime/regions");
      return response.regions;
    },
    enabled: open && IS_CLOUD,
  });

  const form = useForm<any>({
    resolver: zodResolver(isEdit ? updateMonitorSchema : createMonitorSchema),
    defaultValues: isEdit
      ? {
          name: monitor.name,
          intervalSeconds: monitor.intervalSeconds,
          enabled: monitor.enabled,
          httpConfig: monitor.httpConfig
            ? {
                url: monitor.httpConfig.url,
                method: monitor.httpConfig.method as any,
                headers: monitor.httpConfig.headers,
                body: monitor.httpConfig.body,
                auth: monitor.httpConfig.auth,
                followRedirects: monitor.httpConfig.followRedirects ?? true,
                timeoutMs: monitor.httpConfig.timeoutMs ?? 30000,
                ipVersion: monitor.httpConfig.ipVersion ?? "any",
                userAgent: monitor.httpConfig.userAgent,
              }
            : undefined,
          tcpConfig: monitor.tcpConfig
            ? {
                host: monitor.tcpConfig.host,
                port: monitor.tcpConfig.port,
                timeoutMs: monitor.tcpConfig.timeoutMs ?? 30000,
              }
            : undefined,
          validationRules: monitor.validationRules || [],
          monitoringType: monitor.monitoringType || "local",
          selectedRegions: monitor.selectedRegions || ["local"],
        }
      : {
          organizationId: activeOrganization?.id || "",
          name: "", // Optional - will be empty by default
          monitorType: "http" as const,
          intervalSeconds: 180,
          enabled: true,
          httpConfig: {
            url: "",
            method: "GET" as const,
            followRedirects: true,
            timeoutMs: 30000,
            ipVersion: "any" as const,
          },
          validationRules: [],
          monitoringType: IS_CLOUD ? "global" : "local",
          selectedRegions: IS_CLOUD ? [] : ["local"], // Empty array for cloud, will be populated in RegionsTab
        },
  });

  const monitorType = isEdit ? monitor.monitorType : form.watch("monitorType");

  const onSubmit = async (data: any) => {
    try {
      if (isEdit) {
        await updateMonitor.mutateAsync({
          monitorId: monitor.id,
          data,
        });
        toast.success("Monitor updated successfully");
      } else {
        await createMonitor.mutateAsync(data);
        toast.success("Monitor created successfully");
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.response?.data?.error || `Failed to ${isEdit ? "update" : "create"} monitor`);
    }
  };

  // Set organization ID when active organization changes (create mode only)
  useEffect(() => {
    if (!isEdit && activeOrganization?.id) {
      form.setValue("organizationId", activeOrganization.id);
    }
  }, [activeOrganization, form, isEdit]);

  // Initialize regions for new monitors in cloud mode
  useEffect(() => {
    if (open && !isEdit && IS_CLOUD && regionsData) {
      const globalRegions = regionsData.filter(r => !r.isLocal && r.isHealthy);
      if (globalRegions.length > 0) {
        const currentRegions = form.getValues("selectedRegions");
        // Only set if empty or has default "local" value
        if (
          !currentRegions ||
          currentRegions.length === 0 ||
          (currentRegions.length === 1 && currentRegions[0] === "local")
        ) {
          form.setValue(
            "selectedRegions",
            globalRegions.map(r => r.code)
          );
        }
      }
    }
  }, [open, isEdit, IS_CLOUD, regionsData, form]);

  // Reset form when dialog closes or monitor changes
  useEffect(() => {
    if (!open) {
      form.reset();
    } else if (isEdit && monitor) {
      form.reset({
        name: monitor.name,
        intervalSeconds: monitor.intervalSeconds,
        enabled: monitor.enabled,
        httpConfig: monitor.httpConfig
          ? {
              url: monitor.httpConfig.url,
              method: monitor.httpConfig.method as any,
              headers: monitor.httpConfig.headers,
              body: monitor.httpConfig.body,
              auth: monitor.httpConfig.auth,
              followRedirects: monitor.httpConfig.followRedirects ?? true,
              timeoutMs: monitor.httpConfig.timeoutMs ?? 30000,
              ipVersion: monitor.httpConfig.ipVersion ?? "any",
              userAgent: monitor.httpConfig.userAgent,
            }
          : undefined,
        tcpConfig: monitor.tcpConfig
          ? {
              host: monitor.tcpConfig.host,
              port: monitor.tcpConfig.port,
              timeoutMs: monitor.tcpConfig.timeoutMs ?? 30000,
            }
          : undefined,
        validationRules: monitor.validationRules || [],
        monitoringType: monitor.monitoringType || "local",
        selectedRegions: monitor.selectedRegions || ["local"],
      });
    }
  }, [monitor, open, form, isEdit]);

  // Update form when monitor type changes (create mode only)
  useEffect(() => {
    if (!isEdit && form.watch) {
      const subscription = form.watch((value, { name }) => {
        if (name === "monitorType") {
          if (value.monitorType === "tcp") {
            form.setValue("httpConfig", undefined as any);
            form.setValue("tcpConfig", {
              host: "",
              port: 80,
              timeoutMs: 30000,
            });
          } else {
            form.setValue("tcpConfig", undefined as any);
            form.setValue("httpConfig", {
              url: "",
              method: "GET" as const,
              followRedirects: true,
              timeoutMs: 30000,
              ipVersion: "any" as const,
            });
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, isEdit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <Form {...form}>
          <form>
            <DialogHeader>
              <DialogTitle>{isEdit ? "Edit" : "Create New"} Monitor</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Update the configuration for this monitor."
                  : "Set up a new uptime monitor to track the availability of your endpoints."}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="mt-4">
              <TabsList className="">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="regions">Regions</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <GeneralTab form={form} monitor={monitor} isEdit={isEdit} monitorType={monitorType} />
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <AdvancedTab form={form} monitorType={monitorType} />
              </TabsContent>

              <TabsContent value="regions" className="space-y-4 mt-4">
                <RegionsTab />
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4 mt-4">
                <NotificationsTab />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMonitor.isPending || updateMonitor.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={
                  (isEdit ? updateMonitor.isPending : createMonitor.isPending) ||
                  (!isEdit && (isPending || !activeOrganization))
                }
              >
                {(createMonitor.isPending || updateMonitor.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Update" : "Create"} Monitor
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
