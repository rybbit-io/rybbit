import { siteConfig } from "../../../lib/siteConfig.js";
import { type BotSourceTable } from "./utils.js";

export interface BotSource {
  /** Whether detected bots are kept out of the site's analytics. */
  blocking: boolean;
  table: BotSourceTable;
}

/**
 * Which audit table holds a site's detections right now.
 *
 * Detection runs for every site; `blockBots` only decides where the row goes.
 * A site with blocking off writes nothing to `bot_events`, so reading that
 * table alone showed it an empty page while `bot_observations` held the
 * answer. The setting is read here, on the server, rather than taken from the
 * request: the caller does not get to pick a table.
 *
 * The choice follows the current setting, so a site that switched recently
 * sees only the rows written since the switch.
 */
export async function resolveBotSource(siteId: string | number): Promise<BotSource> {
  const config = await siteConfig.getConfig(Number(siteId));
  // No configuration (a Postgres blip) keeps the historical behaviour.
  const blocking = config?.blockBots ?? true;
  return { blocking, table: blocking ? "bot_events" : "bot_observations" };
}
