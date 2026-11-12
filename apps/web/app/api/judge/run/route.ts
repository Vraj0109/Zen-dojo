import { hostedNoRun } from "@/lib/hosted/no-run";
import { JUDGE_LANGS, JUDGE_LANG_LABEL, matchesTy, type JudgeLang, type ProblemSpec } from "@habit/shared";
import { JUDGE_LIMITS, runCode, runCustom } from "@/lib/judge/run";
import { revalidatePath } from "next/cache";
import { recordJudgePass } from "@/lib/dsa";
import { saveSolution } from "@/lib/notes";
import { resolveProblemSpec } from "@/lib/content";
import { getPackProblemSpec, setPackItemDone } from "@/lib/packs";
import { getRuns, saveRun } from "@/lib/solution-runs";

// Runs your code on a problem's tests (the Run button). This executes code on this computer, so it only accepts
// requests made by this app's own pages: same origin, and a JSON body (which a plain cross-site form cannot send).
export const maxDuration = 90;

/** True when the request comes from a page served by this same server. */
function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (!origin) return site === "same-origin"; // some browsers omit Origin on same-origin POSTs; Sec-Fetch-Site vouches then
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

async function specFor(id: unknown): Promise<ProblemSpec | undefined> {
  if (typeof id !== "string") return undefined;
  // stored content first (a seeded copy, extra test cases), then the built-in problems and the pack problems
  return resolveProblemSpec(id, getPackProblemSpec);
}

/** Your latest run of each language for a problem (for the editor and the Notes tab). */
export async function GET(request: Request) {
  const blocked = hostedNoRun();
  if (blocked) return blocked;
  if (!sameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  const spec = await specFor(id);
  if (!spec) return Response.json({ error: "Unknown problem." }, { status: 400 });
  return Response.json({ runs: await getRuns(id as string, spec) });
}

/** Checks one typed value per parameter. Returns the values, or a plain message for the first one that does not fit. */
function checkInput(spec: ProblemSpec, input: unknown): { ok: true; values: unknown[] } | { ok: false; message: string } {
  if (spec.design) {
    const [ops, args] = Array.isArray(input) ? input : [];
    if (!Array.isArray(input) || input.length !== 2 || !Array.isArray(ops) || !ops.every((x) => typeof x === "string") || !Array.isArray(args) || !args.every(Array.isArray) || ops.length !== args.length) {
      return { ok: false, message: "Write two lines: the operations, like [\"LRUCache\",\"put\",\"get\"], and one argument list per operation, like [[2],[1,1],[1]]." };
    }
    return { ok: true, values: input };
  }
  const params = spec.fn.params;
  if (!Array.isArray(input) || input.length !== params.length) return { ok: false, message: `The function takes ${params.length} value${params.length === 1 ? "" : "s"}, one per line.` };
  for (let k = 0; k < params.length; k++) {
    if (!matchesTy(input[k], params[k].type)) return { ok: false, message: `${params[k].name} must be ${/^[aeiou]/.test(params[k].type) ? "an" : "a"} ${params[k].type}.` };
  }
  return { ok: true, values: input };
}

export async function POST(request: Request) {
  const blocked = hostedNoRun();
  if (blocked) return blocked;
  if (!sameOrigin(request) || !(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const text = await request.text();
  if (text.length > JUDGE_LIMITS.code + 1000) return Response.json({ error: "The code is too long." }, { status: 413 });
  let body: { id?: unknown; lang?: unknown; code?: unknown; save?: unknown; input?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const isPack = typeof body.id === "string" && body.id.startsWith("pack:");
  const spec = await specFor(body.id);
  const lang = JUDGE_LANGS.find((l) => l === body.lang) as JudgeLang | undefined;
  if (!spec || !lang || typeof body.code !== "string") return Response.json({ error: "Unknown problem, language or code." }, { status: 400 });
  // Your own input: one run, no expected answer, nothing saved.
  if (body.input !== undefined) {
    const checked = checkInput(spec, body.input);
    if (!checked.ok) return Response.json({ error: checked.message }, { status: 400 });
    return Response.json(await runCustom(spec, lang, body.code, checked.values));
  }
  const result = await runCode(spec, lang, body.code);
  // Keep the code of every run (a compile error is a run too) so it comes back after a reload.
  if (result.status === "done") await saveRun(spec.id, lang, body.code, { status: "done", passed: result.passed, total: result.total, failedIds: result.results.filter((c) => !c.pass).map((c) => c.index) });
  else if (result.status === "compile_error") await saveRun(spec.id, lang, body.code, { status: "compile_error", passed: 0, total: 0 });
  // Imported (pack) problems: passing every test marks the problem done in its course.
  if (isPack && result.status === "done" && result.total > 0 && result.passed === result.total) {
    const [, packId, itemId] = spec.id.split(":");
    await setPackItemDone(packId, itemId, true);
    return Response.json(result);
  }
  // Every test passed: that is what counts as solving a roadmap problem here (the LeetCode sync is a second way in).
  const allPassed = result.status === "done" && result.total > 0 && result.passed === result.total;
  let solved = false;
  if (allPassed && !isPack && (await recordJudgePass(spec.id))) {
    solved = true;
    revalidatePath("/", "layout");
  }
  // When every test passes, keep the solution with the problem (only the code; your notes are not touched).
  if (body.save === true && result.status === "done" && result.total > 0 && result.passed === result.total) {
    await saveSolution(spec.id, body.code, JUDGE_LANG_LABEL[lang]);
    return Response.json({ ...result, saved: true, ...(solved ? { solved: true } : {}) });
  }
  return Response.json(solved ? { ...result, solved: true } : result);
}
