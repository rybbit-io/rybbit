"use client";
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
import { DndContext, useDraggable } from "@dnd-kit/core";

function Draggable(props) {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: 'draggable',
  });
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  
  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {props.children}
    </button>
  );
}

export default function MainPage() {
  const { site } = useStore();

  if (!site) {
    return null;
  }

  return <MainPageContent />;
}

function MainPageContent() {
  useSetPageTitle("Rybbit · Main");

  return (
    <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3 ">
      <SubHeader />
      <MainSection />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
        <DndContext>
          <Draggable>
            <Devices />
            <Pages />
            <Referrers />
            <Countries />
            <Events />
            <Weekdays />
          </Draggable>
        </DndContext>
      </div>
    </div>
  );
}
