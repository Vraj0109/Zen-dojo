import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Run date tests in a zone with DST so day math is checked across clock changes.
process.env.TZ = "America/New_York";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const FAST_EXCLUDE = [
  "**/judge/judge.test.ts",
  "**/judge/project-run.test.ts",
  "**/judge/pack-tools.test.ts",
  "**/judge/judge-tle.test.ts",
  "**/lld-projects.test.ts",
  "**/core-code.test.ts",
  "**/design-code.test.ts",
  "**/pattern-article-code.test.ts",
];

export default defineConfig(({ mode }) => {
  const isFast =
    mode === "fast" ||
    process.env.FAST_TEST === "1" ||
    process.env.FAST_TEST === "true" ||
    process.env.npm_lifecycle_event === "test:fast" ||
    process.argv.includes("--mode=fast") ||
    (process.argv.includes("--mode") && process.argv[process.argv.indexOf("--mode") + 1] === "fast");

  return {
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
      exclude: [
        "**/node_modules/**",
        "**/.next/**",
        "apps/desktop/server/**",
        "apps/desktop/dist/**",
        ...(isFast ? FAST_EXCLUDE : []),
      ],
    },
  };
});

