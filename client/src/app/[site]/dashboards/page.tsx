"use client";

import { LayoutGrid, Loader2, Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateDashboard, useDeleteDashboard, useGetDashboards } from "../../../api/analytics/hooks/useDashboards";
import { Button } from "../../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Card } from "../../../components/ui/card";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";

export default function DashboardsListPage() {
  useSetPageTitle("Dashboards");
  const params = useParams<{ site: string }>();
  const siteId = Number(params.site);
  const router = useRouter();

  const { data: dashboards, isLoading } = useGetDashboards(siteId);
  const createDashboard = useCreateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const handleCreate = async () => {
    const result = await createDashboard.mutateAsync({ siteId, name: "Untitled dashboard" });
    router.push(`/${siteId}/dashboards/${result.dashboardId}`);
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 p-2 md:p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Dashboards</h1>
        <Button onClick={handleCreate} disabled={createDashboard.isPending}>
          {createDashboard.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New dashboard
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : !dashboards || dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-200 py-16 text-center dark:border-neutral-800">
          <LayoutGrid className="h-8 w-8 text-neutral-400" />
          <div className="text-sm text-neutral-500">No dashboards yet.</div>
          <Button variant="outline" onClick={handleCreate} disabled={createDashboard.isPending}>
            <Plus className="h-4 w-4" />
            Create your first dashboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map(dashboard => (
            <Card
              key={dashboard.dashboardId}
              className="group flex cursor-pointer items-center justify-between p-4 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
              onClick={() => router.push(`/${siteId}/dashboards/${dashboard.dashboardId}`)}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{dashboard.name}</div>
                <div className="text-xs text-neutral-500">{dashboard.config.cards.length} cards</div>
              </div>
              <Button
                size="smIcon"
                variant="ghost"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={event => {
                  event.stopPropagation();
                  setPendingDelete(dashboard.dashboardId);
                }}
                aria-label="Delete dashboard"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete dashboard?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete !== null) {
                  deleteDashboard.mutate({ siteId, dashboardId: pendingDelete });
                }
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
