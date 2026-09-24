import type { CustomQueryGenerationMessage, CustomQueryRow } from "../../../api/analytics/endpoints";

export type SortState = {
  column: string;
  direction: "asc" | "desc";
} | null;

export type QueryTab = {
  id: string;
  name: string;
  prompt: string;
  query: string;
  generationHistory: CustomQueryGenerationMessage[];
  rows: CustomQueryRow[];
  sort: SortState;
  resultError: string | null;
  hasRun: boolean;
};
