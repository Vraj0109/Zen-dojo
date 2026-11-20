// @ts-check
// "Export to file": the same history import as `backfill`, but the "app" is just a list in memory. When it's
// done, `buildExport` makes the JSON the Zen Dojo app's upload form reads (Profile → Settings → LeetCode file).
// Pure: no I/O, so it runs unchanged in the content script and in tests.

import { localDay } from "./time.js";

export const EXPORT_FORMAT = "zen-dojo-leetcode";
export const EXPORT_VERSION = 1;

/**
 * @typedef {import("./leetcode.js").Submission} Submission
 * @typedef {import("./sync.js").Topic} Topic
 * @typedef {{
 *   format: typeof EXPORT_FORMAT, version: typeof EXPORT_VERSION, exportedAt: string,
 *   submissions: Submission[], topics: Topic[],
 * }} ExportFile
 */

/**
 * Collects what `backfill` would send to the app. Plug `collector.app` into the sync deps and call it with
 * `all: true`: with no app to ask, the extension can't know which problems the roadmap lists, so it takes
 * everything you've solved. A submission seen twice is kept once; a problem's tags are replaced by the latest.
 */
export function createCollector() {
  /** @type {Map<string, Submission>} */
  const submissions = new Map();
  /** @type {Map<string, Topic>} */
  const topics = new Map();
  return {
    /** @type {import("./sync.js").Deps["app"]} */
    app: {
      state: async () => ({ known: [], slugs: [] }),
      send: async (subs, tags = []) => {
        let stored = 0;
        for (const s of subs) {
          if (!submissions.has(s.id)) stored++;
          submissions.set(s.id, s);
        }
        for (const t of tags) topics.set(t.slug, { slug: t.slug, tags: [...t.tags] });
        return { stored, added: 0, resolved: 0 };
      },
    },
    get count() {
      return submissions.size;
    },
    /** The file contents. Newest submissions first, so the file reads like your LeetCode history. @param {Date} [now] */
    build(now = new Date()) {
      /** @type {ExportFile} */
      const file = {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportedAt: now.toISOString(),
        submissions: [...submissions.values()].sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id)),
        topics: [...topics.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
      };
      return file;
    },
  };
}

/** zen-dojo-leetcode-YYYY-MM-DD.json, with the local date. @param {Date} [now] */
export const exportFileName = (now = new Date()) => `zen-dojo-leetcode-${localDay(now)}.json`;
