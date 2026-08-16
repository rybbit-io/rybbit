import { defineConfig } from "vitest/config";
import path from "path";

// Two projects instead of one `environment` because component tests need a DOM
// while the pure-logic tests do not. `.tsx` tests run in jsdom, `.ts` tests in
// node. (The server uses `environmentMatchGlobs` for the same split, but that
// option was removed in Vitest 4 — `projects` is its replacement.)
const shared = {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
};

export default defineConfig({
  ...shared,
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: "node",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        ...shared,
        test: {
          name: "dom",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
        },
      },
    ],
  },
});
