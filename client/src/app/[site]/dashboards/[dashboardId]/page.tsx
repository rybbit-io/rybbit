"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import type { DashboardCard } from "@rybbit/shared";
import { ArrowLeft, Check, Loader2, Pencil, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import { useGetDashboard, useUpdateDashboard } from "../../../../api/analytics/hooks/useDashboards";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { useSetPageTitle } from "../../../../hooks/useSetPageTitle";
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

  const { data: dashboard, isLoading } = useGetDashboard(siteId, dashboardId);
  const updateDashboard = useUpdateDashboard();

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [cards, setCards] = useState<DashboardCard[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-96px)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!dashboard) {
    return <div className="p-4 text-sm text-neutral-500">Dashboard not found.</div>;
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3 p-2 md:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button size="smIcon" variant="ghost" onClick={() => router.push(`/${siteId}/dashboards`)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {editMode ? (
            <Input
              value={workingName}
              onChange={event => {
                setName(event.target.value);
                setDirty(true);
              }}
              className="h-8 max-w-xs"
            />
          ) : (
            <h1 className="truncate text-lg font-semibold">{workingName}</h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {editMode && (
            <Button variant="outline" onClick={handleAddCard}>
              <Plus className="h-4 w-4" />
              Add card
            </Button>
          )}
          {editMode ? (
            <Button onClick={handleSave} disabled={!dirty || updateDashboard.isPending}>
              {updateDashboard.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {editMode && (
            <Button
              variant="ghost"
              onClick={() => {
                // Discard local edits and exit edit mode.
                setCards(null);
                setName(null);
                setDirty(false);
                setEditMode(false);
              }}
            >
              Done
            </Button>
          )}
        </div>
      </div>

      {workingCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-200 py-16 text-center dark:border-neutral-800">
          <div className="text-sm text-neutral-500">This dashboard has no cards yet.</div>
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
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
          breakpoints={BREAKPOINTS}
          cols={GRID_COLS}
          rowHeight={60}
          margin={[12, 12]}
          isDraggable={editMode}
          isResizable={editMode}
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
    </div>
  );
}
