// This file exports only the AppRouter type without any runtime dependencies
// It can be safely imported by the client during Docker builds

import type { appRouter } from "./router.js";

export type AppRouter = typeof appRouter;
