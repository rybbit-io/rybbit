"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import React, { useCallback, useEffect, useState } from "react";
import { SortableItem } from "../../../components/SortableItem";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { MainSection } from "./components/MainSection/MainSection";
import { Countries } from "./components/sections/Countries";
import { Devices } from "./components/sections/Devices";
import { Events } from "./components/sections/Events";
import { Pages } from "./components/sections/Pages";
import { Referrers } from "./components/sections/Referrers";
import { Weekdays } from "./components/sections/Weekdays";

const blocksMap: { [key: string]: React.FC } = { Devices, Pages, Referrers, Countries, Events, Weekdays };

export default function MainPage() {
  const { site } = useStore();

  if (!site) {
    return null;
  }

  return <MainPageContent site={site} />;
}

function MainPageContent({ site }: { site: string }) {
  useSetPageTitle("Rybbit · Main");

  const localStorageName = `dashboard-blocks-order-${site}`;

  const blocksPositionOrder = ["Devices", "Pages", "Referrers", "Countries", "Events", "Weekdays"];

  const [blocksOrder, setBlocksOrder] = useState<string[]>(blocksPositionOrder);

  useEffect(() => {
    const savedOrder = localStorage.getItem(localStorageName);

    if (!savedOrder) return;

    try {
      const parsedOrder = JSON.parse(savedOrder);

      if (
        Array.isArray(parsedOrder) &&
        parsedOrder.every((item) => blocksPositionOrder.includes(item)) &&
        parsedOrder.length === blocksPositionOrder.length
      ) {
        setBlocksOrder(parsedOrder);
      } else {
        setBlocksOrder(blocksPositionOrder);
      }
    } catch (error) {
      console.error("Failed to parse saved layout order:", error);

      setBlocksOrder(blocksPositionOrder);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setBlocksOrder((prevItems) => {
        const oldIndex = prevItems.indexOf(active.id as string);
        const newIndex = prevItems.indexOf(over?.id as string);
        const newOrder = arrayMove(prevItems, oldIndex, newIndex);

        localStorage.setItem(localStorageName, JSON.stringify(newOrder));

        return newOrder;
      });
    }
  }, []);

  return (
    <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3 ">
      <SubHeader />

      <MainSection />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocksOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
            {blocksOrder.map((id) => (
              <SortableItem key={id} id={id} Component={blocksMap[id]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
