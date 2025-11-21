import { loader } from "fumadocs-core/source";
import { updates } from "@/.source";

export const updatesSource = loader({
  baseUrl: "/updates",
  source: updates.toFumadocsSource?.() ?? updates,
});