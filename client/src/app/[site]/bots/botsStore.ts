import { create } from "zustand";
import { type BotLayerKey } from "../../../api/analytics/endpoints";

type BotsStore = {
  selectedLayer: BotLayerKey | null;
  setSelectedLayer: (layer: BotLayerKey | null) => void;
};

export const useBotsStore = create<BotsStore>(set => ({
  selectedLayer: null,
  setSelectedLayer: layer => set({ selectedLayer: layer }),
}));
