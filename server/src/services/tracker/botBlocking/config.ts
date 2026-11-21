/**
 * Minimum score from header heuristic checks to classify a request as a bot.
 * Each detection signal contributes points; if the total meets or exceeds this
 * threshold the request is silently rejected.
 */
export const BOT_SCORE_THRESHOLD = 5;

/**
 * Minimum client-side bot signal score to classify a request as a bot.
 * The client sends one cached weighted integer. A score >= this threshold is rejected.
 */
export const CLIENT_BOT_SCORE_THRESHOLD = 3;
