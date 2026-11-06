import "server-only";
import type { Difficulty } from "@habit/shared";

// LeetCode's public GraphQL endpoint (the one leetcode.com itself uses). It is unofficial and
// may change, so all request/response handling lives in this file.
const ENDPOINT = "https://leetcode.com/graphql";
const TIMEOUT_MS = 15_000;

export class LeetCodeError extends Error {}

export interface AcceptedSubmission {
  id: string;
  slug: string;
  title: string;
  /** Unix seconds */
  timestamp: number;
}

export interface QuestionInfo {
  number: number | null;
  title: string;
  difficulty: Difficulty;
}

/** Usernames on LeetCode: letters, digits, "_", "-" and ".". */
export const USERNAME_RE = /^[A-Za-z0-9_.-]{1,40}$/;

async function gql(query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://leetcode.com", "User-Agent": "HabitManager" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new LeetCodeError(`Could not reach LeetCode (${e instanceof Error ? e.message : String(e)})`);
  }
  if (!res.ok) throw new LeetCodeError(`LeetCode returned HTTP ${res.status}`);
  let json: { data?: Record<string, unknown>; errors?: { message?: string }[] };
  try {
    json = await res.json();
  } catch {
    throw new LeetCodeError("LeetCode returned an unexpected response");
  }
  if (json.errors?.length) throw new LeetCodeError(json.errors[0].message ?? "LeetCode returned an error");
  if (!json.data) throw new LeetCodeError("LeetCode returned no data");
  return json.data;
}

export function parseRecentAccepted(data: Record<string, unknown>): AcceptedSubmission[] {
  const list = data.recentAcSubmissionList;
  if (!Array.isArray(list)) throw new LeetCodeError("Unexpected recent submissions format");
  return list.flatMap((s: Record<string, unknown>) => {
    const timestamp = Number(s.timestamp);
    if (typeof s.id !== "string" || typeof s.titleSlug !== "string" || !Number.isFinite(timestamp)) return [];
    return [{ id: s.id, slug: s.titleSlug, title: String(s.title ?? s.titleSlug), timestamp }];
  });
}

const DIFFICULTY: Record<string, Difficulty> = { Easy: "easy", Medium: "medium", Hard: "hard" };

export function parseQuestion(data: Record<string, unknown>): QuestionInfo | null {
  const q = data.question as Record<string, unknown> | null | undefined;
  if (!q) return null;
  const difficulty = DIFFICULTY[String(q.difficulty)];
  if (!difficulty || typeof q.title !== "string") throw new LeetCodeError("Unexpected question format");
  const number = Number(q.questionFrontendId);
  return { number: Number.isInteger(number) ? number : null, title: q.title, difficulty };
}

/** The user's most recent accepted submissions (LeetCode returns at most 20 publicly). */
export async function fetchRecentAccepted(username: string, limit = 20): Promise<AcceptedSubmission[]> {
  const data = await gql(
    "query recentAc($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }",
    { username, limit },
  );
  return parseRecentAccepted(data);
}

export async function fetchQuestion(slug: string): Promise<QuestionInfo | null> {
  const data = await gql(
    "query question($slug: String!) { question(titleSlug: $slug) { questionFrontendId title difficulty } }",
    { slug },
  );
  return parseQuestion(data);
}

export async function userExists(username: string): Promise<boolean> {
  try {
    const data = await gql("query user($username: String!) { matchedUser(username: $username) { username } }", { username });
    return Boolean(data.matchedUser);
  } catch (e) {
    // LeetCode answers an unknown user with a GraphQL error rather than null.
    if (e instanceof LeetCodeError && /does not exist/i.test(e.message)) return false;
    throw e;
  }
}
