import { create } from "zustand";
import { type BotLayerKey } from "../../../api/analytics/endpoints";

/** Which question the page is answering. */
export type BotsLens = "ai" | "all";

type BotsStore = {
  lens: BotsLens;
  setLens: (lens: BotsLens) => void;
  selectedLayer: BotLayerKey | null;
  setSelectedLayer: (layer: BotLayerKey | null) => void;
};

export const useBotsStore = create<BotsStore>(set => ({
  lens: "ai",
  // Layer selection belongs to the all-bots view. Carrying it into the AI lens
  // would silently narrow every AI number to one detection layer with nothing
  // on screen saying so.
  setLens: lens => set(lens === "ai" ? { lens, selectedLayer: null } : { lens }),
  selectedLayer: null,
  setSelectedLayer: layer => set({ selectedLayer: layer }),
}));
