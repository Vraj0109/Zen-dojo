// Vitest setup file, runs in every test file (plan 0114, round B).
// 1. `cacheTag` and `cacheLife` only work inside a Next.js build with cacheComponents; in tests they are no-ops, so code
//    that reads content through the cached repo functions runs as plain async code. A test that mocks next/cache itself
//    replaces this (and must then include cacheTag and cacheLife in its mock).
// 2. Content reads go to the content database the global setup filled once for this run, unless the test chose its own
//    CONTENT_DATABASE_URL (for example ":memory:").
import { vi } from "vitest";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  cacheTag: () => {},
  cacheLife: () => {},
}));

if (!process.env.CONTENT_DATABASE_URL && process.env.ZD_TEST_CONTENT_DB) {
  process.env.CONTENT_DATABASE_URL = process.env.ZD_TEST_CONTENT_DB;
}
