import { atom } from "jotai";

export type MinutesType = "5" | "15" | "30" | "60" | "120" | "240" | "480" | "720" | "1440";

export const minutesAtom = atom<MinutesType>("30");
