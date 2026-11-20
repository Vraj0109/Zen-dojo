import "server-only";
import { EXT_LIMITS, importFromExtension, saveLastImport, type ExtImportResult } from "./extension";

// Import a file made by the browser extension's "Export to file" (apps/extension/lib/export.js):
// { format: "zen-dojo-leetcode", version: 1, exportedAt, submissions: [...], topics: [...] }.
// The submissions are the same objects the paired extension posts, so they go through importFromExtension.

export const FILE_FORMAT = "zen-dojo-leetcode";
export const FILE_VERSION = 1;
/** Largest file the upload form accepts. next.config.ts raises the server-action body limit to fit it. */
export const FILE_MAX_BYTES = 20_000_000;

/** A problem with the file itself; the message is safe to show as is. */
export class LeetCodeFileError extends Error {}

export type LeetCodeFileResult = Pick<ExtImportResult, "stored" | "skipped" | "topics" | "added" | "resolved">;

/** Check the file's shape. Individual submissions are checked later, one by one, by importFromExtension. */
export function parseLeetCodeFile(text: string): { submissions: unknown[]; topics: unknown[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new LeetCodeFileError("That file is not valid JSON. Choose the file the extension saved (zen-dojo-leetcode-….json).");
  }
  const file = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  if (!file || file.format !== FILE_FORMAT) {
    throw new LeetCodeFileError("That is not a Zen Dojo LeetCode file. Use the extension's Export to file button and choose the file it saves.");
  }
  if (file.version !== FILE_VERSION) {
    throw new LeetCodeFileError(
      typeof file.version === "number" && file.version > FILE_VERSION
        ? "That file was made by a newer extension than this app understands. Update Zen Dojo and try again."
        : "That file has an unknown version number.",
    );
  }
  if (!Array.isArray(file.submissions) || (file.topics !== undefined && !Array.isArray(file.topics))) {
    throw new LeetCodeFileError("The file is damaged: it has no list of submissions.");
  }
  const topics = (file.topics as unknown[] | undefined) ?? [];
  if (file.submissions.length === 0 && topics.length === 0) throw new LeetCodeFileError("The file has no submissions in it.");
  return { submissions: file.submissions, topics };
}

/**
 * Import the file's text in chunks of EXT_LIMITS.batch submissions (the topics ride with the first chunk;
 * a very long topic list continues in the next ones) and add up the results.
 */
export async function importLeetCodeFile(text: string): Promise<LeetCodeFileResult> {
  const { submissions, topics } = parseLeetCodeFile(text);
  const chunks = Math.max(1, Math.ceil(submissions.length / EXT_LIMITS.batch), Math.ceil(topics.length / EXT_LIMITS.topics));
  const total: LeetCodeFileResult = { stored: 0, skipped: 0, topics: 0, added: 0, resolved: 0 };
  let last: ExtImportResult | null = null;
  for (let i = 0; i < chunks; i++) {
    const r = await importFromExtension(
      submissions.slice(i * EXT_LIMITS.batch, (i + 1) * EXT_LIMITS.batch),
      topics.slice(i * EXT_LIMITS.topics, (i + 1) * EXT_LIMITS.topics),
    );
    total.stored += r.stored;
    total.skipped += r.skipped;
    total.topics += r.topics;
    total.added += r.added;
    total.resolved += r.resolved;
    last = r;
  }
  // "Last import" in settings shows the whole file, not just its final chunk.
  if (last && total.stored > 0) await saveLastImport({ at: last.at, ...total });
  return total;
}
