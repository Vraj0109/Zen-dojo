import "server-only";
import { timingSafeEqual } from "node:crypto";
import { JUDGE_PROBLEMS, casesMissingOutput, validateItem, type ProblemSpec, type TestsItem } from "@habit/shared";
import { computeOutputs } from "@/lib/judge/run";
import { getPackProblemSpec } from "@/lib/packs";
import { resolveProblemSpec, upsertItem, type UpsertResult } from "@/lib/content";

// What the admin API and the content scripts share: checking the token, and filling in missing test outputs from the
// problem's C++ reference solution (the same way pack:build does).

/** null when the request is allowed; otherwise the response to send. No token configured: the route does not exist. */
export function adminDenied(request: Request, env: Record<string, string | undefined> = process.env): Response | null {
  const token = env.CONTENT_ADMIN_TOKEN;
  if (!token) return new Response("Not found", { status: 404 });
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "Wrong or missing token." }, { status: 401 });
  return null;
}

/** For a tests item: computes the "output" of every case that has none, using the problem's own C++ solution. */
export async function fillMissingOutputs(raw: unknown): Promise<{ ok: true; item: unknown } | { ok: false; errors: string[] }> {
  const check = validateItem(raw);
  if (!check.ok) return check;
  if (check.item.type !== "tests") return { ok: true, item: raw };
  const item = check.item as TestsItem;
  const missing = casesMissingOutput(item);
  if (missing.length === 0) return { ok: true, item };
  const spec: ProblemSpec | undefined = await resolveProblemSpec(item.problem, getPackProblemSpec);
  const cpp = spec?.solution.cpp ?? JUDGE_PROBLEMS[item.problem]?.solution.cpp;
  if (!spec || !cpp) return { ok: false, errors: [`Cannot compute outputs: "${item.problem}" has no problem or no C++ reference solution. Write the "output" of each case yourself.`] };
  const r = await computeOutputs(spec, "cpp", cpp, missing.map((i) => item.cases[i].input));
  if (r.status !== "done") return { ok: false, errors: [`Cannot compute outputs: ${r.message}`] };
  const cases = item.cases.map((c) => ({ ...c }));
  for (let k = 0; k < missing.length; k++) {
    const res = r.results[k];
    if (!res.ok) return { ok: false, errors: [`The reference solution failed on case ${missing[k] + 1}: ${res.error}`] };
    cases[missing[k]].output = res.value;
  }
  return { ok: true, item: { ...item, cases } };
}

/** Adds one or more items (outputs are computed first). One result per item, in order. */
export async function addItems(raw: unknown, source = "local"): Promise<UpsertResult[]> {
  const list = Array.isArray(raw) ? raw : [raw];
  const out: UpsertResult[] = [];
  for (const one of list) {
    const filled = await fillMissingOutputs(one);
    out.push(filled.ok ? await upsertItem(filled.item, source) : filled);
  }
  return out;
}
