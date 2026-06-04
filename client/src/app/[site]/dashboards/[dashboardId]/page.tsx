"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import type { DashboardCard } from "@rybbit/shared";
import { ArrowLeft, Check, Loader2, Pencil, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import { useGetDashboard, useUpdateDashboard } from "../../../../api/analytics/hooks/useDashboards";
import { BucketSelection } from "../../../../components/BucketSelection";
import { DateSelector } from "../../../../components/DateSelector/DateSelector";
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
import { Input } from "../../../../components/ui/input";
import { Skeleton } from "../../../../components/ui/skeleton";
import { useSetPageTitle } from "../../../../hooks/useSetPageTitle";
import { useStore } from "../../../../lib/store";
import { DashboardCardEditor } from "../components/DashboardCardEditor";
import { DashboardCardView } from "../components/DashboardCardView";
import { createCard } from "../utils";

const ResponsiveGridLayout = WidthProvider(Responsive);
const GRID_COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };

export default function DashboardDetailPage() {
  useSetPageTitle("Dashboard");
  const params = useParams<{ site: string; dashboardId: string }>();
  const siteId = Number(params.site);
  const dashboardId = Number(params.dashboardId);
  const router = useRouter();

  const { time, setTime } = useStore();
  const { data: dashboard, isLoading } = useGetDashboard(siteId, dashboardId);
  const updateDashboard = useUpdateDashboard();

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [cards, setCards] = useState<DashboardCard[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  // Working copies fall back to the fetched dashboard until first edit.
  const workingName = name ?? dashboard?.name ?? "";
  const workingCards = cards ?? dashboard?.config.cards ?? [];

  const layout: Layout[] = useMemo(
    () =>
      workingCards.map(card => ({
        i: card.id,
        x: card.gridPos.x,
        y: card.gridPos.y,
        w: card.gridPos.w,
        h: card.gridPos.h,
        minW: 2,
        minH: 3,
      })),
    [workingCards]
  );

  const editingCard = workingCards.find(card => card.id === editingCardId) ?? null;

  const handleLayoutChange = (next: Layout[]) => {
    if (!editMode) return;
    let changed = false;
    const updated = workingCards.map(card => {
      const item = next.find(entry => entry.i === card.id);
      if (!item) return card;
      if (item.x !== card.gridPos.x || item.y !== card.gridPos.y || item.w !== card.gridPos.w || item.h !== card.gridPos.h) {
        changed = true;
        return { ...card, gridPos: { x: item.x, y: item.y, w: item.w, h: item.h } };
      }
      return card;
    });
    if (changed) {
      setCards(updated);
      setDirty(true);
    }
  };

  const handleAddCard = () => {
    const next = [...workingCards, createCard(workingCards.length + 1, workingCards)];
    setCards(next);
    setDirty(true);
  };

  const handleRemoveCard = (cardId: string) => {
    setCards(workingCards.filter(card => card.id !== cardId));
    setDirty(true);
  };

  const handleSaveCard = (updatedCard: DashboardCard) => {
    setCards(workingCards.map(card => (card.id === updatedCard.id ? updatedCard : card)));
    setDirty(true);
  };

  const handleSave = async () => {
    await updateDashboard.mutateAsync({
      siteId,
      dashboardId,
      name: workingName,
      config: { cards: workingCards },
    });
    setDirty(false);
  };

  const resetWorkingCopy = () => {
    setCards(null);
    setName(null);
    setDirty(false);
  };

  const handleExitEdit = () => {
    if (dirty) {
      setConfirmExit(true);
      return;
    }
    setEditMode(false);
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 p-2 md:p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="p-4 text-sm text-neutral-500">Dashboard not found.</div>;
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3 p-2 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button size="smIcon" variant="ghost" onClick={() => router.push(`/${siteId}/dashboards`)} aria-label="Back to dashboards">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {editMode ? (
            <Input
              value={workingName}
              placeholder="Dashboard name"
              onChange={event => {
                setName(event.target.value);
                setDirty(true);
              }}
              className="h-8 max-w-xs"
            />
          ) : (
            <h1 className="truncate text-lg font-semibold">{workingName}</h1>
          )}
          {editMode && dirty && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateSelector time={time} setTime={setTime} />
          <BucketSelection size="default" />
          <div className="mx-0.5 hidden h-5 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />
          {editMode ? (
            <>
              <Button variant="outline" onClick={handleAddCard}>
                <Plus className="h-4 w-4" />
                Add card
              </Button>
              <Button onClick={handleSave} disabled={!dirty || updateDashboard.isPending}>
                {updateDashboard.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </Button>
              <Button variant="ghost" onClick={handleExitEdit}>
                Done
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {workingCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-200 py-20 text-center dark:border-neutral-800">
          <div className="max-w-sm space-y-1">
            <div className="font-medium text-neutral-900 dark:text-neutral-100">This dashboard is empty</div>
            <p className="text-sm text-neutral-500">
              Add a card, write a query (or pick an example), and choose how to visualize it. Cards respect the time
              range above and can be dragged and resized.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setEditMode(true);
              handleAddCard();
            }}
          >
            <Plus className="h-4 w-4" />
            Add a card
          </Button>
        </div>
      ) : (
        <div
          className={
            editMode
              ? "rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 p-1 dark:border-neutral-800 dark:bg-neutral-950/40"
              : undefined
          }
        >
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
            breakpoints={BREAKPOINTS}
            cols={GRID_COLS}
            rowHeight={60}
            margin={[12, 12]}
            isDraggable={editMode}
            isResizable={editMode}
            resizeHandles={["nw", "ne", "sw", "se"]}
            draggableHandle=".dashboard-card-drag-handle"
            onLayoutChange={handleLayoutChange}
          >
            {workingCards.map(card => (
              <div key={card.id}>
                <DashboardCardView
                  siteId={siteId}
                  card={card}
                  editMode={editMode}
                  onEdit={() => setEditingCardId(card.id)}
                  onRemove={() => handleRemoveCard(card.id)}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      )}

      {editingCard && (
        <DashboardCardEditor
          siteId={siteId}
          card={editingCard}
          open={!!editingCard}
          onClose={() => setEditingCardId(null)}
          onSave={handleSaveCard}
        />
      )}

      <AlertDialog open={confirmExit} onOpenChange={open => !open && setConfirmExit(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have edits that haven&apos;t been saved. Leaving edit mode will revert them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                resetWorkingCopy();
                setEditMode(false);
                setConfirmExit(false);
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
