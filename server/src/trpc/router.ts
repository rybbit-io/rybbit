import { router } from "./trpc.js";
import { analyticsRouter } from "./routers/analytics.js";

export const appRouter = router({
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
