// @ts-check
// LeetCode GraphQL queries and response parsing. Pure functions (no browser APIs) so they can be
// unit-tested. These are the queries leetcode.com's own pages use; they are unofficial and may change.

export const ACCEPTED = 10; // LeetCode status code for "Accepted"

export const QUERIES = {
  userStatus: "query userStatus { userStatus { username isSignedIn } }",

  progress: `query userProgressQuestionList($filters: UserProgressQuestionListInput) {
  userProgressQuestionList(filters: $filters) {
    totalNum
    questions { frontendId title titleSlug difficulty lastSubmittedAt questionStatus topicTags { name } }
  }
}`,

  /** Fallback if LeetCode drops topicTags from the progress list. */
  progressMinimal: `query userProgressQuestionList($filters: UserProgressQuestionListInput) {
  userProgressQuestionList(filters: $filters) {
    totalNum
    questions { frontendId title titleSlug difficulty lastSubmittedAt questionStatus }
  }
}`,

  submissions: `query submissionList($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!, $status: Int) {
  questionSubmissionList(offset: $offset, limit: $limit, lastKey: $lastKey, questionSlug: $questionSlug, status: $status) {
    lastKey
    hasNext
    submissions { id titleSlug statusDisplay timestamp }
  }
}`,

  recent: `query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) { id titleSlug timestamp }
}`,

  detail: `query submissionDetails($submissionId: Int!) {
  submissionDetails(submissionId: $submissionId) {
    runtimeDisplay runtimePercentile memoryDisplay memoryPercentile code timestamp statusCode notes
    lang { name verboseName }
    question { questionFrontendId title titleSlug difficulty topicTags { name } }
  }
}`,

  /** Fallback if LeetCode drops some of the optional fields above. */
  detailMinimal: `query submissionDetails($submissionId: Int!) {
  submissionDetails(submissionId: $submissionId) {
    code timestamp statusCode
    lang { name verboseName }
    question { titleSlug }
  }
}`,
};

/**
 * @typedef {{ username: string | null, signedIn: boolean }} UserStatus
 * @typedef {{ slug: string, title: string, number: number | null, difficulty: string | null, lastSubmittedAt: number | null, solved: boolean, topics: string[] }} SolvedQuestion
 * @typedef {{ id: string, slug: string, accepted: boolean, timestamp: number }} SubmissionRef
 * @typedef {{
 *   id: string, slug: string, title?: string, number?: number | null, difficulty?: string | null,
 *   lang: string, runtime: string | null, runtimePct: number | null, memory: string | null, memoryPct: number | null,
 *   code: string, notes: string, timestamp: number, topics?: string[]
 * }} Submission
 */

export class ShapeError extends Error {}

/** @param {unknown} v */
const obj = (v) => (v && typeof v === "object" ? /** @type {Record<string, any>} */ (v) : null);
/** @param {unknown} v */
const numOrNull = (v) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
/** @param {unknown} v */
const strOrNull = (v) => (typeof v === "string" && v !== "" ? v : null);
/** Tag names from LeetCode's topicTags: [{ name }]. @param {unknown} v */
const tagNames = (v) =>
  Array.isArray(v) ? v.flatMap((t) => (t && typeof t.name === "string" && t.name ? [t.name] : [])) : [];

/** @param {any} data @returns {UserStatus} */
export function parseUserStatus(data) {
  const s = obj(data?.userStatus);
  if (!s) throw new ShapeError("Unexpected userStatus format");
  return { username: strOrNull(s.username), signedIn: s.isSignedIn === true };
}

/** @param {any} data @returns {{ total: number, questions: SolvedQuestion[] }} */
export function parseProgress(data) {
  const p = obj(data?.userProgressQuestionList);
  if (!p || !Array.isArray(p.questions)) throw new ShapeError("Unexpected progress list format");
  const questions = p.questions.flatMap((/** @type {any} */ q) => {
    if (!q || typeof q.titleSlug !== "string") return [];
    const last = typeof q.lastSubmittedAt === "string" ? Date.parse(q.lastSubmittedAt) : NaN;
    return [
      {
        slug: q.titleSlug,
        title: typeof q.title === "string" ? q.title : q.titleSlug,
        number: numOrNull(q.frontendId),
        difficulty: typeof q.difficulty === "string" ? q.difficulty.toLowerCase() : null,
        lastSubmittedAt: Number.isFinite(last) ? last : null,
        solved: String(q.questionStatus).toUpperCase() === "SOLVED",
        topics: tagNames(q.topicTags),
      },
    ];
  });
  return { total: numOrNull(p.totalNum) ?? questions.length, questions };
}

/** @param {any} data @returns {{ hasNext: boolean, lastKey: string | null, items: SubmissionRef[] }} */
export function parseSubmissionPage(data) {
  const l = obj(data?.questionSubmissionList);
  if (!l || !Array.isArray(l.submissions)) throw new ShapeError("Unexpected submission list format");
  const items = l.submissions.flatMap((/** @type {any} */ s) => {
    const id = s?.id == null ? "" : String(s.id);
    const timestamp = numOrNull(s?.timestamp);
    if (!/^\d+$/.test(id) || timestamp === null) return [];
    return [{ id, slug: String(s.titleSlug ?? ""), accepted: s.statusDisplay === "Accepted", timestamp }];
  });
  return { hasNext: l.hasNext === true, lastKey: strOrNull(l.lastKey), items };
}

/** @param {any} data @returns {SubmissionRef[]} */
export function parseRecent(data) {
  const list = data?.recentAcSubmissionList;
  if (!Array.isArray(list)) throw new ShapeError("Unexpected recent submissions format");
  return list.flatMap((s) => {
    const id = s?.id == null ? "" : String(s.id);
    const timestamp = numOrNull(s?.timestamp);
    if (!/^\d+$/.test(id) || timestamp === null || typeof s.titleSlug !== "string") return [];
    return [{ id, slug: s.titleSlug, accepted: true, timestamp }];
  });
}

/**
 * Submission details; null when it isn't an accepted submission with code (e.g. still judging,
 * wrong answer, or someone else's private submission).
 * @param {any} data @param {string} id @returns {Submission | null}
 */
export function parseDetail(data, id) {
  if (!data || !("submissionDetails" in data)) throw new ShapeError("Unexpected submission details format");
  const d = obj(data.submissionDetails);
  if (!d || numOrNull(d.statusCode) !== ACCEPTED || typeof d.code !== "string" || d.code === "") return null;
  const q = obj(d.question) ?? {};
  const timestamp = numOrNull(d.timestamp);
  if (typeof q.titleSlug !== "string" || timestamp === null) return null;
  const lang = obj(d.lang);
  return {
    id,
    slug: q.titleSlug,
    title: strOrNull(q.title) ?? undefined,
    number: numOrNull(q.questionFrontendId),
    difficulty: typeof q.difficulty === "string" ? q.difficulty.toLowerCase() : null,
    lang: strOrNull(lang?.verboseName) ?? strOrNull(lang?.name) ?? "Unknown",
    runtime: strOrNull(d.runtimeDisplay),
    runtimePct: numOrNull(d.runtimePercentile),
    memory: strOrNull(d.memoryDisplay),
    memoryPct: numOrNull(d.memoryPercentile),
    code: d.code,
    notes: typeof d.notes === "string" ? d.notes : "",
    timestamp,
    topics: tagNames(q.topicTags),
  };
}

/** Submission id from a leetcode.com path such as /problems/two-sum/submissions/1234567/. */
export function submissionIdFromPath(/** @type {string} */ pathname) {
  const m = /\/submissions\/(?:detail\/)?(\d+)\/?/.exec(pathname);
  return m ? m[1] : null;
}
