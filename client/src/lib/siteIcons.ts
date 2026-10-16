import { create } from "zustand";

export const useSiteIcons = create<{
  versions: Record<number, number>;
  invalidate: (siteId: number) => void;
}>(set => ({
  versions: {},
  invalidate: siteId =>
    set(state => ({
      versions: { ...state.versions, [siteId]: (state.versions[siteId] ?? 0) + 1 },
    })),
}));
