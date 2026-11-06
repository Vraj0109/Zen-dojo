// @ts-check
// What the extension does on leetcode.com: backfill your whole history, catch up on recent
// submissions, and capture a submission as soon as you get Accepted. I/O is passed in (`deps`), so
// this runs unchanged in the content script and in tests.

import {
  ACCEPTED,
  QUERIES,
  parseDetail,
  parseProgress,
  parseRecent,
  parseSubmissionPage,
  parseUserStatus,
} from "./leetcode.js";

/**
 * @typedef {import("./leetcode.js").Submission} Submission
 * @typedef {{ stored: number, added: number, resolved: number }} SendResult
 * @typedef {{ slug: string, tags: string[] }} Topic
 * @typedef {{
 *   gql: (query: string, variables?: Record<string, unknown>) => Promise<any>,
 *   app: { state: () => Promise<{ known: string[], slugs: string[] }>, send: (subs: Submission[], topics?: Topic[]) => Promise<SendResult> },
 *   sleep: (ms: number) => Promise<void>,
 *   delayMs?: number,
 *   concurrency?: number,
 *   onProgress?: (p: { phase: string, done: number, total: number, stored: number }) => void,
 *   state?: { minimalDetail?: boolean, minimalProgress?: boolean },
 * }} Deps
 */

const PAGE = 20;
const PROGRESS_PAGE = 100;

/** Errors worth waiting out: rate limiting and server hiccups. */
const retryable = (/** @type {any} */ e) => e?.status === 429 || (e?.status >= 500 && e?.status < 600);

/** Call LeetCode, backing off on 429/5xx (30 s, 60 s, 90 s). @param {Deps} deps */
async function call(deps, /** @type {string} */ query, /** @type {Record<string, unknown>} */ variables = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await deps.gql(query, variables);
    } catch (e) {
      if (!retryable(e) || attempt > 3) throw e;
      await deps.sleep(30_000 * attempt);
    }
  }
}

/** Polite pause between LeetCode requests. @param {Deps} deps */
const pause = (deps) => deps.sleep(deps.delayMs ?? 250);

/**
 * Run `fn` over `items` with at most `limit` in flight (default 3: fast, but gentle enough for LeetCode).
 * @template T
 * @param {T[]} items @param {number} limit @param {(item: T) => Promise<void>} fn
 */
export async function pool(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/** Accepted submission with code, or null. Falls back to a smaller query if LeetCode rejects fields. */
export async function fetchDetail(/** @type {Deps} */ deps, /** @type {string} */ id) {
  const state = (deps.state ??= {});
  const variables = { submissionId: Number(id) };
  if (!state.minimalDetail) {
    try {
      return parseDetail(await call(deps, QUERIES.detail, variables), id);
    } catch (e) {
      if (!/Cannot query field|Unknown argument/i.test(String(/** @type {any} */ (e)?.message))) throw e;
      state.minimalDetail = true;
    }
  }
  return parseDetail(await call(deps, QUERIES.detailMinimal, variables), id);
}

/** @param {Deps} deps */
export async function requireSignedIn(deps) {
  const status = parseUserStatus(await call(deps, QUERIES.userStatus));
  if (!status.signedIn || !status.username) throw new Error("Sign in to leetcode.com in this browser first.");
  return status.username;
}

/** One page of your progress list; drops topic tags if LeetCode rejects them. @param {Deps} deps @param {number} skip */
async function progressPage(deps, skip) {
  const state = (deps.state ??= {});
  const variables = { filters: { skip, limit: PROGRESS_PAGE } };
  if (!state.minimalProgress) {
    try {
      return await call(deps, QUERIES.progress, variables);
    } catch (e) {
      if (!/Cannot query field/i.test(String(/** @type {any} */ (e)?.message))) throw e;
      state.minimalProgress = true;
    }
  }
  return call(deps, QUERIES.progressMinimal, variables);
}

/** Topic tags of submissions, one entry per problem. @param {Submission[]} subs @returns {Topic[]} */
export const topicsOf = (subs) =>
  [...new Map(subs.filter((s) => s.topics?.length).map((s) => [s.slug, { slug: s.slug, tags: s.topics ?? [] }])).values()];

/** Every question you've solved, from your progress list. @param {Deps} deps */
export async function listSolved(deps) {
  /** @type {import("./leetcode.js").SolvedQuestion[]} */
  const solved = [];
  for (let skip = 0; ; skip += PROGRESS_PAGE) {
    const page = parseProgress(await progressPage(deps, skip));
    solved.push(...page.questions.filter((q) => q.solved));
    if (page.questions.length === 0 || skip + PROGRESS_PAGE >= page.total) return solved;
    await pause(deps);
  }
}

/** Ids of your accepted submissions for one question. @param {Deps} deps @param {string} slug */
export async function listAccepted(deps, slug) {
  /** @type {string[]} */
  const ids = [];
  let lastKey = null;
  for (let offset = 0; ; offset += PAGE) {
    const page = parseSubmissionPage(
      await call(deps, QUERIES.submissions, { offset, limit: PAGE, lastKey, questionSlug: slug, status: ACCEPTED }),
    );
    ids.push(...page.items.filter((s) => s.accepted).map((s) => s.id));
    if (!page.hasNext || page.items.length === 0) return ids;
    lastKey = page.lastKey;
    await pause(deps);
  }
}

/**
 * Import your history: every accepted submission (with code) of the solved problems this app tracks
 * (roadmap + other synced problems), or of every solved problem with `all`. Submissions the app already
 * has are skipped, so it is safe to stop and run again.
 * @param {Deps} deps
 * @param {{ since?: number, all?: boolean }} [opts] since: only problems submitted to since this time (ms)
 */
export async function backfill(deps, { since = 0, all = false } = {}) {
  await requireSignedIn(deps);
  const state = await deps.app.state();
  const known = new Set(state.known);
  const siteSlugs = new Set(state.slugs);
  deps.onProgress?.({ phase: "Listing solved problems", done: 0, total: 0, stored: 0 });
  const solved = (await listSolved(deps)).filter((q) => all || siteSlugs.has(q.slug));

  // Topic tags came with the solved list: save them for every problem (no extra LeetCode requests).
  const topics = solved.filter((q) => q.topics.length > 0).map((q) => ({ slug: q.slug, tags: q.topics }));
  for (let i = 0; i < topics.length; i += 1000) await deps.app.send([], topics.slice(i, i + 1000));

  const questions = solved.filter((q) => !since || q.lastSubmittedAt === null || q.lastSubmittedAt >= since);

  const totals = { questions: questions.length, stored: 0, added: 0, resolved: 0 };
  let done = 0;
  deps.onProgress?.({ phase: "Importing", done, total: questions.length, stored: 0 });
  await pool(questions, deps.concurrency ?? 3, async (q) => {
    await pause(deps);
    const ids = (await listAccepted(deps, q.slug)).filter((id) => !known.has(id));
    /** @type {Submission[]} */
    const subs = [];
    for (const id of ids) {
      await pause(deps);
      const d = await fetchDetail(deps, id);
      if (d) subs.push({ ...d, title: d.title ?? q.title, number: d.number ?? q.number, difficulty: d.difficulty ?? q.difficulty });
    }
    if (subs.length > 0) {
      const r = await deps.app.send(subs);
      totals.stored += r.stored;
      totals.added += r.added;
      totals.resolved += r.resolved;
      subs.forEach((s) => known.add(s.id));
    }
    deps.onProgress?.({ phase: "Importing", done: ++done, total: questions.length, stored: totals.stored });
  });
  return totals;
}

/** Catch up on your 20 most recent accepted submissions. @param {Deps} deps */
export async function syncRecent(deps) {
  const username = await requireSignedIn(deps);
  const known = new Set((await deps.app.state()).known);
  const recent = parseRecent(await call(deps, QUERIES.recent, { username, limit: 20 })).filter((s) => !known.has(s.id));
  /** @type {Submission[]} */
  const subs = [];
  for (const s of recent) {
    await pause(deps);
    const d = await fetchDetail(deps, s.id);
    if (d) subs.push(d);
  }
  return subs.length > 0 ? deps.app.send(subs, topicsOf(subs)) : { stored: 0, added: 0, resolved: 0 };
}

/**
 * Capture one submission you just made (its result page is open). Retries while it's still judging.
 * Returns null if it wasn't accepted.
 * @param {Deps} deps @param {string} id
 */
export async function captureSubmission(deps, id, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const d = await fetchDetail(deps, id);
    if (d) return deps.app.send([d], topicsOf([d]));
    if (attempt < retries) await deps.sleep(4000);
  }
  return null;
}
