import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { PROBLEMS, type Difficulty } from "@habit/shared";
import { getDb } from "../db";
import { leetcodeProblems, leetcodeTopics, leetcodeUserSubmissions, settings } from "../schema";
import { recordAccepted } from "./sync";

// The browser extension (apps/extension) reads your own LeetCode submissions while you're logged in
// on leetcode.com and posts them here. Requests must carry the pairing key shown on the DSA page.

const KEY_TOKEN = "extension_token";
const KEY_LAST = "extension_last_import";

export const EXT_LIMITS = { batch: 200, topics: 5000, code: 100_000, notes: 20_000, bodyBytes: 5_000_000 };

export interface ExtSubmission {
  id: string;
  slug: string;
  title: string;
  number: number | null;
  difficulty: Difficulty | null;
  lang: string;
  runtime: string | null;
  runtimePct: number | null;
  memory: string | null;
  memoryPct: number | null;
  code: string;
  notes: string;
  /** Unix seconds */
  timestamp: number;
}

export interface ExtImportResult {
  at: string;
  stored: number;
  skipped: number;
  topics: number;
  added: number;
  resolved: number;
}

async function getSetting(key: string) {
  const db = await getDb();
  return (await db.query.settings.findFirst({ where: eq(settings.key, key) }))?.value;
}

async function putSetting(key: string, value: string) {
  const db = await getDb();
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** The pairing key the extension sends; created on first use. */
export async function getExtensionToken(): Promise<string> {
  const existing = await getSetting(KEY_TOKEN);
  if (existing) return existing;
  const token = randomBytes(24).toString("base64url");
  const db = await getDb();
  await db.insert(settings).values({ key: KEY_TOKEN, value: token }).onConflictDoNothing();
  return (await getSetting(KEY_TOKEN))!;
}

/** New key; the extension must be re-paired. */
export async function regenerateExtensionToken(): Promise<void> {
  await putSetting(KEY_TOKEN, randomBytes(24).toString("base64url"));
}

export async function getExtensionStatus() {
  const raw = await getSetting(KEY_LAST);
  return { token: await getExtensionToken(), last: raw ? (JSON.parse(raw) as ExtImportResult) : null };
}

/**
 * Returns an error response unless the request carries the pairing key. Requests from web pages
 * (an http/https Origin) are refused too: only the extension (chrome-extension:// origin) may call.
 */
export async function authorizeExtension(request: Request): Promise<Response | null> {
  const origin = request.headers.get("origin");
  if (origin && /^https?:/i.test(origin)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(await getExtensionToken());
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Wrong or missing pairing key. Copy it from the DSA page into the extension." }, { status: 401 });
  }
  return null;
}

const DIFFICULTIES: Record<string, Difficulty> = { easy: "easy", medium: "medium", hard: "hard" };
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Validate one submission from the extension; null if unusable. */
export function parseExtSubmission(raw: unknown): ExtSubmission | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? "");
  const slug = String(r.slug ?? "");
  const timestamp = num(r.timestamp);
  const code = str(r.code, EXT_LIMITS.code);
  if (!/^\d{1,20}$/.test(id) || !/^[a-z0-9-]{1,150}$/.test(slug) || !timestamp || timestamp <= 0 || !code) return null;
  const number = num(r.number);
  return {
    id,
    slug,
    title: str(r.title, 300) || slug,
    number: number !== null && Number.isInteger(number) ? number : null,
    difficulty: DIFFICULTIES[String(r.difficulty ?? "").toLowerCase()] ?? null,
    lang: str(r.lang, 40) || "Unknown",
    runtime: str(r.runtime, 40),
    runtimePct: num(r.runtimePct),
    memory: str(r.memory, 40),
    memoryPct: num(r.memoryPct),
    code,
    notes: str(r.notes, EXT_LIMITS.notes) ?? "",
    timestamp: Math.floor(timestamp),
  };
}

/** Validate topic tags for one problem; null if unusable. */
export function parseExtTopics(raw: unknown): { slug: string; tags: string[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const slug = String(r.slug ?? "");
  if (!/^[a-z0-9-]{1,150}$/.test(slug) || !Array.isArray(r.tags)) return null;
  const tags = [...new Set(r.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim().slice(0, 50)))].slice(0, 20);
  return { slug, tags };
}

const ROADMAP_SLUGS = new Set(Object.values(PROBLEMS).flatMap((p) => (p.slug ? [p.slug] : [])));

/** Store submissions (code, runtime, notes) and record the solves they represent. */
export async function importFromExtension(raw: unknown[], rawTopics: unknown[] = []): Promise<ExtImportResult> {
  const at = new Date().toISOString();
  const topics = rawTopics.slice(0, EXT_LIMITS.topics).map(parseExtTopics).filter((t) => t !== null);
  const subs = raw.slice(0, EXT_LIMITS.batch).map(parseExtSubmission).filter((s): s is ExtSubmission => s !== null);
  const db = await getDb();

  for (const s of subs) {
    // Remember title/difficulty of problems outside the roadmap so no extra LeetCode lookup is needed.
    if (!ROADMAP_SLUGS.has(s.slug) && s.difficulty) {
      const info = { number: s.number, title: s.title, difficulty: s.difficulty };
      await db.insert(leetcodeProblems).values({ slug: s.slug, ...info }).onConflictDoUpdate({ target: leetcodeProblems.slug, set: info });
    }
    const row = {
      slug: s.slug,
      lang: s.lang,
      runtime: s.runtime,
      runtimePct: s.runtimePct,
      memory: s.memory,
      memoryPct: s.memoryPct,
      code: s.code,
      notes: s.notes,
      submittedAt: s.timestamp,
      importedAt: at,
    };
    await db.insert(leetcodeUserSubmissions).values({ id: s.id, ...row }).onConflictDoUpdate({ target: leetcodeUserSubmissions.id, set: row });
  }

  for (const t of topics) {
    await db.insert(leetcodeTopics).values(t).onConflictDoUpdate({ target: leetcodeTopics.slug, set: { tags: t.tags } });
  }

  const { added, resolved } = await recordAccepted(
    subs.map((s) => ({ id: s.id, slug: s.slug, title: s.title, timestamp: s.timestamp })),
    at,
  );
  const result = { at, stored: subs.length, skipped: Math.min(raw.length, EXT_LIMITS.batch) - subs.length, topics: topics.length, added, resolved };
  if (subs.length > 0) await putSetting(KEY_LAST, JSON.stringify(result));
  return result;
}

/** Submission ids already stored, so the extension can skip fetching them again. */
export async function getKnownSubmissionIds(): Promise<string[]> {
  const db = await getDb();
  return (await db.select({ id: leetcodeUserSubmissions.id }).from(leetcodeUserSubmissions)).map((r) => r.id);
}



/** LeetCode slugs the app tracks: the roadmap list plus problems already synced outside it. */
export async function getSiteSlugs(): Promise<string[]> {
  const db = await getDb();
  const extras = (await db.select({ slug: leetcodeProblems.slug }).from(leetcodeProblems)).map((r) => r.slug);
  return [...new Set([...ROADMAP_SLUGS, ...extras])].sort();
}
