"use client";

import { LayoutGrid, Loader2, Plus, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
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
import { Skeleton } from "../../../components/ui/skeleton";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";

function relativeUpdated(updatedAt: string | null | undefined): string | null {
  if (!updatedAt) return null;
  let dt = DateTime.fromISO(updatedAt, { zone: "utc" });
  if (!dt.isValid) dt = DateTime.fromSQL(updatedAt, { zone: "utc" });
  return dt.isValid ? dt.toRelative() : null;
}

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Dashboards</h1>
          <p className="text-sm text-neutral-500">
            Build views from custom SQL queries, scoped to the site time range.
          </p>
        </div>
        <Button onClick={handleCreate} disabled={createDashboard.isPending}>
          {createDashboard.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New dashboard
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="flex items-center gap-3 p-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : !dashboards || dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-200 py-20 text-center dark:border-neutral-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-850">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <div className="max-w-sm space-y-1">
            <div className="font-medium text-neutral-900 dark:text-neutral-100">No dashboards yet</div>
            <p className="text-sm text-neutral-500">
              A dashboard is a grid of cards, each backed by its own query. Start with a built-in example, then resize
              and arrange the cards to fit how you read your data.
            </p>
          </div>
          <Button variant="outline" onClick={handleCreate} disabled={createDashboard.isPending}>
            <Plus className="h-4 w-4" />
            Create your first dashboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map(dashboard => {
            const cardCount = dashboard.config.cards.length;
            const updated = relativeUpdated(dashboard.updatedAt);
            return (
              <Card
                key={dashboard.dashboardId}
                className="group flex cursor-pointer items-center gap-3 p-4 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
                onClick={() => router.push(`/${siteId}/dashboards/${dashboard.dashboardId}`)}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 transition-colors group-hover:text-neutral-700 dark:bg-neutral-850 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{dashboard.name}</div>
                  <div className="text-xs text-neutral-500">
                    {cardCount} {cardCount === 1 ? "card" : "cards"}
                    {updated && ` · updated ${updated}`}
                  </div>
                </div>
                <Button
                  size="smIcon"
                  variant="ghost"
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={event => {
                    event.stopPropagation();
                    setPendingDelete(dashboard.dashboardId);
                  }}
                  aria-label={`Delete ${dashboard.name}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the dashboard and all of its cards. This action cannot be undone.
            </AlertDialogDescription>
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
              Delete dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
