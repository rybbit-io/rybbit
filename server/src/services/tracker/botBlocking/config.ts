/**
 * Minimum score from header heuristic checks to classify a request as a bot.
 * Each detection signal contributes points; if the total meets or exceeds this
 * threshold the request is silently rejected.
 */
export const BOT_SCORE_THRESHOLD = 5;

/**
 * Cloudflare Bot Management score cutoff.
 * Cloudflare scores range from 1-99 where lower means more likely automated.
 * Score 0 means not computed, so it is logged but not treated as a bot by itself.
 */
export const CLOUDFLARE_BOT_SCORE_THRESHOLD = 30;

/**
 * Minimum client-side bot signal score to classify a request as a bot.
 * The client runs checks (webdriver, outerHeight===0, SwiftShader, etc.)
 * and sends a single integer. A score >= this threshold is rejected.
 */
export const CLIENT_BOT_SCORE_THRESHOLD = 3;
