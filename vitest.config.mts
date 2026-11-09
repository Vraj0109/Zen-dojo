import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Run date tests in a zone with DST so day math is checked across clock changes.
process.env.TZ = "America/New_York";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // "server-only" throws outside a React Server environment; tests are server-side anyway.
      "server-only": r("./test/empty-module.ts"),
      "@": r("./apps/web"),
    },
  },
  test: {
    // Tests that compile code or install packs take more than the 5 s default when the machine is busy.
    testTimeout: 30_000,
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "apps/desktop/server/**", "apps/desktop/dist/**"],
  },
});
