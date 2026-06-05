"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import type { DashboardCard } from "@rybbit/shared";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Pencil, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Skeleton } from "../../../../components/ui/skeleton";
import { toast } from "../../../../components/ui/sonner";
import { cn } from "../../../../lib/utils";
import { useSetPageTitle } from "../../../../hooks/useSetPageTitle";
import { canGoForward, goBack, goForward, useStore } from "../../../../lib/store";
import { DashboardCardEditor } from "../components/DashboardCardEditor";
import { DashboardCardView } from "../components/DashboardCardView";
import { NewCardDialog } from "../components/NewCardDialog";
import type { DashboardExample } from "../examples";
import { cloneCard, createCard, createCardFromExample, MAX_CARDS_PER_DASHBOARD } from "../utils";

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
  const [addingCard, setAddingCard] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Action to run once the user confirms discarding (exit edit, or navigate away).
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Working copies fall back to the fetched dashboard until first edit.
  const workingName = name ?? dashboard?.name ?? "";
  const workingCards = cards ?? dashboard?.config.cards ?? [];
  const atCardLimit = workingCards.length >= MAX_CARDS_PER_DASHBOARD;

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
      if (
        item.x !== card.gridPos.x ||
        item.y !== card.gridPos.y ||
        item.w !== card.gridPos.w ||
        item.h !== card.gridPos.h
      ) {
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

  // Bring a freshly added/cloned card into view (new cards often land past the
  // fold) and flash it so the click has visible feedback.
  const flashNewCard = useCallback((cardId: string) => {
    setHighlightId(cardId);
    window.setTimeout(() => {
      document.getElementById(`dash-card-${cardId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    window.setTimeout(() => setHighlightId(current => (current === cardId ? null : current)), 1800);
  }, []);

  const handleAddCard = useCallback(() => setAddingCard(true), []);

  // Add the chosen card (blank or seeded from a preset) to the working copy.
  // Blank cards need a query before they render, so we drop straight into the
  // editor; presets are already complete and render live in the grid.
  const handleCreateCard = useCallback(
    (example: DashboardExample | null) => {
      if (workingCards.length >= MAX_CARDS_PER_DASHBOARD) {
        toast.error(`A dashboard can have at most ${MAX_CARDS_PER_DASHBOARD} cards`);
        setAddingCard(false);
        return;
      }
      setEditMode(true);
      const index = workingCards.length + 1;
      const newCard = example ? createCardFromExample(index, workingCards, example) : createCard(index, workingCards);
      setCards([...workingCards, newCard]);
      setDirty(true);
      setAddingCard(false);
      if (example) {
        flashNewCard(newCard.id);
      } else {
        setEditingCardId(newCard.id);
      }
    },
    [workingCards, flashNewCard]
  );

  const handleCloneCard = useCallback(
    (cardId: string) => {
      if (workingCards.length >= MAX_CARDS_PER_DASHBOARD) {
        toast.error(`A dashboard can have at most ${MAX_CARDS_PER_DASHBOARD} cards`);
        return;
      }
      const index = workingCards.findIndex(card => card.id === cardId);
      if (index === -1) return;
      const newCard = cloneCard(workingCards[index]);
      const next = [...workingCards];
      next.splice(index + 1, 0, newCard);
      setCards(next);
      setDirty(true);
      flashNewCard(newCard.id);
    },
    [workingCards, flashNewCard]
  );

  const handleRemoveCard = (cardId: string) => {
    setCards(workingCards.filter(card => card.id !== cardId));
    setDirty(true);
  };

  const handleSaveCard = (updatedCard: DashboardCard) => {
    setCards(workingCards.map(card => (card.id === updatedCard.id ? updatedCard : card)));
    setDirty(true);
  };

  const resetWorkingCopy = useCallback(() => {
    setCards(null);
    setName(null);
    setDirty(false);
  }, []);

  const exitEditMode = useCallback(() => {
    resetWorkingCopy();
    setEditMode(false);
  }, [resetWorkingCopy]);

  // Any path that leaves unsaved edits routes through one confirm dialog.
  const guardedRun = useCallback(
    (action: () => void) => {
      if (editMode && dirty) {
        pendingActionRef.current = action;
        setConfirmExit(true);
        return;
      }
      action();
    },
    [editMode, dirty]
  );

  const handleCancel = useCallback(() => guardedRun(exitEditMode), [guardedRun, exitEditMode]);

  const handleBack = useCallback(
    () => guardedRun(() => router.push(`/${siteId}/dashboards`)),
    [guardedRun, router, siteId]
  );

  const handleSave = useCallback(async () => {
    try {
      await updateDashboard.mutateAsync({
        siteId,
        dashboardId,
        name: workingName,
        config: { cards: workingCards },
      });
      toast.success("Dashboard saved");
      resetWorkingCopy();
      setEditMode(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save dashboard");
    }
  }, [updateDashboard, siteId, dashboardId, workingName, workingCards, resetWorkingCopy]);

  // Warn before a full reload / tab close with unsaved edits.
  useEffect(() => {
    if (!(editMode && dirty)) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editMode, dirty]);

  // Next.js client-side links do not trigger beforeunload, so guard sidebar
  // and other internal link clicks while the working copy has unsaved edits.
  useEffect(() => {
    if (!(editMode && dirty)) return;

    const handler = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(rawHref, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const nextRoute = `${url.pathname}${url.search}`;
      const currentRoute = `${window.location.pathname}${window.location.search}`;
      if (nextRoute === currentRoute) return;

      event.preventDefault();
      event.stopPropagation();
      pendingActionRef.current = () => router.push(`${nextRoute}${url.hash}`);
      setConfirmExit(true);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [editMode, dirty, router]);

  // Edit-mode keyboard shortcuts: Cmd/Ctrl+S saves, Esc cancels.
  useEffect(() => {
    if (!editMode) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !updateDashboard.isPending) handleSave();
      } else if (event.key === "Escape" && !confirmExit && !editingCardId && !addingCard) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editMode, dirty, confirmExit, editingCardId, addingCard, updateDashboard.isPending, handleSave, handleCancel]);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 p-2 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="hidden h-9 w-20 rounded-lg sm:block" />
          </div>
        </div>
        {/* The real grid layout is unknown until it loads, so a fixed card
            arrangement makes the load-in jump. A neutral spinner doesn't. */}
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
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
          <Button size="smIcon" variant="ghost" onClick={handleBack} aria-label="Back to dashboards">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {editMode ? (
            <input
              value={workingName}
              placeholder="Dashboard name"
              aria-label="Dashboard name"
              onChange={event => {
                setName(event.target.value);
                setDirty(true);
              }}
              className="-mx-2 min-w-0 max-w-xs rounded-md bg-transparent px-2 py-0.5 text-lg font-semibold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 hover:bg-neutral-100 focus:bg-neutral-100 focus-visible:ring-1 focus-visible:ring-neutral-300 dark:text-neutral-50 dark:placeholder:text-neutral-600 dark:hover:bg-neutral-900 dark:focus:bg-neutral-900 dark:focus-visible:ring-neutral-700"
            />
          ) : (
            <h1 className="truncate text-lg font-semibold">{workingName}</h1>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateSelector time={time} setTime={setTime} />
          <div className="flex items-center">
            <Button
              variant="secondary"
              size="icon"
              onClick={goBack}
              disabled={time.mode === "past-minutes"}
              className="h-8 w-8 rounded-r-none"
              aria-label="Previous date range"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={goForward}
              disabled={!canGoForward(time)}
              className="-ml-px h-8 w-8 rounded-l-none"
              aria-label="Next date range"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <BucketSelection size="sm" />
          <div className="mx-0.5 hidden h-5 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />
          {editMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCard}
                disabled={atCardLimit}
                title={atCardLimit ? `A dashboard can have at most ${MAX_CARDS_PER_DASHBOARD} cards` : undefined}
              >
                <Plus className="h-4 w-4" />
                Add card
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!dirty || updateDashboard.isPending}>
                {updateDashboard.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
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
          <Button variant="outline" onClick={handleAddCard}>
            <Plus className="h-4 w-4" />
            Add a card
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-lg border border-transparent transition-colors duration-200 motion-reduce:transition-none",
            editMode &&
              "border-dashed border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-950/40"
          )}
        >
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
            breakpoints={BREAKPOINTS}
            cols={GRID_COLS}
            rowHeight={60}
            margin={[12, 12]}
            containerPadding={[0, 0]}
            isDraggable={editMode}
            isResizable={editMode}
            draggableHandle=".dashboard-card-drag-handle"
            draggableCancel=".dashboard-card-no-drag"
            onLayoutChange={handleLayoutChange}
          >
            {workingCards.map(card => (
              <div
                key={card.id}
                id={`dash-card-${card.id}`}
                className={cn(
                  "rounded-lg transition-shadow duration-300 motion-reduce:transition-none",
                  highlightId === card.id && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                )}
              >
                <DashboardCardView
                  siteId={siteId}
                  card={card}
                  editMode={editMode}
                  onEdit={() => setEditingCardId(card.id)}
                  onClone={() => handleCloneCard(card.id)}
                  onRemove={() => setPendingRemoveId(card.id)}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      )}

      <NewCardDialog open={addingCard} onClose={() => setAddingCard(false)} onSelect={handleCreateCard} />

      {editingCard && (
        <DashboardCardEditor
          siteId={siteId}
          card={editingCard}
          open={!!editingCard}
          onClose={() => setEditingCardId(null)}
          onSave={handleSaveCard}
        />
      )}

      <AlertDialog open={pendingRemoveId !== null} onOpenChange={open => !open && setPendingRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this card?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const title = workingCards.find(card => card.id === pendingRemoveId)?.title?.trim();
                return title
                  ? `"${title}" will be removed from this dashboard. You can still cancel before saving.`
                  : "This card will be removed from this dashboard. You can still cancel before saving.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep card</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingRemoveId !== null) handleRemoveCard(pendingRemoveId);
                setPendingRemoveId(null);
              }}
            >
              Remove card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmExit}
        onOpenChange={open => {
          if (!open) {
            setConfirmExit(false);
            pendingActionRef.current = null;
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have edits that haven&apos;t been saved. Leaving now will revert them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const action = pendingActionRef.current ?? exitEditMode;
                pendingActionRef.current = null;
                setConfirmExit(false);
                action();
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
