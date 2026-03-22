import { Edit2, MoreVertical, Power, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { UptimeMonitor, useDeleteMonitor, useUpdateMonitor } from "../../../../api/uptime/monitors";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { cn } from "../../../../lib/utils";
import { MonitorDialog } from "./dialog";

export function MonitorActions({ monitor }: { monitor?: UptimeMonitor }) {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const deleteMonitor = useDeleteMonitor();
  const updateMonitor = useUpdateMonitor();

  const handleToggle = async () => {
    if (!monitor) return;

    setIsToggling(true);
    try {
      await updateMonitor.mutateAsync({
        monitorId: monitor.id,
        data: { enabled: !monitor.enabled },
      });
      toast.success(`Monitor ${monitor.enabled ? "disabled" : "enabled"} successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update monitor");
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMonitor.mutateAsync(monitor?.id ?? 0);
      toast.success("Monitor deleted successfully");
      router.push("/uptime/monitors");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete monitor");
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {monitor && (
          <Button
            size="sm"
            onClick={handleToggle}
            disabled={isToggling || !monitor}
            className={cn(
              "flex items-center gap-2",
              monitor?.enabled
                ? "dark:text-green-500 hover:dark:text-green-600"
                : "text-neutral-500 hover:text-neutral-400"
            )}
          >
            <Power className="h-4 w-4" />
            {monitor?.enabled ? "On" : "Off"}
          </Button>
        )}
        <Button size="sm" onClick={() => setShowEditDialog(true)} className="flex items-center gap-2">
          <Edit2 className="h-4 w-4" />
          Edit
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-500 focus:text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete Monitor
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {monitor && <MonitorDialog monitor={monitor} open={showEditDialog} onOpenChange={setShowEditDialog} />}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the monitor "
              {monitor?.name ||
                (monitor?.monitorType === "http"
                  ? monitor?.httpConfig?.url
                  : `${monitor?.tcpConfig?.host}:${monitor?.tcpConfig?.port}`)}
              " and all its historical data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant={"destructive"}>
              Delete Monitor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
